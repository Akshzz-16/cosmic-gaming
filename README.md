# Cosmic Gaming — PS4 Café Session Manager

Cloud-connected session timer for the café counter (Windows `.exe`) plus a web dashboard you
can open from anywhere to watch sessions live and track the 60/40 revenue split.

```
shared/      shared types, revenue split math, formatters, document mappers
desktop/     Electron + React counter app → builds to Windows installer (.exe)
dashboard/   React web dashboard → your remote access (Firebase Hosting)
firestore.rules
firebase.json
```

## How it works

- The counter app has **no login** — it signs in anonymously and writes to Firestore.
- You log into the **dashboard** with an email/password account you create in Firebase.
- When the owner presses START, `startedAt` / `endsAt` are written to Firestore and appear on
  your dashboard **instantly** (live listeners — no refresh).
- `+30` / `+60` update `endsAt` and append a timeline event immediately.
- Sessions are picked in **hours** (1 hr / 2 hr) and at `00:00` the session auto-completes.
- Amount = `hourlyRate × bookedSessionHours` — the **full booked session** (duration +
  extensions) is billed even if ended early, split **60% café owner / 40% you** automatically.
- `endsAt` is an **absolute timestamp**, so restarting the app or the PC resumes the countdown.
- The hourly rate can **only** be changed from the dashboard (enforced by Firestore rules).

## 1. Prerequisites

- Node.js 20+ (this repo was built with Node 24)
- A free Google account (for Firebase)
- Windows machine (for building the `.exe`)

## 2. Install dependencies

```powershell
npm install
```

## 3. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** (Analytics optional/off).
2. **Project settings → General → Your apps → Web (`</>`)** → register an app
   (no hosting needed at this step) → copy the `firebaseConfig` values.
3. Fill in the env files:
   - copy `desktop\.env.example` → `desktop\.env`
   - copy `dashboard\.env.example` → `dashboard\.env`
   - paste the config values into both.
4. **Authentication → Sign-in method** → enable:
   - **Anonymous** (used by the counter `.exe`)
   - **Email/Password** (used by your dashboard login)
5. **Firestore Database → Create database** → start in **production mode**, pick a nearby region.
6. Create your dashboard login: **Authentication → Users → Add user** → email + password.
   > In Authentication → Settings, turn **off** "Enable create (sign-up)" so nobody can self-register.
7. Deploy the security rules (either way):

   **Option A — Firebase CLI:**
   ```powershell
   npm i -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules
   ```

   **Option B — manual:** Firestore → Rules → paste the contents of `firestore.rules` → Publish.

## 4. Run in development

```powershell
# counter app (Electron window opens)
npm run dev:desktop

# dashboard (http://localhost:5173)
npm run dev:dashboard
```

First run:

1. Open the dashboard → sign in with the account from step 3.6 → **Settings** → create your
   café (name + hourly rate). This creates the café document the counter app syncs with.
2. Open the counter app → it picks up the café automatically → choose a duration → press the
   big **START** circle.

The counter app uses the **first café** created. If you later have multiple cafés, pin each
machine by setting `VITE_CAFE_ID=<cafe-doc-id>` in its `.env`.

## 5. Build the Windows installer

> `.env` values are baked into the bundle at build time — fill in `desktop\.env` **before**
> building.

```powershell
npm run package:desktop
```

Output: `desktop\release\Cosmic Gaming Counter Setup.exe` (NSIS installer).
Copy it to the counter PC and install.

## 6. Deploy your dashboard (access from anywhere)

```powershell
npm i -g firebase-tools   # if you haven't
firebase login
firebase use <your-project-id>
firebase deploy --only hosting
```

Your dashboard URL: `https://<project-id>.web.app`
(Any static host works too — just build with `npm run build` and upload `dashboard\dist`.)

## What the dashboard shows

- **Overview** — live active-session panel (started / ends / session amount, updates the
  instant the counter acts), today + this-month stats, your 40% share vs café's 60%.
- **Sessions** — date-range history with an expandable timeline per session:
  started → each `+30/+60` with the time it was pressed → ended, plus rate snapshot,
  machine timestamps and Firebase server timestamp (audit), and a two-step **Delete** button
  to remove mistaken entries (dashboard only — the `.exe` cannot delete).
- **Settings** — hourly rate editor (the only place it can be changed) + café creation.

## Counter app behavior

| Event | What happens |
|---|---|
| START pressed | Duration (1 hr / 2 hr) written to Firestore, countdown ring begins |
| 5:00 remaining | Windows toast notification + 3-beep alert |
| `+30` / `+60` | `endsAt` extended, event recorded, dashboard updates live |
| 00:00 | Auto-ends, chime plays, amount + split recorded, returns to START |
| App/PC restart | Countdown resumes from the absolute `endsAt` in Firestore |
| Internet drops | Countdown keeps running locally; queued writes sync on reconnect (OFFLINE badge shown) |
| Early "End session now" | Bills the **full booked session** (duration + extensions), not minutes used |

## Scripts

| Command | Description |
|---|---|
| `npm run dev:desktop` | Counter app in dev mode (hot reload) |
| `npm run dev:dashboard` | Dashboard in dev mode |
| `npm run typecheck` | TypeScript checks for all workspaces |
| `npm run build` | Production build of desktop renderer + dashboard |
| `npm run package:desktop` | Build + create the Windows NSIS installer |
| `node scripts/smoke-test.mjs` | 14 live checks: auth, Firestore rules, session lifecycle (see below) |

## Smoke test

With `dashboard/.env` filled in (step 3 above) plus two extra keys — either as
environment variables or appended to the gitignored `dashboard/.env`:

```
CG_DASH_EMAIL=your-dashboard-login
CG_DASH_PASSWORD=your-dashboard-password
```

run `node scripts/smoke-test.mjs` from the repo root. It signs in both identities
(anonymous counter + password dashboard) against the **live** project and verifies rate
protection, the start → extend → complete flow, and delete permissions. Credentials are
never stored in the repo.

## Security notes

- Firestore rules: the counter app can only create/update **session documents** with a valid
  shape; it can never change `hourlyRate` (dashboard-only, password users only).
- Sessions can only be deleted from the **dashboard** (password users) — the counter app can
  never delete them. Deleting a session updates the `.exe` live.
- The `.exe` ships with the Firebase web config — that's normal and safe by itself; the rules
  above are what actually protect the data. For extra hardening you can enable **Firebase App
  Check** later.
