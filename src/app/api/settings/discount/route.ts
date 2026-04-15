import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAdminAuth } from "@/lib/verify-admin";
import { z } from "zod";

const settingsRef = () => adminDb.collection("settings").doc("discount");

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const snap = await settingsRef().get();
  if (!snap.exists) {
    return NextResponse.json({ active: false, value: 0 });
  }
  return NextResponse.json(snap.data());
}

const patchSchema = z
  .object({
    active: z.boolean(),
    value: z.number().int().min(0).max(99),
  })
  .refine((data) => !data.active || data.value >= 1, {
    message: "Value must be between 1 and 99 when active",
  });

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await request.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  await settingsRef().set(parsed.data);
  return NextResponse.json(parsed.data);
}
