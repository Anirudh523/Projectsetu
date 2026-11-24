import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { COL } from "@setu/shared";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const projectId = process.env.GCLOUD_PROJECT ?? "demo-setu";

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

console.log("\n📋 CHECKING SEED DATA\n");
console.log("=".repeat(60));

// Check Firebase Auth users
console.log("\n🔐 Firebase Auth Users:");
try {
  const listResult = await auth.listUsers(100);
  listResult.users.forEach(user => {
    const role = (user.customClaims as any)?.role || "none";
    console.log(`  ✓ ${user.email} (UID: ${user.uid}, Role: ${role})`);
  });
  console.log(`  Total: ${listResult.users.length} users\n`);
} catch (err: any) {
  console.error(`  ✗ Error listing users: ${err.message}\n`);
}

// Check Firestore users collection
console.log("💾 Firestore users collection:");
try {
  const usersSnap = await db.collection(COL.users).get();
  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  ✓ ${doc.id}: role=${data.role}, status=${data.status}, pairId=${data.pairId || "null"}`);
  });
  console.log(`  Total: ${usersSnap.size} documents\n`);
} catch (err: any) {
  console.error(`  ✗ Error listing users: ${err.message}\n`);
}

// Check Firestore pairs collection
console.log("👥 Firestore pairs collection:");
try {
  const pairsSnap = await db.collection(COL.pairs).get();
  pairsSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  ✓ ${doc.id}: student=${data.studentUid}, pal=${data.palUid}, status=${data.status}`);
  });
  console.log(`  Total: ${pairsSnap.size} documents\n`);
} catch (err: any) {
  console.error(`  ✗ Error listing pairs: ${err.message}\n`);
}

// Check identities collection
console.log("🆔 Firestore identities collection:");
try {
  const identitiesSnap = await db.collection(COL.identities).get();
  identitiesSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  ✓ ${doc.id}: name=${data.legalName}, consent=${data.consent}`);
  });
  console.log(`  Total: ${identitiesSnap.size} documents\n`);
} catch (err: any) {
  console.error(`  ✗ Error listing identities: ${err.message}\n`);
}

console.log("=".repeat(60));

// Verification check
console.log("\n✅ VERIFICATION:");
try {
  const usersSnap = await db.collection(COL.users).get();
  const pairsSnap = await db.collection(COL.pairs).get();

  if (usersSnap.size === 0) {
    console.log("  ⚠️  NO USERS FOUND - You need to run 'npm run seed'");
  } else if (pairsSnap.size === 0) {
    console.log("  ⚠️  NO PAIRS FOUND - Seed data might be incomplete");
  } else {
    console.log("  ✅ Seed data appears complete!");
  }
} catch (err: any) {
  console.error(`  ✗ Error verifying: ${err.message}`);
}

console.log("\n");
process.exit(0);
