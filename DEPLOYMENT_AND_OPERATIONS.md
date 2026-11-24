# Project Setu - Deployment & Operations Guide

Production deployment, maintenance, and troubleshooting guide.

## 📋 Table of Contents
1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Operations & Monitoring](#operations--monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## 🌍 Deployment Overview

Project Setu uses Firebase for cloud infrastructure:

| Component | Service | Location |
|-----------|---------|----------|
| Frontend | Firebase Hosting | `setu-dev-7d593.web.app` |
| Backend | Cloud Functions | `us-west2-setu-dev-7d593.cloudfunctions.net` |
| Database | Firestore | `setu-dev-7d593.firebaseio.com` |
| Auth | Firebase Auth | Cloud-hosted |
| Config | firebase.json | At repository root |

### Deployment Environments

| Environment | Project ID | Firebase URL | Purpose |
|-------------|-----------|--------------|---------|
| Local Dev | `demo-setu` | localhost (emulators) | Local development |
| Staging | `setu-staging` | staging URL | Pre-production testing |
| Production | `setu-dev-7d593` | production URL | Live application |

---

## 🔑 Prerequisites

### 1. Firebase Projects

**Production Project** (`setu-dev-7d593`)
- Google Cloud Project linked
- Billing enabled
- APIs enabled:
  - Cloud Functions API
  - Firestore API
  - Firebase Authentication
  - Firebase Hosting API
  - Cloud Logging API (for monitoring)

**Staging Project** (`setu-staging`)
- Same setup as production
- For testing before production

### 2. Local Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Google
firebase login

# Set default project
firebase use setu-dev-7d593  # or staging
```

### 3. Environment Variables

**Backend** (`.env` or Secret Manager)
```
GCLOUD_PROJECT=setu-dev-7d593
NODE_ENV=production
LOG_LEVEL=info
```

**Frontend** (`.env.production`)
```
VITE_FIREBASE_PROJECT_ID=setu-dev-7d593
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=setu-dev-7d593.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://setu-dev-7d593.firebaseio.com
VITE_FIREBASE_STORAGE_BUCKET=setu-dev-7d593.appspot.com
```

### 4. Access Control

- Deployer account needs "Editor" role on GCP project
- Uses Google authentication (gcloud/firebase CLI)
- Service accounts for CI/CD (GitHub Actions)

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [ ] `npm run lint` passes (no linting errors)
- [ ] `npm run typecheck` passes (no TypeScript errors)
- [ ] No `console.log()` statements (use logger)
- [ ] No hardcoded API keys or secrets
- [ ] Environment variables configured

### Backend

- [ ] `npm run build` succeeds (no build errors)
- [ ] Bundle size reasonable (~20 KB)
- [ ] `npm run test:rules` passes (all security rule tests)
- [ ] `npm run test:functions` passes (all function tests)
- [ ] All 15 Cloud Functions implemented
- [ ] Error handling complete
- [ ] Logging added to critical functions
- [ ] Rate limiting configured
- [ ] PII detection working

### Frontend

- [ ] `npm run build` succeeds (no build errors)
- [ ] Bundle size reasonable (~860 KB)
- [ ] No console errors/warnings
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] All pages load without errors
- [ ] Authentication flow tested
- [ ] All pages navigate correctly
- [ ] Real-time updates working
- [ ] Draft save/restore tested
- [ ] PII detection working
- [ ] Error messages user-friendly

### Documentation

- [ ] README.md up-to-date
- [ ] GETTING_STARTED.md updated
- [ ] ARCHITECTURE_AND_IMPLEMENTATION.md current
- [ ] Seed account information documented
- [ ] Environment variables documented
- [ ] Deployment steps documented

### Database

- [ ] Firestore collections created
- [ ] Security rules deployed
- [ ] Indexes created (if needed)
- [ ] Backup plan in place
- [ ] Data migration (if applicable)

---

## 🚀 Deployment Steps

### Step 1: Build Everything

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

Verify no errors. Check output sizes are reasonable.

### Step 2: Set Active Firebase Project

```bash
firebase use setu-dev-7d593  # Production
# or
firebase use setu-staging     # Staging
```

Verify: `firebase projects:list` shows active project marked with star.

### Step 3: Deploy Backend (Cloud Functions & Rules)

```bash
cd backend

# Deploy functions and security rules (staging first!)
firebase deploy \
  --only functions,firestore \
  --project setu-staging

# If staging works, deploy to production
firebase deploy \
  --only functions,firestore \
  --project setu-dev-7d593
```

**Expected output:**
```
✓ Deploy complete!

Function URL: https://us-west2-setu-dev-7d593.cloudfunctions.net/functionName
Firestore URL: https://firestore.googleapis.com/...
```

**Verify functions deployed:**
```bash
firebase functions:list --project setu-dev-7d593
```

### Step 4: Deploy Frontend

```bash
cd frontend

# Deploy to staging first
firebase deploy \
  --only hosting:staging \
  --project setu-staging

# If staging works, deploy to production
firebase deploy \
  --only hosting \
  --project setu-dev-7d593
```

**Expected output:**
```
✓ Deploy complete!

Hosting URL: https://setu-dev-7d593.web.app
```

### Step 5: Seed Production Data (If Needed)

**⚠️ WARNING: Only for new project setup!**

```bash
# NEVER use on existing production data
cd backend

# Set emulator vars to point to staging Firestore
# (Requires specialized script - see Operations below)

npm run seed --project setu-dev-7d593
```

---

## ✅ Post-Deployment Verification

### Automated Checks

```bash
# Check functions are live
curl https://us-west2-setu-dev-7d593.cloudfunctions.net/

# Check hosting is live
curl https://setu-dev-7d593.web.app/

# Check Cloud Functions logs
gcloud functions describe functionName --project setu-dev-7d593
```

### Manual Testing

1. **Frontend Loads**
   - Visit https://setu-dev-7d593.web.app
   - Should load without errors
   - Check DevTools console for errors

2. **Authentication Works**
   - Sign up with test account
   - Verify user created in Firestore
   - Sign out and sign back in
   - Verify persistent login

3. **Cloud Functions Work**
   - Submit letter via frontend
   - Check letter appears in Firestore
   - Review letter as officer
   - Verify status updates in real-time

4. **Real-Time Updates Work**
   - Open two browser windows
   - Submit letter in first
   - See it appear in second instantly

5. **Error Handling Works**
   - Try invalid email format → Error message
   - Try empty password → Error message
   - Try PII in letter → Error message

---

## 🔧 Operations & Monitoring

### Logging & Debugging

**View Cloud Functions Logs:**
```bash
gcloud functions logs read \
  --project setu-dev-7d593 \
  --limit 50

# Real-time streaming
gcloud functions logs read \
  --project setu-dev-7d593 \
  --tail
```

**View Firestore Logs:**
```bash
gcloud logging read \
  "resource.type=cloud_firestore_database" \
  --limit 50 \
  --project setu-dev-7d593
```

**View Frontend Errors:**
- Check Firebase Hosting logs: `firebase hosting:channel:list`
- Check browser DevTools Console
- Check Sentry (if configured)

### Database Maintenance

**Backup Firestore:**
```bash
# Automated backups configured in GCP console
# Or manual export:
gcloud firestore export gs://setu-backups/$(date +%Y%m%d)
```

**View Database Size:**
```bash
gcloud firestore databases describe \
  --project setu-dev-7d593 \
  --format="value(databaseSize)"
```

### Performance Monitoring

**Cloud Functions Performance:**
1. Go to Google Cloud Console
2. Functions → Select function
3. View execution times and memory usage

**Frontend Performance:**
1. Use Lighthouse (in Chrome DevTools)
2. Check performance metrics
3. Optimize as needed

### Alerting (Optional)

Configure Cloud Monitoring alerts:
```bash
# Cloud Functions error rate
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="Cloud Functions Error Rate"

# Firestore quota exceeded
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="Firestore Quota"
```

---

## 🐛 Troubleshooting

### "Functions deployment failed"

**Cause**: Build errors or memory issues

**Solution**:
```bash
# Check build
npm run build

# Increase function memory (if needed)
firebase.json:
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs22",
    "memory": "512MB"
  }
}

# Redeploy
firebase deploy --only functions --project setu-dev-7d593
```

### "Hosting deployment failed"

**Cause**: Build errors or file size issues

**Solution**:
```bash
# Check build
npm run build

# Check dist folder exists
ls -la frontend/dist/

# Verify firebase.json points to correct hosting folder
firebase.json:
{
  "hosting": {
    "public": "frontend/dist",
    ...
  }
}

# Redeploy
firebase deploy --only hosting --project setu-dev-7d593
```

### "Cloud Functions can't reach Firestore"

**Cause**: Firestore not initialized or security rules blocking

**Solution**:
```bash
# Check Firestore is initialized
gcloud firestore collections --project setu-dev-7d593

# Check rules allow functions to write
firebase deploy --only firestore --project setu-dev-7d593

# Check function has proper permissions
gcloud functions describe functionName \
  --project setu-dev-7d593 \
  --region=us-west2
```

### "Frontend can't authenticate"

**Cause**: Firebase config mismatch or emulator still active

**Solution**:
```bash
# Check .env.production has correct credentials
# Ensure emulator env vars NOT set:
unset FIREBASE_AUTH_EMULATOR_HOST
unset FIRESTORE_EMULATOR_HOST
unset FIREBASE_FUNCTIONS_EMULATOR_HOST

# Rebuild and deploy
npm run build
firebase deploy --only hosting --project setu-dev-7d593
```

### "Real-time updates not working"

**Cause**: Firestore listener error or slow connection

**Solution**:
1. Check browser DevTools Network tab
2. Verify Firestore connection
3. Check Firestore security rules allow read
4. Clear browser cache and reload

### "Memory exceeded in Cloud Functions"

**Cause**: Function too large or memory leak

**Solution**:
```bash
# Increase memory limit
firebase.json:
{
  "functions": [{
    "source": "backend/functions",
    "codebase": "default",
    "memory": "1024MB"  // Increase from 512MB
  }]
}

# Or optimize function (remove bundled code)
```

---

## 🔄 Rollback Procedures

### Rollback Frontend (Hosted)

```bash
# List recent deployments
firebase hosting:channel:list --project setu-dev-7d593

# View release history
firebase hosting:releases:list --project setu-dev-7d593

# Rollback to previous release
firebase hosting:releases:rollback \
  --project setu-dev-7d593 \
  --release=<release-id>
```

### Rollback Cloud Functions

```bash
# List function versions
gcloud functions list --project setu-dev-7d593

# Delete problematic function (reverts to previous)
gcloud functions delete functionName \
  --region=us-west2 \
  --project setu-dev-7d593

# Redeploy previous version
git checkout <previous-commit-hash>
npm run build
firebase deploy --only functions --project setu-dev-7d593
```

### Rollback Firestore (Data)

**If data corrupted:**
```bash
# Restore from backup (via GCP console)
# Or if tracked in version control, restore manually

# Stop writes to affected collections
firebase deploy --only firestore --project setu-dev-7d593
# (Update rules to block writes while recovering)
```

---

## 📊 Deployment Checklist Template

Use for each deployment:

```
Deployment Date: _______________
Deployed By: ___________________
Environment: [ ] Staging [ ] Production

Pre-Deployment:
[ ] Code reviewed and approved
[ ] All tests passing
[ ] Build succeeds
[ ] No secrets in code
[ ] Environment variables set

Deployment:
[ ] Backend deployed successfully
[ ] Frontend deployed successfully
[ ] Firestore rules deployed
[ ] No deployment errors

Post-Deployment:
[ ] Frontend loads at correct URL
[ ] Authentication works
[ ] Can submit letter (backend working)
[ ] Can review letter (officer flow)
[ ] Real-time updates work
[ ] No console errors
[ ] Cloud Functions logs clean
[ ] Firestore shows correct data

Sign-off:
Deployed: _______________________
Verified: _______________________
Issues: ___________________________
```

---

## 🔐 Security Best Practices

1. **Never commit secrets** (API keys, credentials)
2. **Use environment variables** for all configuration
3. **Enable 2FA** on Google account
4. **Rotate API keys** regularly
5. **Review Cloud Functions logs** for suspicious activity
6. **Monitor Firestore quota** to detect abuse
7. **Keep dependencies updated** (`npm audit`)
8. **Test security rules** before deployment
9. **Use service accounts** for CI/CD (not personal accounts)
10. **Enable Cloud Audit Logs** for compliance

---

## 📞 Support & Escalation

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|-----------|
| Deployment fails | Build error | Run `npm run build` locally |
| Functions timeout | Slow operation | Increase timeout or optimize code |
| PII detection fails | Regex issue | Check patterns in pii.ts |
| Real-time slow | Network | Check network tab, verify listener |
| Auth fails | Config mismatch | Verify .env variables |

### Getting Help

1. Check cloud logs: `gcloud logging read --limit=100`
2. Check function logs: `gcloud functions logs read`
3. Check browser console: DevTools → Console
4. Check Firestore: Firebase Console → Firestore
5. Contact maintainer with error details

---

## ✅ Deployment Verification Script

```bash
#!/bin/bash
# deploy-verify.sh

PROJECT=$1
REGION=${2:-us-west2}

echo "Verifying deployment to $PROJECT..."

# Check frontend
echo -n "✓ Frontend: "
curl -s https://${PROJECT}.web.app/ | grep -q "<html>" && echo "OK" || echo "FAILED"

# Check functions
echo -n "✓ Functions: "
gcloud functions list --project=$PROJECT --region=$REGION | grep -q "functions" && echo "OK" || echo "FAILED"

# Check Firestore
echo -n "✓ Firestore: "
gcloud firestore collections --project=$PROJECT > /dev/null 2>&1 && echo "OK" || echo "FAILED"

# Check logs
echo "✓ Recent errors:"
gcloud functions logs read --project=$PROJECT --limit=5 | grep -i "error" || echo "  None found"

echo "✓ Verification complete"
```

**Usage:**
```bash
chmod +x deploy-verify.sh
./deploy-verify.sh setu-dev-7d593
```

---

**Last Updated**: November 23, 2026
**Integration Version**: 1.0 Complete
