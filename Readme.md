# Project Setu

## Account model

New Firebase Auth accounts receive a `users/{uid}` profile with `status: "pending"`, `role: null`, and no pair. Signup never grants a role. An admin approves a pending account with `adminApproveUser`; `adminSetRole` changes the role of an already approved account. Both operations update the profile and Auth custom claims.

`users/{uid}` contains the display name and role and is readable by the account owner, their paired pal, and approved staff. Clients cannot write these documents. `identities/{uid}` contains legal name, school, guardian contact, and consent; only approved admins and officers can read it, and clients cannot write it. Identity records are created and maintained by trusted server-side code.

## Pairing and letters

An approved admin creates pairs with `adminCreatePair`. The student must have recorded consent, both approved accounts must be unpaired, and pair creation is audited. Students and pals submit new letters or resubmit their own returned letters through `submitLetter`; it checks the active pair, author, weekly limit, length, and contact-information rules transactionally. Clients cannot write letter documents. Pair members can read approved letters and their own letters in any status while their pair is active. Draft autosave documents use `drafts/{pairId}_{uid}` and can be read or changed only by that draft's author.

Officers review letters with `reviewLetter`; returns require a note. A pair member can report their pair with `reportPair`, which records the report and pauses the pair atomically, immediately blocking member letter reads. Only an admin can reactivate a paused pair with `adminUnpausePair`. The audit log is writable only by trusted functions and readable only by approved admins.

## Bootstrap an admin

Use the Admin SDK CLI with credentials for the intended Firebase project. This command approves the selected account and assigns its role, including when bootstrapping the first admin:

```sh
npm run set-role -- admin@example.com admin --project setu-dev-7d593
```

For the local emulator, start the Auth and Firestore emulators and set `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`, then run with `--project demo-setu`. The script requires an explicit project ID to reduce the chance of modifying the wrong Firebase project.

## Firestore rules tests

Run the emulator-backed access tests with:

```sh
npm run test:rules
```

## Callable function integration tests

Install dependencies once with `npm install`, then run:

```sh
npm run test:functions
```

This builds the functions, starts only the local Auth, Firestore, and Functions emulators under the `demo-setu` project, runs callable integration tests, and then stops the emulators. The test script explicitly connects to `127.0.0.1`; it does not call a deployed Firebase project. Successful steps print `PASS` lines, and the test runner prints a final TAP summary. The tests cover pair creation and consent, letter submission/review/resubmission, reporting and pausing, admin unpause, and audit/read access. For interactive debugging, start the emulators with `npm run emulators` in one terminal and run `npm run test:functions -w scripts` in another.