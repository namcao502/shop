// src/lib/verify-admin.ts
import { adminAuth } from "./firebase/admin";

interface VerifyResult {
  uid: string;
  isAdmin: boolean;
}

export async function verifyAuth(
  authHeader: string | null,
): Promise<VerifyResult | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const isAdmin = decoded.isAdmin === true;
    return { uid: decoded.uid, isAdmin };
  } catch {
    return null;
  }
}

export async function verifyAdminAuth(
  authHeader: string | null
): Promise<string | null> {
  const result = await verifyAuth(authHeader);
  if (!result || !result.isAdmin) return null;
  return result.uid;
}
