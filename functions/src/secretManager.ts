import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

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
    await client.createSecret({
      parent,
      secretId,
      secret: { replication: { automatic: {} } },
    });
  } catch (err: any) {
    // Already exists
    if (err.code !== 6 /* ALREADY_EXISTS */) {
      throw err;
    }
  }

  await client.addSecretVersion({
    parent: name,
    payload: { data: Buffer.from(payload, "utf8") },
  });

  return name;
}
