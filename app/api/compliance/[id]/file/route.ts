import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/r2";

// Stream file content directly so it can be embedded inline (<img>, <iframe>)
// without a cross-origin redirect that browsers block in embedded contexts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const file = await prisma.documentFile.findUnique({
    where: { complianceDocumentId: id },
  });

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  const url = await getPresignedUrl(file.storageKey);
  const r2Res = await fetch(url);

  if (!r2Res.ok) {
    return new Response("File unavailable", { status: 502 });
  }

  return new Response(r2Res.body, {
    headers: {
      "Content-Type":        file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName}"`,
      "Cache-Control":       "private, max-age=300",
    },
  });
}
