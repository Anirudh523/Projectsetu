import assert from "node:assert/strict";
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
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";

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
      setDoc(doc(db, "users/pending-officer"), {
        displayName: "Pending officer", role: "officer", status: "pending", pairId: null,
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

test("only approved officers can query letters awaiting review", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "letters/awaiting-review"), {
      pairId: "pair1", authorUid: "student1", recipientUid: "pal1",
      status: "in_review", body: "A letter awaiting review", submittedAt: new Date(),
    });
  });
  const queue = (uid: string) => query(collection(testEnv.authenticatedContext(uid).firestore(), "letters"),
    where("status", "==", "in_review"), orderBy("submittedAt", "asc"), limit(50));
  const officerDb = testEnv.authenticatedContext("officer1").firestore();
  const results = await assertSucceeds(getDocs(queue("officer1")));
  assert.deepEqual(results.docs.map((letter) => letter.id), ["awaiting-review"]);
  await assertFails(getDocs(queue("student1")));
  await assertFails(getDocs(queue("admin1")));
  await assertFails(getDocs(queue("pending-officer")));
  await assertFails(getDocs(collection(officerDb, "letters")));
  await assertFails(getDoc(doc(officerDb, "letters/approved")));
  await assertFails(getDoc(doc(officerDb, "letters/own-returned")));
  await assertFails(updateDoc(doc(officerDb, "letters/awaiting-review"), { status: "approved" }));
});

test("mailbox queries only return approved incoming letters and the author's returned letters", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const submittedAt = new Date();
    await Promise.all([
      setDoc(doc(db, "letters/incoming"), {
        pairId: "pair1", authorUid: "pal1", recipientUid: "student1", status: "approved", submittedAt,
      }),
      setDoc(doc(db, "letters/incoming-returned"), {
        pairId: "pair1", authorUid: "pal1", recipientUid: "student1", status: "returned", submittedAt,
      }),
      setDoc(doc(db, "letters/own-returned"), {
        pairId: "pair1", authorUid: "student1", recipientUid: "pal1", status: "returned", submittedAt,
      }),
      setDoc(doc(db, "letters/incoming-review"), {
        pairId: "pair1", authorUid: "pal1", recipientUid: "student1", status: "in_review", submittedAt,
      }),
    ]);
  });
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  const letters = collection(studentDb, "letters");
  const incoming = query(letters, where("pairId", "==", "pair1"),
    where("recipientUid", "==", "student1"), where("status", "==", "approved"),
    orderBy("submittedAt", "desc"), limit(50));
  const returned = query(letters, where("pairId", "==", "pair1"),
    where("authorUid", "==", "student1"), where("status", "==", "returned"),
    orderBy("submittedAt", "desc"), limit(50));
  assert.deepEqual((await assertSucceeds(getDocs(incoming))).docs.map((letter) => letter.id), ["incoming"]);
  assert.deepEqual((await assertSucceeds(getDocs(returned))).docs.map((letter) => letter.id), ["own-returned"]);
  await assertFails(getDocs(query(letters, where("recipientUid", "==", "student1"),
    where("status", "in", ["approved", "returned"]), orderBy("submittedAt", "desc"), limit(50))));
  const otherLetters = collection(testEnv.authenticatedContext("other").firestore(), "letters");
  await assertFails(getDocs(query(otherLetters, where("pairId", "==", "pair1"),
    where("recipientUid", "==", "student1"), where("status", "==", "approved"),
    orderBy("submittedAt", "desc"), limit(50))));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "pairs/pair1"), { status: "paused" });
  });
  await assertFails(getDocs(incoming));
  await assertFails(getDocs(returned));
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
