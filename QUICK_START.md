# KHOJ — Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Clone & Install

```bash
cd khoj
npm install
```

### Step 2: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a **new project**
3. Enable these services:
   - **Firestore Database** (Production mode)
   - **Authentication** → Email/Password
   - **Cloud Functions** (requires Blaze plan)

### Step 3: Get Firebase Credentials

**For Client SDK (public):**
- Go to **Project Settings** → **Your apps** → **Web**
- Copy these values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**For Admin SDK (server-only):**
- Go to **Project Settings** → **Service Accounts** → **Generate new private key**
- Copy:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Step 4: Create `.env.local`

```bash
cp .env.local.example .env.local
# Fill in all 9 values from Step 3
```

Add AI variables (server-only):

```env
OPENAI_API_KEY=your_openai_api_key
KHOJ_AI_MODEL=gpt-5-mini
```

KHOJ AI uses the local Markdown knowledge base by default. Rebuild the optional local retrieval index after editing `knowledge/khoj/*.md`:

```bash
npm run ai:ingest:khoj
```

### Step 5: Run Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Step 6: Create Test Accounts

1. Click **"Create Account"**
2. Sign up with test email: `test1@example.com` / `password123`
3. Create a second account: `test2@example.com` / `password123`

### Step 7: Seed Sample Data

```bash
# While server is running:
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 4 sample tournaments
- 5 job listings
- Ready to start competing!

### Step 8: Deploy Firestore Rules (Important!)

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools
firebase login
firebase use your-project-id

# Deploy security rules
firebase deploy --only firestore
```

---

## 🎮 First Match Flow

1. **Sign up** → Create account
2. **Tournaments** → Browse & join "Web Dev Championship"
3. **Matches** → Create match vs another player
4. **Matches** → Submit scores (awards XP automatically)
5. **Leaderboard** → See your rank climb
6. **Profile** → View portfolio + add skills
7. **Jobs** → See unlocked job opportunities

---

## 📊 XP Breakdown

| Action | XP |
|--------|-----|
| Match Win | +100 |
| Match Loss | +10 |
| Draw | +10 each |

After reaching certain XP thresholds, jobs unlock:
- 100 XP → Junior Frontend Developer
- 300 XP → Full-Stack Engineer
- 600 XP → Senior Software Engineer
- 1,000 XP → Engineering Manager
- 2,000 XP → CTO

---

## 🏗 Project Structure

```
khoj/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── services/               # Firestore data access
├── hooks/                  # Custom React hooks
├── lib/                    # Firebase config + types
├── functions/              # Cloud Functions (optional)
├── firestore.rules         # Security rules
└── README.md               # Full documentation
```

---

## 🚀 Next: Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

1. Select "Next.js"
2. Add env vars from `.env.local`
3. Done! Your app is live.

### Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

---

## ❓ Common Issues

### "No module named firebase"
```bash
npm install firebase firebase-admin
```

### "API key invalid"
- Check `.env.local` has all 9 variables
- Restart dev server: `npm run dev`

### "KHOJ AI always returns mock"
- Confirm `OPENAI_API_KEY` is set in project-root `.env.local`
- Restart Next.js server after editing environment variables
- Confirm Firebase Admin env vars are set so the API route can verify the signed-in user token

### "KHOJ AI sources are stale"
- Update the Markdown docs in `knowledge/khoj/`
- Run `npm run ai:ingest:khoj` to regenerate `knowledge/khoj-index.json`

### "Firestore rules blocked"
- Run: `firebase deploy --only firestore`
- Wait 30 seconds for rules to apply

### "Cloud Functions not deploying"
- Verify Firestore is in **Production Mode** (not test mode)
- Ensure project has **Blaze plan** enabled

---

## 📱 Features Available Now

✅ Sign up / Login
✅ Browse tournaments
✅ Join tournaments  
✅ Create & submit matches
✅ Real-time XP updates
✅ Leaderboard
✅ Job unlock system
✅ Portfolio with match history
✅ Notifications
✅ Skill editor
✅ Admin tournament creation
✅ KHOJ AI assistant with OpenAI or mock fallback
✅ Startup Room AI Builder chat with room context

---

## 🛣 Coming Soon (Post-MVP)

- [ ] Recruiter dashboard
- [ ] Team tournaments
- [ ] Payment integration (premium tournaments)
- [ ] OAuth (Google, GitHub)
- [ ] Mobile app
- [ ] Streaming match results

---

## 📖 More Docs

- See **README.md** for full architecture & security details
- Check **firestore.rules** for data access rules
- Review **lib/types.ts** for all data schemas

---

**Questions?** Check the code comments or open an issue in your fork!
