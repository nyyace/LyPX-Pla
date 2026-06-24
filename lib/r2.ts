import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

// Returns a pre-signed URL valid for 1 hour — use for serving sensitive documents
export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

// Canonical key format: documents/<driverId>/<docType>/<uuid>.<ext>
export function makeR2Key(driverId: string, docType: string, filename: string): string {
  const ext = filename.split(".").pop() ?? "bin";
  const uuid = crypto.randomUUID();
  return `documents/${driverId}/${docType}/${uuid}.${ext}`;
}

// Returns a public URL if R2_PUBLIC_URL is configured, otherwise null.
export function getPublicUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}
