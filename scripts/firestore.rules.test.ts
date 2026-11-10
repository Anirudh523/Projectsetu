import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const rules = readFileSync(resolve(fileURLToPath(new URL("../firestore.rules", import.meta.url))), "utf8");
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-setu",
    firestore: { rules },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users/student1"), {
        displayName: "Riya", role: "student", status: "approved", pairId: "pair1",
      }),
      setDoc(doc(db, "users/pal1"), {
        displayName: "Arjun", role: "pal", status: "approved", pairId: "pair1",
      }),
      setDoc(doc(db, "users/other"), {
        displayName: "Other", role: "student", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/admin1"), {
        displayName: "Admin", role: "admin", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/officer1"), {
        displayName: "Officer", role: "officer", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/pending-admin"), {
        displayName: "Pending", role: "admin", status: "pending", pairId: null,
      }),
      setDoc(doc(db, "pairs/pair1"), {
        studentUid: "student1", palUid: "pal1", members: ["student1", "pal1"], status: "active",
      }),
      setDoc(doc(db, "pairs/paused"), {
        studentUid: "student1", palUid: "pal1", members: ["student1", "pal1"], status: "paused",
      }),
      setDoc(doc(db, "identities/student1"), { legalName: "Riya Legal", consent: true }),
      setDoc(doc(db, "identities/other"), { legalName: "Other Legal", consent: false }),
      setDoc(doc(db, "letters/approved"), {
        pairId: "pair1", authorUid: "student1", status: "approved", body: "Approved letter",
      }),
      setDoc(doc(db, "letters/own-returned"), {
        pairId: "pair1", authorUid: "student1", status: "returned", body: "Returned letter",
      }),
      setDoc(doc(db, "letters/pal-returned"), {
        pairId: "pair1", authorUid: "pal1", status: "returned", body: "Returned letter",
      }),
      setDoc(doc(db, "letters/paused-approved"), {
        pairId: "paused", authorUid: "student1", status: "approved", body: "Approved letter",
      }),
      setDoc(doc(db, "audit/pair-created"), {
        actor: "admin1", action: "pair_created", target: "pair1", timestamp: new Date(),
      }),
    ]);
  });
});

test("users are readable by the person and their paired pal only", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("student1").firestore(), "users/student1")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("pal1").firestore(), "users/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("other").firestore(), "users/student1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users/student1")));
});

test("staff can read user profiles", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("admin1").firestore(), "users/other")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("officer1").firestore(), "users/other")));
});

test("only approved admins and officers can read identities", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("admin1").firestore(), "identities/student1")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("officer1").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("student1").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("other").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("pending-admin").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "identities/student1")));
});

test("clients cannot write user or identity documents", async () => {
  const adminDb = testEnv.authenticatedContext("admin1").firestore();
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  await assertFails(setDoc(doc(studentDb, "users/student1"), { role: "admin" }));
  await assertFails(setDoc(doc(adminDb, "identities/student1"), { legalName: "Changed" }));
});

test("letters are readable only by active pair members for approved or own letters", async () => {
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  const palDb = testEnv.authenticatedContext("pal1").firestore();
  const otherDb = testEnv.authenticatedContext("other").firestore();

  await assertSucceeds(getDoc(doc(studentDb, "letters/approved")));
  await assertSucceeds(getDoc(doc(palDb, "letters/approved")));
  await assertSucceeds(getDoc(doc(studentDb, "letters/own-returned")));
  await assertSucceeds(getDoc(doc(palDb, "letters/pal-returned")));
  await assertFails(getDoc(doc(studentDb, "letters/pal-returned")));
  await assertFails(getDoc(doc(otherDb, "letters/approved")));
  await assertFails(getDoc(doc(studentDb, "letters/paused-approved")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "letters/approved")));
});

test("pausing a pair immediately blocks both members from reading letters", async () => {
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  const palDb = testEnv.authenticatedContext("pal1").firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "pairs/pair1"), { status: "paused" });
  });
  await assertFails(getDoc(doc(studentDb, "letters/approved")));
  await assertFails(getDoc(doc(palDb, "letters/approved")));
});

test("clients cannot create or update letters directly", async () => {
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  await assertFails(setDoc(doc(studentDb, "letters/new"), {
    pairId: "pair1", authorUid: "student1", status: "in_review", body: "Direct write",
  }));
  await assertFails(updateDoc(doc(studentDb, "letters/approved"), { body: "Changed directly" }));
});

test("drafts can be created and updated only by their author", async () => {
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  const palDb = testEnv.authenticatedContext("pal1").firestore();
  const studentDraft = doc(studentDb, "drafts/pair1_student1");

  await assertSucceeds(setDoc(studentDraft, {
    pairId: "pair1", authorUid: "student1", body: "Draft",
  }));
  await assertSucceeds(updateDoc(studentDraft, { body: "Autosaved draft" }));
  await assertFails(updateDoc(doc(palDb, "drafts/pair1_student1"), { body: "Not the author" }));
  await assertFails(setDoc(doc(studentDb, "drafts/pair1_pal1"), {
    pairId: "pair1", authorUid: "pal1", body: "Impersonated draft",
  }));
});

test("only admins can read audit entries, and clients cannot write them or change pair status", async () => {
  const adminDb = testEnv.authenticatedContext("admin1").firestore();
  const officerDb = testEnv.authenticatedContext("officer1").firestore();
  const studentDb = testEnv.authenticatedContext("student1").firestore();

  await assertSucceeds(getDoc(doc(adminDb, "audit/pair-created")));
  await assertFails(getDoc(doc(officerDb, "audit/pair-created")));
  await assertFails(getDoc(doc(studentDb, "audit/pair-created")));
  await assertFails(setDoc(doc(adminDb, "audit/client-entry"), {
    actor: "admin1", action: "fake", target: "pair1", timestamp: new Date(),
  }));
  await assertFails(updateDoc(doc(adminDb, "pairs/pair1"), { status: "active" }));
});
