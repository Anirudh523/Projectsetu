import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "demo-setu";
const REGION = "us-central1";
const PASSWORD = "test-password-123";
const RUN_ID = randomUUID().replaceAll("-", "");

process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const adminApp = initializeAdminApp({ projectId: PROJECT_ID }, `functions-test-${RUN_ID}`);
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);
const clients: Array<{ app: FirebaseApp; uid: string }> = [];
const createdUids: string[] = [];
const createdPairIds: string[] = [];
const createdLetterIds: string[] = [];
const createdReportIds: string[] = [];

interface Client {
  app: FirebaseApp;
  uid: string;
}

function logStep(label: string): void {
  console.log(`  PASS ${label}`);
}

async function createClient(role: string): Promise<Client> {
  const email = `${role}-${RUN_ID}@example.test`;
  const userRecord = await adminAuth.createUser({ email, password: PASSWORD });
  createdUids.push(userRecord.uid);
  const userRef = adminDb.collection("users").doc(userRecord.uid);
  await userRef.set({
    displayName: role,
    role: null,
    status: "pending",
    pairId: null,
    createdAt: new Date(),
  });

  const app = initializeApp({
    apiKey: "emulator",
    authDomain: "localhost",
    projectId: PROJECT_ID,
  }, `client-${role}-${RUN_ID}`);
  clients.push({ app, uid: userRecord.uid });

  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(auth, email, PASSWORD);

  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  const functions = getFunctions(app, REGION);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { app, uid: userRecord.uid };
}

async function assignRole(uid: string, role: string): Promise<void> {
  await adminDb.collection("users").doc(uid).update({ role, status: "approved" });
}

async function invoke<T>(
  client: Client,
  name: string,
  data: Record<string, unknown>,
): Promise<T> {
  const functions = getFunctions(client.app, REGION);
  return (await httpsCallable<Record<string, unknown>, T>(functions, name)(data)).data;
}

async function expectCallableFailure(
  action: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.equal((error as { code?: string }).code, `functions/${code}`);
    return true;
  });
}

async function expectRulesFailure(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.equal((error as { code?: string }).code, "permission-denied");
    return true;
  });
}

async function seedIdentity(uid: string, consent: boolean): Promise<void> {
  await adminDb.collection("identities").doc(uid).set({
    legalName: `Test ${uid}`,
    school: null,
    guardianName: null,
    guardianContact: null,
    consent,
  });
}

after(async () => {
  await Promise.all(clients.map(({ app }) => deleteApp(app)));
  const auditIds = new Set<string>();
  for (const target of [...createdPairIds, ...createdLetterIds]) {
    const entries = await adminDb.collection("audit").where("target", "==", target).get();
    entries.docs.forEach(({ id }) => auditIds.add(id));
  }
  await Promise.all([...auditIds].map((id) => adminDb.collection("audit").doc(id).delete()));
  await Promise.all(createdLetterIds.map((id) => adminDb.collection("letters").doc(id).delete()));
  await Promise.all(createdPairIds.map((id) => adminDb.collection("pairs").doc(id).delete()));
  await Promise.all(createdReportIds.map((id) => adminDb.collection("reports").doc(id).delete()));
  await Promise.all(createdUids.flatMap((uid) => [
    adminDb.collection("users").doc(uid).delete(),
    adminDb.collection("identities").doc(uid).delete(),
    adminAuth.deleteUser(uid),
  ]));
  await adminApp.delete();
});

test("callables run against the Firebase emulators", async () => {
  console.log("\nRunning callable integration tests against local demo-setu emulators (127.0.0.1)");

  const admin = await createClient("admin");
  const officer = await createClient("officer");
  const student = await createClient("student");
  const pal = await createClient("pal");
  const noConsentStudent = await createClient("no-consent-student");
  const secondStudent = await createClient("second-student");
  const secondPal = await createClient("second-pal");

  await Promise.all([
    assignRole(admin.uid, "admin"),
    assignRole(officer.uid, "officer"),
    assignRole(student.uid, "student"),
    assignRole(pal.uid, "pal"),
    assignRole(noConsentStudent.uid, "student"),
    assignRole(secondStudent.uid, "student"),
    assignRole(secondPal.uid, "pal"),
  ]);
  await Promise.all([
    seedIdentity(student.uid, true),
    seedIdentity(noConsentStudent.uid, false),
    seedIdentity(secondStudent.uid, true),
  ]);

  await expectCallableFailure(
    () => invoke(admin, "adminCreatePair", { studentUid: noConsentStudent.uid, palUid: pal.uid }),
    "failed-precondition",
  );
  logStep("adminCreatePair rejects a student without consent");

  const { pairId } = await invoke<{ pairId: string }>(admin, "adminCreatePair", {
    studentUid: student.uid,
    palUid: pal.uid,
  });
  createdPairIds.push(pairId);
  const pair = await adminDb.collection("pairs").doc(pairId).get();
  assert.equal(pair.get("status"), "active");
  assert.deepEqual(pair.get("members"), [student.uid, pal.uid]);
  const pairAudit = await adminDb.collection("audit").where("target", "==", pairId).get();
  assert.equal(pairAudit.size, 1);
  logStep("adminCreatePair creates an active pair and audit entry");

  await expectCallableFailure(
    () => invoke(admin, "adminCreatePair", { studentUid: student.uid, palUid: secondPal.uid }),
    "failed-precondition",
  );
  logStep("adminCreatePair rejects an already-paired member");

  const { letterId } = await invoke<{ letterId: string }>(student, "submitLetter", {
    pairId,
    body: "A friendly note with enough characters to pass validation.",
  });
  createdLetterIds.push(letterId);
  await expectCallableFailure(
    () => invoke(admin, "reviewLetter", { letterId, action: "approve" }),
    "permission-denied",
  );
  await expectCallableFailure(
    () => invoke(officer, "reviewLetter", { letterId, action: "return" }),
    "invalid-argument",
  );
  logStep("submitLetter works; only an officer can review and returns require a note");

  await invoke(officer, "reviewLetter", { letterId, action: "return", note: "Please add more detail." });
  let letter = await adminDb.collection("letters").doc(letterId).get();
  assert.equal(letter.get("status"), "returned");
  assert.equal(letter.get("reviewedBy"), officer.uid);
  assert.ok(letter.get("reviewedAt"));
  assert.equal(letter.get("returnNote"), "Please add more detail.");
  logStep("reviewLetter returns a letter with reviewer, timestamp, and note");

  await invoke(student, "submitLetter", {
    pairId,
    letterId,
    body: "A revised friendly note with enough characters to pass validation.",
  });
  await invoke(officer, "reviewLetter", { letterId, action: "approve" });
  letter = await adminDb.collection("letters").doc(letterId).get();
  assert.equal(letter.get("status"), "approved");
  assert.equal(letter.get("returnNote"), null);
  const letterAudit = await adminDb.collection("audit").where("target", "==", letterId).get();
  assert.equal(letterAudit.size, 2);
  logStep("returned letters can be resubmitted and approved; review actions are audited");

  const secondPair = await invoke<{ pairId: string }>(admin, "adminCreatePair", {
    studentUid: secondStudent.uid,
    palUid: secondPal.uid,
  });
  createdPairIds.push(secondPair.pairId);
  const secondLetter = await invoke<{ letterId: string }>(secondStudent, "submitLetter", {
    pairId: secondPair.pairId,
    body: "A report-test letter with enough characters to pass validation.",
  });
  createdLetterIds.push(secondLetter.letterId);

  const secondStudentDb = getFirestore(secondStudent.app);
  await getDoc(doc(secondStudentDb, "letters", secondLetter.letterId));
  const { reportId } = await invoke<{ reportId: string }>(secondStudent, "reportPair", {
    pairId: secondPair.pairId,
    reason: "Testing pair safety controls.",
  });
  createdReportIds.push(reportId);
  const report = await adminDb.collection("reports").doc(reportId).get();
  assert.equal(report.get("pairId"), secondPair.pairId);
  assert.equal(report.get("reporterUid"), secondStudent.uid);
  assert.equal((await adminDb.collection("pairs").doc(secondPair.pairId).get()).get("status"), "paused");
  await expectRulesFailure(() => getDoc(doc(secondStudentDb, "letters", secondLetter.letterId)));
  await expectCallableFailure(
    () => invoke(secondStudent, "reportPair", { pairId, reason: "Not a member of this pair." }),
    "permission-denied",
  );
  logStep("reportPair pauses atomically, blocks letter reads, and rejects non-members");

  await expectCallableFailure(
    () => invoke(officer, "adminUnpausePair", { pairId: secondPair.pairId }),
    "permission-denied",
  );
  await invoke(admin, "adminUnpausePair", { pairId: secondPair.pairId });
  assert.equal((await adminDb.collection("pairs").doc(secondPair.pairId).get()).get("status"), "active");
  await getDoc(doc(secondStudentDb, "letters", secondLetter.letterId));
  logStep("only an admin can unpause a pair and restore letter reads");

  const reportAudit = await adminDb.collection("audit").where("target", "==", secondPair.pairId).get();
  assert.equal(reportAudit.size, 3);
  const reportAuditEntry = reportAudit.docs.find((entry) => entry.get("action") === "pair_reported");
  assert.ok(reportAuditEntry);
  assert.equal(reportAuditEntry.get("actor"), secondStudent.uid);
  assert.ok(reportAuditEntry.get("timestamp"));
  const adminDbClient = getFirestore(admin.app);
  const officerDbClient = getFirestore(officer.app);
  const studentDb = getFirestore(student.app);
  await getDoc(doc(adminDbClient, "audit", reportAuditEntry.id));
  await expectRulesFailure(() => getDoc(doc(officerDbClient, "audit", reportAuditEntry.id)));
  await expectRulesFailure(() => getDoc(doc(studentDb, "audit", reportAuditEntry.id)));
  await expectRulesFailure(() => setDoc(doc(adminDbClient, "audit", `direct-${RUN_ID}`), {
    actor: admin.uid,
    action: "client_write",
    target: pairId,
    timestamp: new Date(),
  }));
  await expectRulesFailure(() => setDoc(doc(studentDb, "letters", `direct-${RUN_ID}`), {
    pairId,
    authorUid: student.uid,
    status: "approved",
    body: "A direct client write must be denied.",
  }));
  logStep("audit entries are readable only by admins");

  logStep("clients cannot write audit entries or letters directly");
});
