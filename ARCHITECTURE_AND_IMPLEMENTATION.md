# Project Setu - Architecture & Implementation Details

Comprehensive technical documentation for the backend and frontend systems.

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Integration Details](#integration-details)
5. [Build Process](#build-process)
6. [Testing](#testing)

---

## 🏗️ System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Firebase (Cloud)                          │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐        │
│  │   Firebase │  │   Firestore  │  │ Cloud Functions        │
│  │    Auth    │  │   Database   │  │  (Node.js 22)  │        │
│  └────────────┘  └──────────────┘  └────────────────┘        │
│                                                               │
│        OR (Local Development)                                │
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐        │
│  │ Auth Emu   │  │ Firestore Emu│  │ Functions Emu  │        │
│  │   :9099    │  │    :8080     │  │    :5001       │        │
│  └────────────┘  └──────────────┘  └────────────────┘        │
└──────────────────────────────────────────────────────────────┘
              ▲
              │ HTTPS (REST/gRPC)
              │
┌─────────────┴────────────────────────┐
│          Frontend (React)             │
│  Running at http://localhost:5173    │
│                                       │
│  ┌────────────────────────────────┐  │
│  │      React Router (v7)         │  │
│  │  ┌──────┬──────────┬────────┐  │  │
│  │  │ Auth │ Mailbox  │ Write  │  │  │
│  │  │Pages │  Pages   │ Pages  │  │  │
│  │  └──────┴──────────┴────────┘  │  │
│  └────────────────────────────────┘  │
│                                       │
│  ┌────────────────────────────────┐  │
│  │      Service Layer             │  │
│  │  ┌───────┬───────┬────────┐   │  │
│  │  │Firebase│ API  │Draft   │   │  │
│  │  │Init    │Wrapper│Store  │   │  │
│  │  └───────┴───────┴────────┘   │  │
│  └────────────────────────────────┘  │
│                                       │
│  ┌────────────────────────────────┐  │
│  │      React Context             │  │
│  │  AuthContext + useAuth() hook  │  │
│  └────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### Component Communication Flow

```
User Action (click, type)
    ↓
React Component
    ↓
useAuth() / useEffect()
    ↓
API Wrapper (api.ts)
    ↓
Cloud Functions (callFunction)
    ↓
Firebase SDK (httpsCallable)
    ↓
Cloud Functions Runtime (backend)
    ↓
Shared Types (@setu/shared - bundled)
    ↓
Firestore Database
    ↓
Security Rules (Validation)
    ↓
Write to Collection
    ↓
Firestore Listener (onSnapshot)
    ↓
React Component (State Update)
    ↓
UI Re-render
```

---

## 🔧 Backend Implementation

### Cloud Functions (15 Total)

#### Admin Operations (Requires `role: "admin"`)

**adminApproveUser(uid, role)**
- Purpose: Approve signup, assign user role
- Input: `{ uid: string, role: "student" | "pal" | "officer" }` 
- Output: `{ success: boolean }`
- Security: Admin-only
- Side effects: Updates user role, sets custom claims

**adminSetRole(uid, role)**
- Purpose: Change existing user's role
- Input: `{ uid: string, role: "student" | "pal" | "officer" | "admin" }`
- Output: `{ success: boolean }`
- Security: Admin-only
- Side effects: Updates custom claims, audit log

**adminCreatePair(studentUid, palUid)**
- Purpose: Manually create pen pal pair
- Input: `{ studentUid: string, palUid: string }`
- Output: `{ pairId: string }`
- Security: Admin-only
- Validation: Both users must exist and be approved
- Side effects: Creates pair, links users

**adminUnpausePair(pairId)**
- Purpose: Resume paused correspondence
- Input: `{ pairId: string }`
- Output: `{ success: boolean }`
- Security: Admin-only
- Validation: Pair must exist and be paused
- Side effects: Updates pair status

#### User Operations (Requires Authentication)

**submitLetter(pairId, body, letterId?)**
- Purpose: Submit letter for officer review
- Input: `{ pairId: string, body: string, letterId?: string }`
- Output: `{ letterId: string }`
- Security: User must be in the pair
- Validation:
  - Letter not empty
  - No PII (emails, phones, SSN, credit cards)
  - Pair must be active
  - User not rate-limited (weekly quota)
- Side effects: Creates letter with status "in_review"

**reviewLetter(letterId, action, note?)**
- Purpose: Officer review of submitted letter
- Input: `{ letterId: string, action: "approve" | "return", note?: string }`
- Output: `{ success: boolean }`
- Security: User must be officer or admin
- Validation:
  - Letter must exist and be "in_review"
  - Note provided if returning letter
- Side effects: Updates letter status, adds review timestamp

**reportPair(pairId, reason)**
- Purpose: Report inappropriate correspondence
- Input: `{ pairId: string, reason: string }`
- Output: `{ reportId: string }`
- Security: User must be in the pair
- Validation: Report reason provided
- Side effects: Creates report with status "open"

**signOutEverywhere()**
- Purpose: Revoke all sessions for current user
- Input: None
- Output: `{ success: boolean }`
- Security: Authenticated users only
- Side effects: Revokes all refresh tokens

#### Trigger Functions (Automatic)

**onAuthUserCreated()**
- Purpose: Create user profile when user signs up
- Trigger: Firebase Auth user creation
- Side effects: Creates user document with status "pending"

#### Additional Functions (6 more)
See `backend/functions/src/index.ts` for complete list.

### Shared Module (@setu/shared)

Located at `backend/shared/`, provides:

**models.ts**
- `User` interface
- `Identity` interface  
- `Pair` interface
- `Letter` interface
- `Report` interface

**callables.ts**
- Type definitions for all callable functions
- Request/response types for type safety

**errors.ts**
- Custom error types
- Error code definitions
- Error message templates

**pii.ts**
- PII detection regex patterns:
  - Email addresses: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi`
  - Phone numbers: `/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g`
  - Social Security Numbers: `/\b\d{3}-\d{2}-\d{4}\b/g`
  - Credit cards: `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g`
- PII detection function: `detectPII(text: string): Match[]`

**limits.ts**
- `LETTER_MIN_LENGTH` = 10 characters
- `LETTER_MAX_LENGTH` = 5000 characters
- `LETTERS_PER_WEEK_LIMIT` = 7 letters
- `MAX_PAIR_LETTER_SIZE` = 50 letters per week per pair

**roles.ts**
- `Role` = "admin" | "officer" | "student" | "pal" | null
- Role hierarchy and permissions

### Build Configuration (build.mjs)

Uses **esbuild** to bundle Cloud Functions:

```javascript
{
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  external: [
    "firebase-admin",           // Pre-installed in runtime
    "firebase-admin/*",
    "firebase-functions",        // Pre-installed in runtime
    "firebase-functions/*"
  ]
  // ✅ @setu/shared NOW BUNDLED (not external)
}
```

**Key Points**:
- Bundles code as CommonJS for Node.js
- Creates source map for debugging
- Firebase Admin SDK stays external (pre-installed)
- Shared module bundled inline (local package)

---

## 💻 Frontend Implementation

### Pages (7 Total)

#### Authentication Pages

**UserLoginPage** (`pages/user/UserLoginPage.jsx`)
- Route: `/login`
- Features:
  - Email/password Firebase Auth
  - Sign-in with error messages
  - Redirect to welcome on success
  - Sign-up link
- Uses: `useAuth()`, Firebase `signInWithEmailAndPassword()`

**UserRegisterPage** (`pages/user/UserRegisterPage.jsx`)
- Route: `/register`
- Features:
  - Email/password registration
  - Firebase Auth + Firestore write
  - Custom displayName
  - Error handling
  - Login link
- Uses: `useAuth()`, `createUserWithEmailAndPassword()`, Firestore write

**SecurityLoginPage** (`pages/security/SecurityLoginPage.jsx`)
- Route: `/security/login`
- Features:
  - Officer/Admin sign-in
  - Role verification (must have role)
  - Redirect to dashboard on success
- Uses: `useAuth()`, custom role checking

**SecurityRegisterPage** (`pages/security/SecurityRegisterPage.jsx`)
- Route: `/security/register`
- Features:
  - Officer/Admin registration
  - Role assignment (admin-only)
  - Contact information
- Uses: `useAuth()`, `callFunction('adminApproveUser')`

#### User Pages

**UserWelcomePage** (`pages/user/UserWelcomePage.jsx`)
- Route: `/welcome`
- Features:
  - Welcome message
  - Quick navigation to mailbox/write
  - Logout button
  - User profile display
- Uses: `useAuth()`, React Router `navigate()`

**Mailbox** (`pages/user/Mailbox.jsx`)
- Route: `/mailbox`
- Features:
  - Real-time letter list (Firestore `onSnapshot`)
  - Display by status (approved/pending/returned)
  - Reply functionality
  - Report button
  - Empty state
- Uses: `useAuth()`, Firestore listener, `useEffect()`

**WriteLetterPage** (`pages/user/WriteLetterPage.jsx`)
- Route: `/write`
- Features:
  - Letter composition with real-time preview
  - Auto-save to localStorage (1-second debounce)
  - PII detection with warnings
  - Character counter
  - Pair selection
  - Letter validation
  - Submit button
  - Draft recovery on page load
- Uses: `useAuth()`, `callFunction('submitLetter')`, `draftStore`, `pii`

### Service Layer (lib/)

**firebase.ts** (60 lines)
```typescript
// Initialization
initializeFirebase()
  - Detects dev mode (import.meta.env.DEV)
  - Connects to emulators if DEV
  - Initializes Firebase app

// Service getters (lazy-loaded)
getAuthService(): Auth
getFunctionsService(): Functions
getFirestoreService(): Firestore
```

**AuthContext.tsx** (45 lines)
```typescript
// Context providers
<AuthProvider> - Wraps app, initializes auth listener

// Hook
useAuth()
  - Returns: {
      user: User | null,
      loading: boolean,
      error: Error | null,
      logout: () => Promise<void>,
      userRole: string | null
    }
  - Updates on auth state change
```

**api.ts** (60 lines)
```typescript
// Typed function wrapper
callFunction<T extends CallableName>(
  name: T,
  data: Callables[T]['req'],
  options?: HttpsCallableOptions
): Promise<Callables[T]['res']>

// Pre-wired functions
submitLetter(pairId, body, letterId?)
reviewLetter(letterId, action, note?)
reportPair(pairId, reason)
adminApproveUser(uid, role)
// ... 5 more functions

// Features
- Caches callable instances (avoid recreating)
- Full TypeScript type safety
- Error handling
- Automatic emulator detection
```

**draftStore.ts** (40 lines)
```typescript
// localStorage-based draft persistence
interface Draft {
  pairId: string,
  body: string,
  savedAt: number
}

getDraft(pairId: string): Draft | null
saveDraft(pairId: string, body: string): void
clearDraft(pairId: string): void

// Features
- Auto-save with 1-second debounce
- Survives page refresh
- Per-pair draft storage
- Shared device safe (not Firestore)
```

**pii.ts** (30 lines)
```typescript
// PII detection on client
detectPII(text: string): Match[]
  - Returns: Array of {
      type: "email" | "phone" | "ssn" | "creditcard",
      text: string,
      index: number
    }
  - Used by WriteLetterPage for warnings
  - Also validated on backend
```

**strings.ts** (50 lines)
```typescript
// App constants and UI strings
LIMITS = {
  LETTER_MIN_LENGTH,
  LETTER_MAX_LENGTH,
  LETTERS_PER_WEEK
}

STRINGS = {
  errors: { ... },
  labels: { ... },
  messages: { ... }
}
```

### React Router Setup

**App.jsx** (120 lines)
```typescript
// 7 routes
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<UserLoginPage />} />
    <Route path="/register" element={<UserRegisterPage />} />
    <Route path="/security/login" element={<SecurityLoginPage />} />
    <Route path="/security/register" element={<SecurityRegisterPage />} />
    
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path="/welcome" element={<UserWelcomePage />} />
        <Route path="/mailbox" element={<Mailbox />} />
        <Route path="/write" element={<WriteLetterPage />} />
      </Route>
    </Route>
  </Routes>
</BrowserRouter>

// ProtectedRoute
- Checks if user authenticated
- Checks if user has required role
- Redirects to /login if not
- Loads user from AuthContext
```

### Shared Types (shared/)

**types.ts**
- Duplicates backend types from `@setu/shared`
- Firestore document interfaces
- Used for type safety in component props

**callables.ts**
- Duplicates backend callable signatures
- Request/response types
- Ensures API wrapper type safety

---

## 🔗 Integration Details

### Module Resolution Fix (November 23, 2026)

**Problem**: Backend failed with "Cannot find module '@setu/shared'"

**Root Cause**:
1. `backend/shared/src/index.ts` had `.js` extensions in TypeScript imports
2. `backend/functions/build.mjs` marked `@setu/shared` as external

**Solution**:
1. Removed `.js` extensions (TypeScript handles resolution)
2. Removed `@setu/shared` from external array (now bundled)

**Result**:
- esbuild bundles shared code inline
- Functions bundle self-contained
- No external dependency on `@setu/shared` at runtime
- Backend and frontend can both use shared types

### Type Safety Chain

```
backend/shared/src/models.ts
  ↓ (exported)
backend/shared/src/index.ts
  ↓ (bundled at build time)
backend/functions/lib/index.js ← Bundled
  
frontend/src/shared/types.ts
  ↓ (duplicated, never bundled)
frontend/src/pages/WriteLetterPage.jsx
  ↓ (uses types)
frontend/src/lib/api.ts
  ↓ (callFunction<T>())
frontend/src/shared/callables.ts
  ↓ (enforces types)
API calls to backend
```

### Environment Detection

**Frontend** (`firebase.ts`)
```typescript
if (import.meta.env.DEV) {
  // Local development - connect to emulators
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFunctionsEmulator(functions, 'localhost', 5001)
  connectFirestoreEmulator(db, 'localhost', 8080)
} else {
  // Production - connect to Firebase
  // (auto-configured from firebase-config)
}
```

**Backend** (`seed.ts`, scripts)
```typescript
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080"
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099"

// Only allows seeding demo projects
if (!projectId.startsWith("demo-")) 
  throw new Error(`Refusing to seed ${projectId}`)
```

---

## 🔨 Build Process

### Frontend Build (Vite)

```bash
$ npm run build
```

1. **TypeScript Compilation**
   - Strict mode enabled
   - `src/**/*.{ts,tsx}` → JavaScript

2. **Module Resolution**
   - Imports Firebase SDK
   - Imports React, React Router, Tailwind
   - Imports local components and services

3. **Code Splitting** (not configured yet)
   - Could split pages into separate chunks
   - Currently one main bundle

4. **Asset Processing**
   - CSS minification (Tailwind)
   - Image optimization
   - Source maps (dev only)

5. **Output**
   - `dist/index.html` - Entry HTML
   - `dist/assets/index-*.js` - Main bundle (861 KB)
   - `dist/assets/index-*.css` - Styles (14.7 KB)

### Backend Build (esbuild)

```bash
$ npm run build
```

1. **TypeScript Reading**
   - Reads `functions/src/index.ts`
   - Reads all imports including shared module

2. **Module Resolution**
   - Firebase Admin/Functions → external (not bundled)
   - `@setu/shared` → bundled inline (now fixed)
   - Local utilities → bundled

3. **Bundling**
   - Combines all code into single file
   - Preserves `export` statements
   - Creates source map

4. **Output**
   - `lib/index.js` - Single-file bundle (19.1 KB)
   - `lib/index.js.map` - Source map (30.7 KB)
   - Ready for Cloud Functions deployment

---

## 🧪 Testing

### Unit Tests

**Backend Firestore Rules** (`scripts/firestore.rules.test.ts`)
```bash
$ npm run test:rules
```
- Tests security rules with emulator
- Validates read/write permissions
- Tests role-based access control

**Backend Cloud Functions** (`scripts/functions.integration.test.ts`)
```bash
$ npm run test:functions
```
- Tests callable function behavior
- Tests input validation
- Tests error handling
- Tests Firestore writes

### Manual Testing

**Flow 1: Letter Submission & Review**
1. Login as student
2. Write & submit letter
3. Verify "in_review" status
4. Logout
5. Login as officer
6. Review letter (approve/return)
7. Logout and login as student
8. Verify status updated

**Flow 2: Real-Time Mailbox Updates**
1. Open mailbox in two browser windows
2. Submit letter in first window
3. See it appear in second window instantly

**Flow 3: PII Detection**
1. Try writing letter with:
   - Email address → Should warn
   - Phone number → Should warn
   - SSN → Should warn
   - Valid text → Should allow submit

**Flow 4: Draft Auto-Save**
1. Write letter
2. Check localStorage in DevTools
3. Refresh page
4. Draft should be restored

### TypeScript Type Checking

```bash
$ npm run typecheck
```
- Runs tsc in all workspaces
- No code generation (--noEmit)
- Catches type errors before runtime

---

## 📊 Build Sizes

| Artifact | Size | Gzipped |
|----------|------|---------|
| Frontend JS | 861 KB | 261 KB |
| Frontend CSS | 14.7 KB | 3.69 KB |
| Backend Bundle | 19.1 KB | ~6 KB |
| Backend Source Map | 30.7 KB | ~8 KB |

**Notes**:
- Frontend size acceptable (Firebase SDK is large)
- Backend bundle very small (only contains functions)
- Production should minify and serve gzipped

---

## ✅ Verification Checklist

- [x] Backend builds successfully
- [x] All 15 Cloud Functions exported
- [x] Shared module types bundled
- [x] Frontend builds successfully
- [x] All 57 modules transformed
- [x] TypeScript strict mode enabled
- [x] Firebase emulator detection works
- [x] Auth context provides useAuth() hook
- [x] API wrapper typed and cached
- [x] Draft auto-save working
- [x] PII detection implemented
- [x] React Router setup complete
- [x] Seed data creates 5 accounts + 1 pair
- [x] Module resolution fixed (Nov 23)

---

**Last Updated**: November 23, 2026
**Integration Version**: 1.0 Complete
