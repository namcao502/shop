import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAdminAuth } from "@/lib/verify-admin";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(5000).default(""),
  price: z.number().int().min(1, "Price must be at least 1"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
  isPublished: z.boolean().default(false),
  images: z.array(z.string().url()).max(10).default([]),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product data" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await adminDb
    .collection("products")
    .where("slug", "==", parsed.data.slug)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const ref = adminDb.collection("products").doc();
  await ref.set(parsed.data);

  return NextResponse.json({ id: ref.id, ...parsed.data }, { status: 201 });
}
