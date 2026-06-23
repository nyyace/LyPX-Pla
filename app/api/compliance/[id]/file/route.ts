import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/r2";
import { redirect } from "next/navigation";

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
  redirect(url);
}
