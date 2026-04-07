import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/verify-admin";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, orderCode } = await request.json();

  if (!amount || !orderCode) {
    return NextResponse.json(
      { error: "Missing amount or orderCode" },
      { status: 400 }
    );
  }

  const bankId = process.env.VIETQR_BANK_ID;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const accountName = process.env.VIETQR_ACCOUNT_NAME;

  // vietqr.io image API: generates a QR code image URL
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

  return NextResponse.json({ qrUrl, orderCode, amount });
}
