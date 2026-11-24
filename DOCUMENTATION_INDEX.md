# Project Setu - Documentation Guide

## 📚 Main Documentation Files (3 Core Files + This Index)

### 1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Setup & Usage ⭐ START HERE
**When to read**: First time setup, troubleshooting errors, seed account info
- Quick start (5 minutes)
- Full installation and setup
- Seed accounts and test flows
- **Critical error section**: "internal [0]" and "Failed to load data" errors
- Development workflow
- Troubleshooting guide

### 2. **[ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md)** - System Design
**When to read**: Understanding the system, extending functionality, code deep-dive
- Complete system architecture
- All 15 Cloud Functions documented
- All 7 frontend pages/components
- Firestore database schema
- Security rules explanation
- Build configuration details

### 3. **[DEPLOYMENT_AND_OPERATIONS.md](./DEPLOYMENT_AND_OPERATIONS.md)** - Production & Scaling
**When to read**: Deploying to production, performance tuning, monitoring
- Local emulator detailed setup
- Production deployment steps
- Environment variables configuration
- Performance optimization
- Monitoring and logging
- Scaling considerations
- Troubleshooting production issues

---

## 🎯 Quick Navigation by Task

| Task | File | Section |
|------|------|---------|
| **Getting started** | GETTING_STARTED.md | Quick Start |
| **I'm getting errors** ⚠️ | GETTING_STARTED.md | Troubleshooting → Critical Errors |
| **Setting up from scratch** | GETTING_STARTED.md | Full guide |
| **Understanding the system** | ARCHITECTURE_AND_IMPLEMENTATION.md | Architecture section |
| **Adding a new feature** | ARCHITECTURE_AND_IMPLEMENTATION.md | Development guide |
| **Deploying to production** | DEPLOYMENT_AND_OPERATIONS.md | Deployment section |
| **Performance tuning** | DEPLOYMENT_AND_OPERATIONS.md | Scaling section |
| **Seed accounts info** | GETTING_STARTED.md | Seed Accounts section |
| **Finding common commands** | GETTING_STARTED.md | Development section |

---

## 🚨 Critical Issues - Solution Summary

### "internal [0]" When Submitting Letters OR "Failed to load data" in Mailbox

**Root Cause**: Seed data has old UIDs (before fix was applied)

**Quick Fix** (Read GETTING_STARTED.md → Troubleshooting → Critical Errors):
```bash
# 1. Clear emulator data
# 2. Run: cd backend && npm run emulators
# 3. Run: cd backend && npm run seed
# 4. Verify: npx tsx backend/scripts/check-seed.ts
```

**Expected Result**: UIDs should be real Firebase IDs (like aXbCdEf1234567890), not hardcoded (student1, pal1)

---

## 🌱 Seed Accounts

After running `npm run seed`, use these credentials:

| Email | Password | Role | Pair | For Testing |
|-------|----------|------|------|-------------|
| student@setu.test | password123 | Student | pair1 | ✅ Write letters |
| pal@setu.test | password123 | Pal | pair1 | ✅ Receive letters |
| officer@setu.test | password123 | Officer | — | ✅ Review letters |
| admin@setu.test | password123 | Admin | — | Admin controls |
| student2@setu.test | password123 | Student | — | No pair |

**Recommended test pair**: student@setu.test ↔️ pal@setu.test

---

## ✅ What's Been Fixed (Nov 23, 2026)

| Issue | Root Cause | Fix | Status |
|-------|-----------|-----|--------|
| "internal [0]" on letter submit | Hardcoded UIDs in seed | Updated seed script to use real Firebase UIDs | ✅ Seed script correct, emulator data cleared |
| "Failed to load data" in Mailbox | Firestore queries failed due to UID mismatch | Same fix as above | ✅ Ready for reseed |
| Module bundling errors | Local @setu/shared not building correctly | Removed .js extensions, removed from external config | ✅ Verified working |
| Error messages too generic | No error details extracted from Firebase | Improved error handling in api.ts | ✅ Shows real error codes now |
| Manual pair ID input required | User didn't know their pairId | Auto-load from Firestore user profile | ✅ Now automatic |

---

## 🔄 Development Workflow

```bash
# Terminal 1: Start Emulators
cd backend && npm run emulators

# Terminal 2: Seed Data
cd backend && npm run seed

# Terminal 3: Frontend Dev
cd frontend && npm run dev

# Access at: http://localhost:5173
```

---

## 📝 File Statistics

| File | Purpose | Read Time |
|------|---------|-----------|
| GETTING_STARTED.md | Setup, troubleshooting, seed info | 15 min |
| ARCHITECTURE_AND_IMPLEMENTATION.md | System design, development guide | 25 min |
| DEPLOYMENT_AND_OPERATIONS.md | Production deployment, scaling | 20 min |
| README.md | Project overview | 5 min |

**Total**: ~65 minutes of documentation covering all aspects

---

## 🎓 Learning Paths

### For Developers Fixing Errors
1. Read GETTING_STARTED.md → Troubleshooting section
2. Follow the critical error fix
3. Reseed the data
4. Test with seed accounts

### For New Team Members
1. Start with README.md (project overview)
2. Read GETTING_STARTED.md (setup and basics)
3. Read ARCHITECTURE_AND_IMPLEMENTATION.md (understand the system)
4. Follow development workflow and start coding

### For DevOps/Infrastructure
1. Read GETTING_STARTED.md (local setup)
2. Read DEPLOYMENT_AND_OPERATIONS.md (production setup)
3. Configure environment variables
4. Deploy and monitor

### For Code Reviewers
1. Read ARCHITECTURE_AND_IMPLEMENTATION.md (what's supposed to work)
2. Read GETTING_STARTED.md → Development section (how to run locally)
3. Test the changes and verify against architecture

---

## 🔧 Key Commands Reference

```bash
# Backend
cd backend
npm install                    # Install dependencies
npm run build                  # Build Cloud Functions
npm run emulators             # Start Firebase emulators
npm run seed                  # Seed test data
npm run typecheck             # Type check
npm run test:rules            # Test security rules
npx tsx scripts/check-seed.ts # Verify seed data

# Frontend
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start dev server
npm run build                 # Build for production
npm run typecheck             # Type check
npm run lint                  # Lint code
```

---

## 🌐 Local URLs

- **Frontend**: http://localhost:5173
- **Emulator Suite**: http://localhost:4000
- **Firestore Emulator**: http://localhost:8080
- **Functions Emulator**: http://localhost:5001
- **Auth Emulator**: http://localhost:9099

---

## ✨ Documentation Features

- ✅ **Consolidated**: 3 core files + this index (no duplication)
- ✅ **Complete**: Covers setup, development, deployment, troubleshooting
- ✅ **Actionable**: Clear step-by-step instructions for every task
- ✅ **Error-focused**: Dedicated section for critical error fixes
- ✅ **Seed info**: All test account details in one place
- ✅ **Navigation**: Easy-to-find sections and cross-references

---

## 🚀 Next Steps

1. **Just starting?** → Read GETTING_STARTED.md
2. **Getting errors?** → Jump to GETTING_STARTED.md → Troubleshooting
3. **Need to reseed?** → Follow "Critical Errors" section in GETTING_STARTED.md
4. **Want to understand design?** → Read ARCHITECTURE_AND_IMPLEMENTATION.md
5. **Deploying to production?** → Read DEPLOYMENT_AND_OPERATIONS.md

---

**Documentation Version**: 2.0 (Consolidated & Error-Focused)
**Last Updated**: November 23, 2026
**Status**: Production-ready with error fixes included

