import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { verificationId, code } = body;

  if (!verificationId || !code) {
    return NextResponse.json({ error: "verificationId and code required" }, { status: 400 });
  }

  const record = await prisma.phoneVerification.findUnique({
    where: { id: verificationId },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid verification" }, { status: 400 });
  }
  if (record.verifiedAt) {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }
  if (new Date() > record.expiresAt) {
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }
  if (record.code !== code.trim()) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  await prisma.phoneVerification.update({
    where: { id: verificationId },
    data: { verifiedAt: new Date() },
  });

  return NextResponse.json({ verified: true, phone: record.phone });
}
