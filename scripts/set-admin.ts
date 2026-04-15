// scripts/set-admin.ts
// Grant or revoke admin custom claim on a Firebase Auth user.
//
// Usage:
//   npx tsx scripts/set-admin.ts <email-or-uid>          # grant
//   npx tsx scripts/set-admin.ts <email-or-uid> --revoke # revoke
//
// Requires .env.local with Firebase Admin credentials.

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth(app);

async function main() {
  const [target, flag] = process.argv.slice(2);
  if (!target) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email-or-uid> [--revoke]");
    process.exit(1);
  }

  const revoke = flag === "--revoke";

  // Resolve UID — accept either email or raw UID
  let uid: string;
  if (target.includes("@")) {
    const user = await auth.getUserByEmail(target);
    uid = user.uid;
  } else {
    uid = target;
  }

  await auth.setCustomUserClaims(uid, { isAdmin: revoke ? null : true });
  console.log(`${revoke ? "Revoked" : "Granted"} admin claim for uid=${uid}`);
  console.log("The user must sign out and back in (or wait up to 1 hour) for the change to take effect.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
