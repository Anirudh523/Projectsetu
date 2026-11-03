# Project Setu

## Account model

New Firebase Auth accounts receive a `users/{uid}` profile with `status: "pending"`, `role: null`, and no pair. Signup never grants a role. An admin approves a pending account with `adminApproveUser`; `adminSetRole` changes the role of an already approved account. Both operations update the profile and Auth custom claims.

`users/{uid}` contains the display name and role and is readable by the account owner, their paired pal, and approved staff. Clients cannot write these documents. `identities/{uid}` contains legal name, school, guardian contact, and consent; only approved admins and officers can read it, and clients cannot write it. Identity records are created and maintained by trusted server-side code.

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