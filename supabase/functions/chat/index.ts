interface DenoNamespace {
  env: {
    get(key: string): string | undefined;
  };
}
declare const Deno: DenoNamespace;

// @ts-expect-error: Deno specific import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ENTERPRISE_PROMPT = `You are H4CK3D Enterprise, an elite Cyber Security Architect and Senior Lead Full-Stack Engineer. Your expertise spans Red Teaming, Cloud Infrastructure, and advanced coding (React, Deno, Node.js, Python, WP REST API).
SPECIALIZATION: You provide source code that is production-ready, highly optimized, and follows the latest security best practices.
TONE: Technical, concise, authoritative.
Language: Respond in Slovak (Slovenčina), but keep all technical terms, code snippets, and CLI commands in English.
OUTPUT FORMAT: Always use structured Markdown. Use code blocks with language identifiers for syntax highlighting.`;

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type ChatMessage = {
  role: string;
  content: string;
};

type OpenAIMcpTool = {
  type: "mcp";
  server_label: string;
  server_url: string;
  require_approval?: string;
  allowed_tools?: string[];
  headers?: Record<string, string>;
};

function normalizeModel(rawModel: unknown): string {
  if (typeof rawModel !== "string" || rawModel.trim().length === 0) {
    return DEFAULT_OPENAI_MODEL;
  }

  const trimmed = rawModel.trim();
  const providerAgnostic = trimmed.includes("/") ? (trimmed.split("/").pop() ?? trimmed) : trimmed;
  const lower = providerAgnostic.toLowerCase();

  if (lower.startsWith("gemini") || lower.startsWith("google")) {
    return DEFAULT_OPENAI_MODEL;
  }

  return providerAgnostic;
}

function parseCsvEnv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

function parseHeadersEnv(value: string | undefined): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }

    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof val === "string") {
        normalized[key] = val;
      }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function buildMcpToolsFromEnv(): OpenAIMcpTool[] {
  const serverUrl = Deno.env.get("OPENAI_MCP_SERVER_URL");
  if (!serverUrl) return [];

  const serverLabel = Deno.env.get("OPENAI_MCP_SERVER_LABEL")?.trim() || "vps_tools";
  const requireApproval = Deno.env.get("OPENAI_MCP_REQUIRE_APPROVAL")?.trim() || "never";
  const allowedTools = parseCsvEnv(Deno.env.get("OPENAI_MCP_ALLOWED_TOOLS"));
  const headers = parseHeadersEnv(Deno.env.get("OPENAI_MCP_HEADERS_JSON"));

  const tool: OpenAIMcpTool = {
    type: "mcp",
    server_label: serverLabel,
    server_url: serverUrl,
    require_approval: requireApproval,
  };

  if (allowedTools) tool.allowed_tools = allowedTools;
  if (headers) tool.headers = headers;

  return [tool];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, prompt, systemOverride, model } = body;

    let conversationMessages: ChatMessage[];

    if (messages && Array.isArray(messages)) {
      conversationMessages = messages
        .filter((m: unknown): m is ChatMessage => {
          if (!m || typeof m !== "object") return false;
          const message = m as Record<string, unknown>;
          return typeof message.role === "string" && typeof message.content === "string" && message.content.trim().length > 0;
        })
        .map((m) => ({
        role: m.role === "model" ? "assistant" : m.role,
        content: m.content,
        }));
    } else if (prompt && typeof prompt === "string") {
      conversationMessages = [{ role: "user", content: prompt }];
    } else {
      return new Response(JSON.stringify({ error: "Missing prompt or messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = systemOverride
      ? ENTERPRISE_PROMPT + "\n" + systemOverride
      : ENTERPRISE_PROMPT;

    const selectedModel = normalizeModel(model);
    const mcpTools = buildMcpToolsFromEnv();

    const input = [
      {
        role: "developer",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      ...conversationMessages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: [{ type: "input_text", text: message.content }],
      })),
    ];

    const payload: Record<string, unknown> = {
      model: selectedModel,
      stream: true,
      input,
    };

    if (mcpTools.length > 0) {
      payload.tools = mcpTools;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Skúste to neskôr." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nedostatok kreditov." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "OpenAI API key is invalid or unauthorized for this project/model." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "OpenAI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
