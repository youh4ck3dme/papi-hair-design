const dns = require("node:dns/promises");
const net = require("node:net");
const tls = require("node:tls");
const nodemailer = require("nodemailer");

const DNS_FALLBACK_SERVERS = ["1.1.1.1", "8.8.8.8"];

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? next : "true");
    parsed[key] = value;

    if (inlineValue === undefined && next && !next.startsWith("--")) {
      index += 1;
    }
  }

  return parsed;
}

function toBool(value) {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function logResult(label, ok, details) {
  const status = ok ? "OK" : "FAIL";
  const suffix = details ? `: ${details}` : "";
  console.log(`[${status}] ${label}${suffix}`);
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

async function resolveDnsRecords(domain) {
  const output = {
    mx: [],
    txt: [],
    dmarc: [],
  };

  try {
    output.mx = await resolveWithFallback((resolver) => resolver.resolveMx(domain));
  } catch (error) {
    output.mxError = formatError(error);
  }

  try {
    output.txt = await resolveWithFallback((resolver) => resolver.resolveTxt(domain));
  } catch (error) {
    output.txtError = formatError(error);
  }

  try {
    output.dmarc = await resolveWithFallback((resolver) => resolver.resolveTxt(`_dmarc.${domain}`));
  } catch (error) {
    output.dmarcError = formatError(error);
  }

  return output;
}

async function resolveWithFallback(runQuery) {
  try {
    return await runQuery(dns);
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : null;
    if (code !== "ECONNREFUSED" && code !== "ETIMEOUT" && code !== "ESERVFAIL") {
      throw error;
    }

    const resolver = new dns.Resolver();
    resolver.setServers(DNS_FALLBACK_SERVERS);
    return runQuery(resolver);
  }
}

async function testTcpConnection(host, port, timeoutMs) {
  return withTimeout(new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      const address = socket.remoteAddress
        ? `${socket.remoteAddress}:${socket.remotePort}`
        : "connected";
      socket.end();
      resolve(address);
    });

    socket.once("error", (error) => {
      reject(error);
    });
  }), timeoutMs, "TCP connection");
}

function getCertificateName(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return value ? JSON.stringify(value) : null;
}

async function testTlsHandshake(host, port, timeoutMs, servername, allowInvalidCert) {
  return withTimeout(new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: servername || host,
      rejectUnauthorized: !allowInvalidCert,
    });

    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate();
      const summary = {
        authorized: socket.authorized,
        authorizationError: socket.authorizationError || null,
        protocol: socket.getProtocol(),
        subject: getCertificateName(peer?.subject?.CN ?? peer?.subject),
        issuer: getCertificateName(peer?.issuer?.CN ?? peer?.issuer),
        valid_to: peer ? peer.valid_to : null,
      };
      socket.end();
      resolve(summary);
    });

    socket.once("error", (error) => {
      reject(error);
    });
  }), timeoutMs, "TLS handshake");
}

async function diagnoseSmtp(config) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: config.user && config.pass
      ? {
          user: config.user,
          pass: config.pass,
        }
      : undefined,
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
    tls: {
      servername: config.servername || config.host,
      rejectUnauthorized: !config.allowInvalidCert,
    },
  });

  const steps = [];

  try {
    await transporter.verify();
    steps.push({
      label: "SMTP verify/auth",
      ok: true,
      details: "server accepted credentials",
    });
  } catch (error) {
    steps.push({
      label: "SMTP verify/auth",
      ok: false,
      details: formatError(error),
    });
    return steps;
  }

  if (!config.sendTest) {
    return steps;
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: config.recipient,
      subject: config.subject,
      text: config.text,
    });
    steps.push({
      label: "SMTP send test",
      ok: true,
      details: `accepted=${(info.accepted || []).join(", ") || "-"} response=${info.response || "-"}`,
    });
  } catch (error) {
    steps.push({
      label: "SMTP send test",
      ok: false,
      details: formatError(error),
    });
  }

  return steps;
}

function parsePorts(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function buildTargetConfigs(args, env) {
  const ports = parsePorts(args.ports || env.SMTP_PORTS);
  if (ports.length > 0) {
    return ports.map((port) => ({
      port,
      secure: port === 465,
    }));
  }

  const port = Number(args.port || env.SMTP_PORT || "465");
  const secure = args.secure ? toBool(args.secure) : port === 465;
  return [{ port, secure }];
}

function buildRuntimeConfig(args, env) {
  const domain = args.domain || env.SMTP_DOMAIN || "papihairdesign.sk";
  const user = args.user || env.SMTP_USER || "";

  return {
    host: args.host || env.SMTP_HOST || "smtp.m1.websupport.sk",
    domain,
    user,
    pass: args.pass || env.SMTP_PASS || "",
    from: args.from || env.SMTP_FROM || user || `noreply@${domain}`,
    recipient: args.recipient || env.SMTP_TEST_RECIPIENT || "",
    timeoutMs: Number(args.timeout || env.SMTP_TIMEOUT_MS || "10000"),
    sendTest: toBool(args["send-test"] || env.SMTP_SEND_TEST || "false"),
    allowInvalidCert: toBool(args["allow-invalid-cert"] || env.SMTP_ALLOW_INVALID_CERT || "false"),
    targets: buildTargetConfigs(args, env),
  };
}

function printConfig(config) {
  console.log("SMTP diagnosis config:");
  console.log(
    JSON.stringify(
      {
        host: config.host,
        domain: config.domain,
        user: config.user,
        from: config.from,
        recipient: config.recipient || null,
        sendTest: config.sendTest,
        allowInvalidCert: config.allowInvalidCert,
        timeoutMs: config.timeoutMs,
        targets: config.targets,
      },
      null,
      2,
    ),
  );
}

function logDnsResults(dnsRecords) {
  const flattenedTxt = dnsRecords.txt.flat().join(" | ");
  const flattenedDmarc = dnsRecords.dmarc.flat().join(" | ");

  if (dnsRecords.mx.length > 0) {
    logResult("MX", true, dnsRecords.mx.map((entry) => `${entry.exchange} (pref ${entry.priority})`).join(", "));
  } else {
    logResult("MX", false, dnsRecords.mxError || "no MX records found");
  }

  if (flattenedTxt) {
    logResult("TXT", true, flattenedTxt);
  } else {
    logResult("TXT", false, dnsRecords.txtError || "no TXT records found");
  }

  if (flattenedDmarc) {
    logResult("DMARC", true, flattenedDmarc);
  } else {
    logResult("DMARC", false, dnsRecords.dmarcError || "no DMARC record found");
  }
}

function validateRuntimeConfig(config) {
  if (!config.user || !config.pass) {
    return {
      label: "SMTP verify/auth",
      details: "missing SMTP_USER or SMTP_PASS",
    };
  }

  if (config.sendTest && !config.recipient) {
    return {
      label: "SMTP send test",
      details: "missing --recipient or SMTP_TEST_RECIPIENT",
    };
  }

  return null;
}

async function runTargetDiagnosis(target, config) {
  let hasFailures = false;

  logSection(`Target ${target.port}/${target.secure ? "implicit TLS" : "STARTTLS"}`);

  try {
    const tcpResult = await testTcpConnection(config.host, target.port, config.timeoutMs);
    logResult("TCP connection", true, tcpResult);
  } catch (error) {
    logResult("TCP connection", false, formatError(error));
    return true;
  }

  if (target.secure) {
    try {
      const tlsResult = await testTlsHandshake(
        config.host,
        target.port,
        config.timeoutMs,
        config.host,
        config.allowInvalidCert,
      );
      logResult(
        "TLS handshake",
        true,
        `protocol=${tlsResult.protocol || "-"} cert=${tlsResult.subject || "-"} issuer=${tlsResult.issuer || "-"}`,
      );
    } catch (error) {
      hasFailures = true;
      logResult("TLS handshake", false, formatError(error));
    }
  } else {
    logResult("TLS handshake", true, "skipped on plain submission port; STARTTLS is validated during SMTP verify");
  }

  const smtpSteps = await diagnoseSmtp({
    host: config.host,
    port: target.port,
    secure: target.secure,
    user: config.user,
    pass: config.pass,
    from: config.from,
    recipient: config.recipient,
    sendTest: config.sendTest,
    timeoutMs: config.timeoutMs,
    subject: "SMTP diagnostic test",
    text: "SMTP diagnostic test from PAPI HAIR DESIGN.",
  });

  for (const step of smtpSteps) {
    logResult(step.label, step.ok, step.details);
    if (!step.ok) {
      hasFailures = true;
    }
  }

  return hasFailures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildRuntimeConfig(args, process.env);

  printConfig(config);

  logSection("DNS");
  const dnsRecords = await resolveDnsRecords(config.domain);
  logDnsResults(dnsRecords);

  const validationError = validateRuntimeConfig(config);
  if (validationError) {
    logResult(validationError.label, false, validationError.details);
    process.exitCode = 1;
    return;
  }

  let hasFailures = false;

  for (const target of config.targets) {
    const targetFailed = await runTargetDiagnosis(target, config);
    hasFailures = hasFailures || targetFailed;
  }

  if (hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});
