import { existsSync, readFileSync } from 'node:fs';

/* Config + credentials come from gitignored sources — never hardcode them:
   - Firebase web config: dashboard/.env (copied from dashboard/.env.example)
   - Dashboard login: CG_DASH_EMAIL / CG_DASH_PASSWORD env vars, or the same
     keys appended to dashboard/.env */
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}
const env = { ...loadEnvFile('dashboard/.env'), ...process.env };

function need(value, name, hint) {
  if (!value) {
    console.error(`Missing ${name} — ${hint}`);
    process.exit(1);
  }
  return value;
}

const PROJECT = need(env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID', 'copy dashboard/.env.example to dashboard/.env and fill it in');
const CAFE_ID = 'main-cafe';
const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  appId: env.VITE_FIREBASE_APP_ID,
};
const DASH_EMAIL = need(env.CG_DASH_EMAIL, 'CG_DASH_EMAIL', 'set it in dashboard/.env or as an environment variable');
const DASH_PASSWORD = need(env.CG_DASH_PASSWORD, 'CG_DASH_PASSWORD', 'set it in dashboard/.env or as an environment variable');

const tokenRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.apiKey}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DASH_EMAIL, password: DASH_PASSWORD, returnSecureToken: true }),
  },
);
if (!tokenRes.ok) {
  console.error('Dashboard login failed:', JSON.stringify((await tokenRes.json()).error ?? {}));
  process.exit(1);
}
const { idToken: ID_TOKEN } = await tokenRes.json();

let failures = 0;
function check(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

/* ---------- 1. create the café document (dashboard identity) ---------- */
{
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/cafes?documentId=${CAFE_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${ID_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: {
          name: { stringValue: 'Cosmic Gaming Café' },
          hourlyRate: { integerValue: '100' },
          createdAt: { integerValue: String(Date.now()) },
        },
      }),
    },
  );
  const body = await res.json();
  const already = body?.error?.status === 'ALREADY_EXISTS' || body?.error?.status === 'FAILED_PRECONDITION';
  check(
    'café document created (dashboard identity)',
    res.ok || already,
    res.ok ? CAFE_ID : already ? 'already existed' : JSON.stringify(body).slice(0, 300),
  );
}

/* ---------- 2. real Firebase JS SDK flow (exactly like the apps) ---------- */
const { initializeApp } = await import('firebase/app');
const { getAuth, signInAnonymously, signInWithEmailAndPassword } = await import('firebase/auth');
const {
  getFirestore, doc, getDoc, addDoc, collection, updateDoc, deleteDoc, setDoc,
  arrayUnion, query, where, getDocs, limit,
} = await import('firebase/firestore');

const app = initializeApp(CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// anonymous = counter machine
const anon = await signInAnonymously(auth);
check('counter app signs in anonymously', !!anon.user);

// read café + rate
const cafeSnap = await getDoc(doc(db, 'cafes', CAFE_ID));
check('counter can read café + rate', cafeSnap.exists() && cafeSnap.data().hourlyRate === 100,
  `rate=${cafeSnap.exists() ? cafeSnap.data().hourlyRate : 'missing'}`);

// CORE PROMISE: anonymous identity must NOT be able to change the rate
let rateBlocked = false;
try {
  await setDoc(doc(db, 'cafes', CAFE_ID), { hourlyRate: 999 }, { merge: true });
} catch {
  rateBlocked = true;
}
check('counter CANNOT change hourly rate (rules)', rateBlocked);

// start session (30 min)
const now = Date.now();
const sessRef = await addDoc(collection(db, 'cafes', CAFE_ID, 'sessions'), {
  status: 'active',
  durationMinutes: 30,
  extensions: [],
  startedAt: now,
  endsAt: now + 30 * 60000,
  serverRecordedAt: null,
  startDate: new Date(now).toLocaleDateString('en-CA'),
  rateAtStart: 100,
  events: [{ type: 'started', at: now }],
});
check('session created (START button)', !!sessRef.id, sessRef.id);

// +30 extension
await updateDoc(sessRef, {
  endsAt: now + 60 * 60000,
  extensions: arrayUnion(30),
  events: arrayUnion({ type: 'extended', at: now + 1000, minutesAdded: 30 }),
});
let s = (await getDoc(sessRef)).data();
check('+30 min extension recorded', s.extensions.length === 1 && s.endsAt === now + 60 * 60000,
  `extensions=[${s.extensions}]`);

// complete the session (60 billed minutes × ₹100/hr = ₹100)
const completedAt = now + 2000;
await updateDoc(sessRef, {
  status: 'completed',
  completedAt,
  billedMinutes: 60,
  amount: 100,
  events: arrayUnion({ type: 'completed', at: completedAt }),
});
s = (await getDoc(sessRef)).data();
check('session completed with amount + timeline',
  s.status === 'completed' && s.amount === 100 && s.events.length === 3,
  `amount=₹${s.amount}, events=${s.events.length}`);

// counter app (anonymous) must NOT be able to delete
let deleteBlocked = false;
try {
  await deleteDoc(sessRef);
} catch {
  deleteBlocked = true;
}
check('counter app cannot delete sessions', deleteBlocked);

/* ---------- 3. dashboard identity reads the same data ---------- */
await signInWithEmailAndPassword(auth, DASH_EMAIL, DASH_PASSWORD);
const activeQ = await getDocs(query(collection(db, 'cafes', CAFE_ID, 'sessions'), where('status', '==', 'active'), limit(1)));
check('dashboard sees zero active sessions', activeQ.empty);

const allQ = await getDocs(query(collection(db, 'cafes', CAFE_ID, 'sessions'), where('startDate', '>=', '2000-01-01'), limit(50)));
check('dashboard reads session history', allQ.size >= 1, `${allQ.size} session(s)`);

// dashboard CAN change the rate
await setDoc(doc(db, 'cafes', CAFE_ID), { hourlyRate: 100 }, { merge: true });
const rateNow = (await getDoc(doc(db, 'cafes', CAFE_ID))).data().hourlyRate;
check('dashboard can set hourly rate', rateNow === 100, `rate=₹${rateNow}`);

// dashboard CAN delete a session (mistake cleanup)
try {
  await deleteDoc(sessRef);
  check('dashboard can delete a session', !(await getDoc(sessRef)).exists());
} catch (e) {
  check('dashboard can delete a session', false, String(e).slice(0, 200));
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
