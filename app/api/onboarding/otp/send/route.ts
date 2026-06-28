import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const body = await req.json();
  const { phone } = body;

  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: "Valid E.164 phone number required" }, { status: 400 });
  }

  // Rate limit: max 3 OTP requests per phone per 10 minutes
  const recentCount = await prisma.phoneVerification.count({
    where: {
      phone,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recentCount >= 3) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait 10 minutes." },
      { status: 429 }
    );
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const verification = await prisma.phoneVerification.create({
    data: { phone, code, expiresAt },
  });

  let whatsappSent = false;
  try {
    await sendWhatsAppTemplate({
      to: phone,
      templateKey: "driver_otp",
      components: [{
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "payload", payload: code }],
      }],
      actorId: "system",
    });
    whatsappSent = true;
  } catch {
    // WhatsApp send failed — OTP still valid, returned in response for fallback display
  }

  return NextResponse.json({
    verificationId: verification.id,
    whatsappSent,
    ...(!whatsappSent && { testCode: code }),
  });
}
