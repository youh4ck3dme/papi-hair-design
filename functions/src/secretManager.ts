import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let client: InstanceType<typeof SecretManagerServiceClient> | null = null;

function getClient(): InstanceType<typeof SecretManagerServiceClient> {
  // Lazy init keeps Firebase function discovery fast during deploy.
  client ??= new SecretManagerServiceClient();
  return client;
}

function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.PROJECT_ID ||
    ""
  );
}

export async function upsertSecret(
  secretId: string,
  payload: string
): Promise<string> {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("GCLOUD_PROJECT not configured");
  }

  const parent = `projects/${projectId}`;
  const name = `${parent}/secrets/${secretId}`;

  try {
    await getClient().createSecret({
      parent,
      secretId,
      secret: { replication: { automatic: {} } },
    });
  } catch (err: any) {
    // Already exists -> continue
    if (err.code !== 6 /* ALREADY_EXISTS */) {
      throw err;
    }
  }

  await getClient().addSecretVersion({
    parent: name,
    payload: { data: Buffer.from(payload, "utf8") },
  });

  return name;
}

export async function readSecret(secretName: string): Promise<string> {
  const [version] = await getClient().accessSecretVersion({
    name: `${secretName}/versions/latest`,
  });
  const data = version.payload?.data;
  if (!data) {
    throw new Error(`Secret has no payload: ${secretName}`);
  }
  return Buffer.from(data).toString("utf8");
}
