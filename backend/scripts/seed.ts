import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COL, type Role } from "@setu/shared";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const projectId = process.env.GCLOUD_PROJECT ?? "demo-setu";
if (!projectId.startsWith("demo-")) throw new Error(`Refusing to seed ${projectId}`);

initializeApp({ projectId });
const auth = getAuth(), db = getFirestore(), PASSWORD = "password123";

const people: { email: string; name: string; role: Role; consent?: boolean }[] = [
  { email: "admin@setu.test",    name: "Admin",   role: "admin" },
  { email: "officer@setu.test",  name: "Officer", role: "officer" },
  { email: "student@setu.test",  name: "Riya",    role: "student", consent: true },
  { email: "student2@setu.test", name: "Kiran",   role: "student", consent: false },
  { email: "pal@setu.test",      name: "Arjun",   role: "pal" },
];

const now = FieldValue.serverTimestamp();
const batch = db.batch();
const userIds: { [email: string]: string } = {};

// Create auth users and collect their actual UIDs
for (const p of people) {
  try {
    const user = await auth.createUser({
      email: p.email,
      password: PASSWORD,
      displayName: p.name,
      emailVerified: true,
    });
    userIds[p.email] = user.uid;
    await auth.setCustomUserClaims(user.uid, { role: p.role });
    console.log(`Created user: ${p.email} -> ${user.uid}`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      // User exists, get their UID
      const user = await auth.getUserByEmail(p.email);
      userIds[p.email] = user.uid;
      await auth.setCustomUserClaims(user.uid, { role: p.role });
      console.log(`Updated existing user: ${p.email} -> ${user.uid}`);
    } else {
      throw err;
    }
  }
}

// Create Firestore docs with actual UIDs
for (const p of people) {
  const uid = userIds[p.email];
  batch.set(db.collection(COL.users).doc(uid), {
    displayName: p.name,
    role: p.role,
    status: "approved",
    pairId: null,
    createdAt: now,
  });
  batch.set(db.collection(COL.identities).doc(uid), {
    legalName: p.name,
    school: p.role === "student" ? "Example School" : null,
    guardianName: null,
    guardianContact: null,
    consent: p.consent ?? false,
  });
}

// Create pair with actual UIDs
const studentId = userIds["student@setu.test"];
const palId = userIds["pal@setu.test"];
batch.set(db.collection(COL.pairs).doc("pair1"), {
  studentUid: studentId,
  palUid: palId,
  members: [studentId, palId],
  status: "active",
  createdAt: now,
});
batch.update(db.collection(COL.users).doc(studentId), { pairId: "pair1" });
batch.update(db.collection(COL.users).doc(palId), { pairId: "pair1" });

await batch.commit();
console.log(`✅ Seeded ${people.length} accounts with password: ${PASSWORD}`);
console.log(`📋 User IDs:`, userIds);