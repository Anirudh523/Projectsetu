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

const people: { uid: string; email: string; name: string; role: Role; consent?: boolean }[] = [
  { uid: "admin1",   email: "admin@setu.test",    name: "Admin",   role: "admin" },
  { uid: "officer1", email: "officer@setu.test",  name: "Officer", role: "officer" },
  { uid: "student1", email: "student@setu.test",  name: "Riya",    role: "student", consent: true },
  { uid: "student2", email: "student2@setu.test", name: "Kiran",   role: "student", consent: false },
  { uid: "pal1",     email: "pal@setu.test",      name: "Arjun",   role: "pal" },
];

const now = FieldValue.serverTimestamp();
const batch = db.batch();
for (const p of people) {
  await auth.createUser({ uid: p.uid, email: p.email, password: PASSWORD, displayName: p.name, emailVerified: true })
    .catch(() => auth.updateUser(p.uid, { password: PASSWORD })); // rerun safe
  await auth.setCustomUserClaims(p.uid, { role: p.role });
  batch.set(db.collection(COL.users).doc(p.uid),
    { displayName: p.name, role: p.role, status: "approved", pairId: null, createdAt: now });
  batch.set(db.collection(COL.identities).doc(p.uid),
    {
      legalName: p.name,
      school: p.role === "student" ? "Example School" : null,
      guardianName: null,
      guardianContact: null,
      consent: p.consent ?? false,
    });
}
batch.set(db.collection(COL.pairs).doc("pair1"), {
  studentUid: "student1", palUid: "pal1", members: ["student1", "pal1"],
  status: "active", createdAt: now,
});
batch.update(db.collection(COL.users).doc("student1"), { pairId: "pair1" });
batch.update(db.collection(COL.users).doc("pal1"), { pairId: "pair1" });
await batch.commit();
console.log(`Seeded ${people.length} accounts, password ${PASSWORD}`);