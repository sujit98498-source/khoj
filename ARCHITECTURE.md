# KHOJ Architecture & Design

## System Overview

KHOJ is a full-stack performance talent platform built with:
- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Backend**: Next.js API routes + Firebase Cloud Functions
- **Language**: TypeScript (100%)

The entire stack is production-ready with proper security, error handling, and real-time capabilities.

---

## Core Data Model

### 1. **Users Collection**
```typescript
interface KhojUser {
  uid: string                    // Firebase Auth UID
  name: string
  email: string
  xp: number                     // Total XP earned (main metric)
  rank: number                   // Computed rank (1 = highest XP)
  wins: number
  matchesPlayed: number
  skills: string[]               // Editable by user
  createdAt: string              // ISO string
  lastActive: string
}
```

**Firestore Path:** `/users/{uid}`

**Subcollections:**
- `/users/{uid}/matchHistory` — User's match results (up to 20 most recent)

---

### 2. **Tournaments Collection**
```typescript
interface Tournament {
  id: string
  title: string
  description: string
  status: 'upcoming' | 'active' | 'completed'
  maxPlayers: number
  currentPlayers: number
  participants: string[]         // Array of user UIDs
  startDate: string              // ISO string
  endDate: string
  prizeXP: number                // Bonus XP for tournament winner
  createdBy: string              // Admin UID
  createdAt: string
  category: string               // 'Web Dev', 'DSA', 'Design', etc.
}
```

**Firestore Path:** `/tournaments/{tournamentId}`

---

### 3. **Matches Collection**
```typescript
interface Match {
  id: string
  tournamentId: string           // Foreign key to tournament
  player1Id: string
  player2Id: string
  player1Name: string            // Denormalized for display
  player2Name: string
  player1Score: number
  player2Score: number
  winnerId: string | null        // null = draw
  status: 'pending' | 'active' | 'completed'
  xpAwarded: boolean             // Prevents double-awarding
  createdAt: string
  completedAt: string | null
}
```

**Firestore Path:** `/matches/{matchId}`

**Key Design**: `xpAwarded` flag ensures idempotency — even if the result submission is retried, XP is only awarded once.

---

### 4. **Notifications Collection**
```typescript
interface Notification {
  id: string
  userId: string
  type: 'win' | 'job_unlock' | 'tournament_start' | 'xp_gained' | 'rank_change'
  title: string
  message: string
  read: boolean
  createdAt: string
  metadata?: Record<string, string | number>
}
```

**Firestore Path:** `/notifications/{notificationId}`

**Real-time**: Listened to via `useNotifications()` hook. Updates instantly when created.

---

### 5. **Jobs Collection**
```typescript
interface Job {
  id: string
  title: string
  company: string
  description: string
  requiredXP: number             // XP threshold to unlock
  salary: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
  skills: string[]
  postedAt: string
  isActive: boolean
}
```

**Firestore Path:** `/jobs/{jobId}`

**Unlock Logic**: Jobs are locked until user's XP >= `requiredXP`. Checked on `/jobs` page.

---

## XP System

### Award Flow

1. **Match Result Submission**
   - User submits scores via `/matches` page
   - Calls `submitMatchResult()` in `matchService.ts`
   - Or: POST to `/api/matches/submit` for server-side authority

2. **XP Calculation (Server-Side)**
   ```
   if winner exists:
     winner += 100 XP
     loser += 10 XP
   else:
     both += 10 XP (draw)
   ```

3. **Automatic Updates**
   - User XP incremented
   - Match history entry created
   - Notification sent to winner
   - Ranks recalculated

4. **Job Unlocks**
   - Cloud Function `onXPUpdate` triggered
   - Compares new XP against all job thresholds
   - Creates notifications for newly unlocked jobs

---

## Authentication & Authorization

### Sign Up Flow
```
User → SignupForm → createUserWithEmailAndPassword()
                  → createUserDocument() [Firestore]
                  → Set auth cookie (middleware detection)
                  → Redirect to /dashboard
```

### Login Flow
```
User → LoginForm → signInWithEmailAndPassword()
                 → Set auth cookie
                 → Redirect to /dashboard
```

### Route Protection
- **Middleware** (`middleware.ts`): Checks `khoj-auth` cookie, redirects unauthenticated users to login
- **AppShell** (`AppShell.tsx`): Client-side guard using `useAuth()` hook
- **Firestore Rules**: Prevent unauthorized data access

---

## Security Architecture

### Client-Side (Trusted UI)
- Firebase Auth SDK manages session
- Real-time listeners read allowed data
- Cannot modify XP, rank, or wins

### Server-Side (Authoritative)
- `/api/matches/submit` uses **Admin SDK** (full Firestore access)
- Verifies match exists and hasn't been scored yet
- Performs atomic batch write:
  1. Update match (set `xpAwarded = true`)
  2. Update both user docs (XP, wins, stats)
  3. Create history entries
  4. Send notifications
- If any step fails, entire operation rolls back

### Firestore Security Rules
```
✓ Users can read all user profiles (for leaderboard)
✓ Users can only update their own profile (email protected)
✓ Users can join tournaments (if space available)
✓ Users can create matches (if player1)
✗ Users CANNOT directly increment XP
✗ Users CANNOT create notifications
✗ Only server can finalize match results
```

---

## Real-Time Architecture

### Live Data Flows

**1. User Stats (Dashboard)**
```
User opens dashboard
  ↓
useAuth() → Firebase Auth state
useUserLive(uid) → onSnapshot on /users/{uid}
  ↓
Match is submitted & XP awarded
  ↓
Cloud Function updates user doc
  ↓
onSnapshot listener fires
  ↓
Dashboard re-renders with new XP/rank
```

**2. Notifications**
```
Match result submitted
  ↓
API route creates notification doc
  ↓
useNotifications() onSnapshot listener fires
  ↓
Notification badge updates + panel shows new item
  ↓
User can mark read
```

**3. Tournaments**
```
User joins tournament
  ↓
Tournament doc updated (participants array, currentPlayers count)
  ↓
TournamentCard observes change via fresh getAllTournaments() call
  ↓
UI updates player count + shows "Joined" state
```

---

## Request-Response Flows

### Create & Submit a Match

```
1. User is on /matches page
   ├─ Lists their tournaments via getUserTournaments()
   ├─ Shows all their matches via getUserMatches()

2. User fills CreateMatchForm
   ├─ Selects tournament
   ├─ Enters opponent name + UID
   ├─ Clicks "Create Match"

3. createMatch() is called
   ├─ Creates doc in /matches with status='pending'
   ├─ Both players see it in /matches?filter=pending

4. User clicks match to select it
   ├─ Shows MatchResultForm with score inputs

5. User enters scores
   ├─ Player1Score = 85
   ├─ Player2Score = 70
   ├─ Clicks "Submit Result & Award XP"

6. submitMatchResult() OR POST /api/matches/submit
   ├─ Determines winner (85 > 70 → Player1 wins)
   ├─ Updates match doc: status='completed', xpAwarded=true
   ├─ Awards XP: player1 +100, player2 +10
   ├─ Creates 2 match history entries
   ├─ Creates win notification
   ├─ Recalculates all ranks

7. Dashboard, Leaderboard, Profile auto-update
   ├─ useUserLive() listeners fire
   ├─ XP bars animate
   ├─ Rank changes reflect
```

---

## Cloud Functions (Optional but Recommended)

Deploy to Firebase for production reliability:

```typescript
// functions/src/index.ts

// Trigger 1: onMatchComplete
// Fires when match status → 'completed'
// (If using client-side matchService, this is redundant)
// (If using API route only, enables secondary validation)

// Trigger 2: onXPUpdate
// Fires when user.xp changes
// Unlocks jobs, sends notifications

// Trigger 3: dailyRankRecalculation
// Runs daily at midnight UTC
// Safety net for rank consistency
```

---

## Component Hierarchy

```
AppShell (auth guard)
  ├─ Sidebar
  │   ├─ Logo
  │   ├─ User mini-profile
  │   │   └─ XPBar (animated level)
  │   ├─ Navigation
  │   └─ Logout button
  │
  └─ Main content
      ├─ PageHeader
      ├─ Page-specific content
      │   ├─ TournamentCard (join button)
      │   ├─ MatchCard (result display)
      │   ├─ MatchResultForm (submit scores)
      │   ├─ LeaderboardTable (ranked users)
      │   ├─ JobCard (lock/unlock state)
      │   └─ PortfolioCard (stats + history)
      └─ NotificationPanel (sidebar sticky)
```

---

## Styling Philosophy

**Design System**: Dark/techy minimalist with orange accent

- **Colors**:
  - `khoj-bg`: `#0A0A0F` (almost black)
  - `khoj-accent`: `#FF4D00` (vibrant orange)
  - `khoj-gold`: `#FFB800` (rewards/wins)
  - `khoj-teal`: `#00D4AA` (success/unlocked)

- **Typography**:
  - **Display**: Syne (geometric, techy)
  - **Body**: DM Sans (clean, modern)
  - **Mono**: JetBrains Mono (numbers/IDs)

- **Spacing**: 4px base unit (Tailwind default)

- **Animations**: Subtle, purposeful
  - `.animate-slide-up`: Page transitions
  - `.animate-glow`: Accent highlights
  - `.animate-pulse-slow`: Status indicators

---

## Error Handling

### Client-Side
- Form validation before submission
- Toast notifications (react-hot-toast) for success/error
- Try-catch around async service calls
- Fallback UI for missing data

### Server-Side
- Input validation on API routes
- Firebase errors caught and transformed
- Batch operations are atomic (all or nothing)
- Admin SDK operations have explicit error logs

### User-Facing
- Empty states for "no data" scenarios
- Error boundary (`error.tsx`) for unexpected crashes
- 404 page for missing routes (`not-found.tsx`)

---

## Performance Optimizations

1. **Code Splitting**: Each page is lazy-loaded
2. **Image Optimization**: Firestore URLs via Next.js Image (when applicable)
3. **Real-Time Efficiency**: onSnapshot listeners are scoped to single docs/queries
4. **Caching**: Service layer functions are called fresh; consider SWR for next iteration
5. **Query Indexes**: Firestore composite indexes created for common queries
6. **Atomic Writes**: Batch operations reduce network round-trips

---

## Testing Checklist

- [ ] Sign up → Create account with email/password
- [ ] Login → Sign in with existing account
- [ ] Browse tournaments → See all 4 sample tournaments
- [ ] Join tournament → Verify participants array updates
- [ ] Create match → Submit match between two users
- [ ] Submit result → Award XP, check XP bar animates
- [ ] View leaderboard → Correct ranking by XP
- [ ] View profile → See match history + skills
- [ ] Edit skills → Add/remove tags
- [ ] Check jobs → Some locked, some unlocked based on XP
- [ ] View notifications → See wins + job unlocks
- [ ] Logout → Session cleared, redirected to login

---

## Deployment Checklist

- [ ] Remove `/api/seed` route (or add auth)
- [ ] Set Firestore to **Production Mode**
- [ ] Deploy Firestore rules: `firebase deploy --only firestore`
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Deploy to Vercel: `vercel`
- [ ] Test live: sign up, create match, verify XP updates
- [ ] Monitor: Check Firebase logs for errors

---

## Future Enhancements

### Phase 2: Team Competitions
```
- Teams of 2-5
- Team XP pool
- Team leaderboard
- Team tournaments
```

### Phase 3: Recruiter Dashboard
```
- Search talent by XP/skills
- View portfolios
- Send offers
- Analytics on placements
```

### Phase 4: Monetization
```
- Premium tournaments ($)
- Prize pools
- Recruiting listings (company posts jobs)
- Revenue split with creators
```

---

**Everything is modular and designed to scale.** Each service is independent, components are reusable, and the data model supports growth up to millions of users.
