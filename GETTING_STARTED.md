# Project Setu - Getting Started Guide

A pen pal letter-writing platform built with React, Node.js Cloud Functions, and Firestore.

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Seed Accounts](#seed-accounts)
5. [Development Workflow](#development-workflow)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- npm 10+
- Firebase CLI: `npm install -g firebase-tools`

### Step 1: Install Dependencies

```bash
# Backend shared and functions
cd backend
npm install
npm install -w shared
npm install -w functions
npm install -w scripts

# Frontend
cd ../frontend
npm install
```

### Step 2: Start Firebase Emulators

```bash
cd backend
npm run emulators
```

You should see:
```
✓ All emulators started successfully.
Emulator UI available at http://localhost:4000
```

**Keep this terminal open!**

### Step 3: Seed Test Data (New Terminal)

```bash
cd backend
npm run seed
```

Creates 5 test accounts and 1 active pair. See [Seed Accounts](#seed-accounts) below.

### Step 4: Start Frontend Dev Server (New Terminal)

```bash
cd frontend
npm run dev
```

Frontend opens at: http://localhost:5173

### Step 5: Test the App

1. **Student Sign-In**
   - Go to http://localhost:5173
   - Select "Sign In"
   - Use credentials below

2. **Write & Submit Letter**
   - Click "Write a Letter"
   - Enter message (avoid PII: no emails, phone numbers, SSNs, credit cards)
   - Click "Submit for Review"

3. **Officer Review**
   - Log out
   - Sign in as officer
   - Review submitted letter (approve/return)

4. **Real-Time Updates**
   - Switch back to student
   - See letter status update in real-time

---

## 📖 Project Overview

### What's Completed

**Backend** ✅
- All 15 Cloud Functions implemented
- Firestore collections and types
- Security validation on every function
- Audit logging
- PII detection and blocking

**Frontend** ✅
- React routing (React Router v7)
- Firebase authentication
- AuthContext for state management
- Cloud Functions API wrapper (typed)
- All 7 user-facing pages
- Draft auto-save with localStorage
- PII detection on client
- Full TypeScript support

**Integration** ✅
- Frontend connects to Firebase/emulators
- All callable functions wrapped in `api.ts`
- Shared types in backend and frontend
- Error handling and loading states
- Role-based routing

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19 |
| Frontend Build | Vite | 8.3+ |
| Frontend Styling | Tailwind CSS | 4 |
| Frontend Routing | React Router | 7 |
| Frontend Language | TypeScript | 5.3+ |
| Backend | Node.js | 22 |
| Backend Compute | Cloud Functions | v2 |
| Database | Firestore | v1 |
| Auth | Firebase Auth | - |
| Local Dev | Firebase Emulators | latest |

---

## 🏗️ Architecture

### Directory Structure

```
backend/
├── functions/              # Cloud Functions (15 callable functions)
│   ├── src/
│   │   ├── index.ts       # Callable functions
│   │   └── util.ts        # Helper utilities
│   ├── build.mjs          # esbuild configuration
│   └── package.json
│
├── shared/                 # Shared types & utilities
│   ├── src/
│   │   ├── models.ts      # Firestore document types
│   │   ├── callables.ts   # Callable function signatures
│   │   ├── errors.ts      # Error definitions
│   │   ├── pii.ts         # PII detection regex patterns
│   │   ├── limits.ts      # App limits
│   │   ├── roles.ts       # Role definitions
│   │   └── index.ts       # Main exports
│   └── package.json
│
├── scripts/               # Development scripts
│   ├── seed.ts           # Seed test data
│   └── set-role.ts       # Manage user roles
│
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
└── firestore.indexes.json # Firestore indexes

frontend/
├── src/
│   ├── App.jsx            # Main app with routing
│   ├── main.jsx           # Entry point
│   │
│   ├── lib/               # Service layer
│   │   ├── firebase.ts    # Firebase initialization
│   │   ├── AuthContext.tsx # Auth state management
│   │   ├── api.ts         # Cloud Functions wrapper
│   │   ├── draftStore.ts  # Draft persistence
│   │   ├── pii.ts         # PII detection
│   │   └── strings.ts     # App constants
│   │
│   ├── shared/            # Shared with backend
│   │   ├── types.ts       # Firestore types
│   │   └── callables.ts   # Function signatures
│   │
│   └── pages/
│       ├── user/          # Student/Pal pages
│       └── security/      # Officer/Admin pages
│
├── package.json
├── tsconfig.json
├── vite.config.js
└── index.html
```

### Database Schema (Firestore)

#### users/{uid}
```typescript
{
  displayName: string
  role: "student" | "pal" | "officer" | "admin" | null
  status: "pending" | "approved" | "disabled"
  pairId: string | null
  createdAt: Timestamp
}
```

#### identities/{uid}
```typescript
{
  legalName: string
  school: string | null
  guardianName: string | null
  guardianContact: string | null
  consent: boolean
}
```

#### pairs/{pairId}
```typescript
{
  studentUid: string
  palUid: string
  members: [studentUid, palUid]
  status: "active" | "paused" | "ended"
  createdAt: Timestamp
}
```

#### letters/{letterId}
```typescript
{
  pairId: string
  authorUid: string
  recipientUid: string
  body: string
  status: "in_review" | "approved" | "returned"
  createdAt: Timestamp
  submittedAt: Timestamp
  reviewedBy: string | null
  reviewedAt: Timestamp | null
  returnNote: string | null
  priority: number
}
```

#### reports/{reportId}
```typescript
{
  pairId: string
  reporterUid: string
  reason: string
  status: "open"
  createdAt: Timestamp
}
```

### Cloud Functions (15 Total)

#### Admin Functions
- `adminApproveUser` - Approve signup, assign role
- `adminSetRole` - Change user role
- `adminCreatePair` - Manually create pen pal pairs
- `adminUnpausePair` - Resume paused correspondence

#### User Functions
- `submitLetter` - Submit letter for review
- `reviewLetter` - Officer review (approve/return)
- `reportPair` - Report inappropriate correspondence
- `signOutEverywhere` - Revoke all sessions

#### Trigger Functions
- `onAuthUserCreated` - Create user profile on signup

#### Additional Functions (6 more)
- Not yet documented; see `backend/functions/src/index.ts`

---

## 🧪 Seed Accounts

After running `npm run seed`, these test accounts are created:

| Email | Password | Role | Name | Status |
|-------|----------|------|------|--------|
| `admin@setu.test` | `password123` | Admin | Admin | Approved |
| `officer@setu.test` | `password123` | Officer | Officer | Approved |
| `student@setu.test` | `password123` | Student | Riya | Approved ✓ |
| `student2@setu.test` | `password123` | Student | Kiran | Pending |
| `pal@setu.test` | `password123` | Pal | Arjun | Approved |

### Active Pair
- **Pair ID**: `pair1`
- **Student**: Riya (`student@setu.test`)
- **Pal**: Arjun (`pal@setu.test`)
- **Status**: Active (ready to exchange letters)

### Suggested Test Flows

**Flow 1: Student Writes & Officer Reviews**
1. Login as Riya (`student@setu.test`)
2. Write letter to Arjun
3. Click "Submit for Review"
4. Logout
5. Login as Officer
6. Review letter (approve/return)
7. Logout and login as Riya to see status

**Flow 2: Pal Responds**
1. Login as Arjun (`pal@setu.test`)
2. Click "View Mailbox" to see approved letters
3. Write response
4. Submit for review
5. Officer approves
6. Riya sees response in mailbox

**Flow 3: Report Inappropriate Content**
1. Login as either student/pal
2. Click "Report" on mailbox
3. Submit reason
4. Officer investigates

---

## 🛠️ Development Workflow

### Common Commands

```bash
# Backend
cd backend

npm run build         # Build Cloud Functions
npm run typecheck     # TypeScript type checking
npm run emulators     # Start Firebase emulators
npm run seed          # Seed test data
npm run test:rules    # Test Firestore security rules
npm run test:functions # Test Cloud Functions

# Frontend
cd frontend

npm run dev           # Start dev server (:5173)
npm run build         # Build for production
npm run lint          # Run ESLint
npm run typecheck     # Type check
```

### Making Changes

#### Backend - Add a New Cloud Function

1. Add function in `backend/functions/src/index.ts`
2. Export it with proper typing
3. Run `npm run build` to test bundling
4. Verify in `backend/functions/lib/index.js` it's exported
5. Frontend can call it via `api.ts`

#### Frontend - Add a New Page

1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`
3. If authenticated-only, wrap with `<ProtectedRoute>`
4. Use `useAuth()` hook for auth state
5. Use `callFunction()` to call backend

#### Shared Types - Add a Firestore Collection

1. Add type to `backend/shared/src/models.ts`
2. Copy same type to `frontend/src/shared/types.ts`
3. Update Firestore security rules
4. Run `npm run test:rules` to verify

### Module Resolution Fix (Nov 23, 2026)

**Issue**: Backend failed to load with "Cannot find module '@setu/shared'"

**Root Cause**:
- Shared module imports had `.js` extensions in TypeScript
- Build config marked `@setu/shared` as external (incorrect for local package)

**Solution Applied**:
- Removed `.js` extensions from `backend/shared/src/index.ts`
- Removed `@setu/shared` from external dependencies in `build.mjs`
- Now shared code bundles inline with functions

**Verification**:
✅ Backend builds successfully
✅ All 9 exported functions load
✅ Frontend builds with no errors
✅ Full type safety working

---

## 🐛 Troubleshooting

### ⚠️ Critical Errors (Reseed Required)

If you see **"internal [0]" error when submitting letters** or **"Failed to load data" in Mailbox**:

**Root Cause**: Seed data has old UIDs. When you login, Firebase Auth gives you a new UID, but Firestore documents have old hardcoded UIDs. No match = queries fail.

**Fix**:
```bash
# 1. Clear emulator data
# Emulator data directory is: ~/.config/firebase/emulators
# Delete it or restart with --clear flag

# 2. Start emulators fresh
cd backend && npm run emulators

# 3. Reseed (in another terminal)
cd backend && npm run seed

# Expected output:
# Created user: student@setu.test -> aXbCdEf1234567890 (real Firebase UID)
# Created user: pal@setu.test -> eBfGhIj5678901234
# ✅ Seeded 5 accounts with password: password123
```

**Verify**:
```bash
npx tsx backend/scripts/check-seed.ts
# Should show real UIDs (not "student1", "pal1", etc.)
```

**Test**:
1. Login to http://localhost:5173 as `student@setu.test`
2. Write a letter and submit
3. ✅ No "internal [0]" error
4. Click "View Mailbox"
5. ✅ No "Failed to load data" error

**Detailed Debugging**: See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for console commands to check UIDs match between Auth and Firestore.

---

### "Port 8080 already in use"
Firestore emulator port is taken. Kill the process or use `firebase emulators:start --only=firestore --port=8081`

### "Cannot find module '@setu/shared'"
Backend build issue. Already fixed. Run `npm run build` to verify it's resolved.

### "Firebase Auth emulator not responding"
Make sure `npm run emulators` is running in first terminal. Check http://localhost:4000

### "ECONNREFUSED 127.0.0.1:5001"
Functions emulator not running. Keep emulators terminal open and ensure no errors.

### "PII detected in draft" but no PII present
PII detection patterns may have false positives. Check patterns in `backend/shared/src/pii.ts` and `frontend/src/lib/pii.ts`

### Draft not auto-saving
Check browser DevTools > Application > Local Storage. Should have `setu_draft_*` keys. Verify localStorage not full/disabled.

### Real-time updates not working in Mailbox
Check Firebase connection in DevTools Console. Verify Firestore listener in `frontend/src/pages/user/Mailbox.jsx`

### TypeScript errors after changes
Run `npm run typecheck` to see full errors. Check tsconfig.json has `"strict": true`

---

## 📚 Additional Resources

- **Firestore Documentation**: https://firebase.google.com/docs/firestore
- **Cloud Functions Documentation**: https://firebase.google.com/docs/functions
- **Firebase Emulator Documentation**: https://firebase.google.com/docs/emulator-suite
- **React Router Documentation**: https://reactrouter.com/
- **TypeScript Documentation**: https://www.typescriptlang.org/

---

## ✅ Integration Status

**Backend**: ✅ Complete
- All 15 Cloud Functions implemented
- Firestore schema defined
- Security rules implemented
- Module resolution fixed (Nov 23)

**Frontend**: ✅ Complete
- All 7 pages implemented
- Authentication integrated
- Cloud Functions wrapper ready
- TypeScript strict mode

**Integration**: ✅ Complete
- Backend builds: ✅
- Frontend builds: ✅
- Module resolution: ✅
- Ready for end-to-end testing

---

**Last Updated**: November 23, 2026
**Integration Version**: 1.0 Complete
