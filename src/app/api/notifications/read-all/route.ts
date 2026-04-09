import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import type { DocumentReference } from "firebase-admin/firestore";

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admins mark their personal feed AND the shared "admin" feed as read
  const userIds = authResult.isAdmin
    ? [authResult.uid, "admin"]
    : [authResult.uid];

  const allRefs: DocumentReference[] = [];

  for (const userId of userIds) {
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    for (const docSnap of snap.docs) {
      allRefs.push(docSnap.ref);
    }
  }

  const BATCH_LIMIT = 500;
  for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
    const chunk = allRefs.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const ref of chunk) {
      batch.update(ref, { read: true });
    }
    await batch.commit();
  }

  const updated = allRefs.length;

  return NextResponse.json({ updated });
}
