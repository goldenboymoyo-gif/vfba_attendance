# VFBA Attendance System

A real-time attendance and training management app for Victoria Falls Boxing
Academy. Coaches see who's in the gym, who's late, and who's absent live;
boxers check in/out, set a daily goal, and track their streaks.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Firebase
(Auth + Firestore for real-time sync). Deploys to Vercel.

---

## 1. Create your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project (free "Spark" plan is enough to start).
2. **Authentication** -> Get started -> enable the **Email/Password** sign-in provider.
3. **Firestore Database** -> Create database -> start in production mode, pick a region close to Zimbabwe (e.g. `europe-west1` or `me-central1`, whichever your account offers).
4. **Project settings** (gear icon) -> General -> scroll to "Your apps" -> click the **Web** icon (`</>`) -> register an app (no need for Firebase Hosting). Copy the `firebaseConfig` values.
5. **Project settings** -> Service accounts -> **Generate new private key**. Save the downloaded file as `service-account.json` in the project root. This file is git-ignored — never commit it or share it publicly, it grants full admin access to your project.

## 2. Configure the project locally

```bash
npm install
cp .env.local.example .env.local
```

Paste the six values from step 1.4 into `.env.local`.

## 3. Deploy the security rules

Install the Firebase CLI once if you don't have it:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

(This project doesn't include `firebase.json` — either run `firebase init firestore` once to generate it and point it at `firestore.rules`, or paste the contents of `firestore.rules` directly into Firebase Console -> Firestore Database -> Rules and click Publish.)

## 4. Seed a coach + boxer roster

This creates real, logged-in-able accounts:

```bash
npm run seed
```

This creates one coach (`coach@vfba.academy`) and eight boxers, all with the
password `VFBA2026!`. Everyone should change their password after first
login in a production rollout — see the note in `src/app/settings/page.tsx`
for wiring up `sendPasswordResetEmail`.

## 5. Run it locally

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in as `coach@vfba.academy` /
`VFBA2026!` or any boxer email / `VFBA2026!`. Open two browser windows side
by side (one as coach, one as a boxer) and check in — watch the coach
dashboard update within moments, with no refresh.

## 6. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the Vercel project's **Environment Variables** settings, add the same six `NEXT_PUBLIC_FIREBASE_*` values from your `.env.local`.
4. Deploy.
5. Back in the Firebase console -> Authentication -> Settings -> **Authorized domains** -> add your new `*.vercel.app` domain (and your custom domain later, if you add one). Without this step, sign-in will fail on the live site.

That's it — the app is now live for real coaches and boxers.

---

## What's included vs. what to build next

**Included and fully working:**
- Real Firebase Authentication (email/password), role-based routing (coach vs boxer)
- Real-time boxer roster, attendance log, and notifications via Firestore `onSnapshot` — updates propagate to every open device automatically
- Check-in / check-out / daily goal (boxer), manual status correction (coach), broadcast notifications (coach), tournament attendance confirmation (boxer)
- Firestore security rules enforcing who can read/write what
- Responsive layout (mobile off-canvas sidebar → desktop persistent sidebar), dark/light mode
- Seed script for standing up real accounts

**Scaffolded simply / good next steps:**
- Adding new boxers from the UI (currently: use the seed script or Firebase console — creating auth users requires an admin-privileged environment, e.g. a Cloud Function or Next.js API route using `firebase-admin`, not the client SDK)
- Password reset flow (`sendPasswordResetEmail` — a couple of lines in `src/app/settings/page.tsx`)
- Reports/exports (PDF/Excel), attendance charts, leaderboard, gamification badges, GPS/device metadata on check-in, push notifications (would use Firebase Cloud Messaging), offline support / full PWA service worker
- Tournament creation UI for coaches (currently create via Firebase console or extend `src/app/tournaments/page.tsx`)

## Project structure

```
src/
  app/            Next.js routes (login, dashboard, attendance, boxers, tournaments, calendar, settings)
  components/     Sidebar, Topbar, dashboards, shared UI
  context/        Auth, Toast, (theme via next-themes)
  hooks/          Realtime Firestore hooks (useBoxers, useNotifications, useAttendanceLogs)
  lib/            firebase.ts (SDK init), types.ts, actions.ts (all writes)
scripts/seed.mjs  Admin SDK script to create real accounts + starter data
firestore.rules   Role-based security rules
```
