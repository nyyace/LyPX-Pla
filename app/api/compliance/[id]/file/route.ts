import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const file = await prisma.documentFile.findUnique({
    where: { complianceDocumentId: id },
  });

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
