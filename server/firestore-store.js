/* =========================================================
   FIRESTORE STORE
   Replaces the old old file-based database with Firestore state document,
   Firestore credentials document) with two Firestore documents:
     nbh/state        -> { users, posts, social, rev }
     nbh/credentials  -> { "<username-lowercase>": "<bcrypt hash>" }

   Same shape as before, so server.js's route logic barely
   had to change — just await these calls instead of calling
   fs.readFileSync/writeFileSync synchronously.

   Auth to Firebase, one of:
   - FIREBASE_SERVICE_ACCOUNT env var: the ENTIRE service
     account JSON, pasted in as one line (works on any host,
     including ones like Render where you can't upload a file).
   - GOOGLE_APPLICATION_CREDENTIALS env var: a path to the
     service account JSON file on disk (handy for local dev).
   See ../README.md for how to get this file from Firebase.

   Which database: set FIRESTORE_DATABASE_ID to whatever
   Database ID you typed when creating it in the Firebase
   console (e.g. "nbh-db"). If you managed to create the
   special (default) database instead, leave this unset.
========================================================= */

const admin = require("firebase-admin");
const { getFirestore, initializeFirestore } = require("firebase-admin/firestore");

let db = null;

// Firestore rejects `undefined` anywhere in a document. This strips it from
// every nested object/array before ANY write, whatever code path built the data.
function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(item => (item === undefined ? null : removeUndefined(item)));
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const cleaned = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) cleaned[key] = removeUndefined(item);
    }
    return cleaned;
  }
  return value;
}

function init() {
  if (db) return db;

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is set but isn't valid JSON. Paste the whole service account file's contents as one line.");
    }
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT (the full service account JSON, as one line) " +
      "or GOOGLE_APPLICATION_CREDENTIALS (a path to that JSON file) in your environment before starting the server. " +
      "See README.md."
    );
  }

  const app = admin.initializeApp({ credential });
  const databaseId = process.env.FIRESTORE_DATABASE_ID; // undefined -> the (default) database
  const settings = { ignoreUndefinedProperties: true };
  try {
    // Settings are applied when the instance is created (the safe way).
    db = databaseId ? initializeFirestore(app, settings, databaseId) : initializeFirestore(app, settings);
  } catch (err) {
    console.warn("initializeFirestore failed, falling back to getFirestore:", err.message);
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    try { db.settings(settings); } catch (_) { /* already initialized */ }
  }
  console.log("[firestore] ready (ignoreUndefinedProperties on)");
  return db;
}

const NBH = () => init().collection("nbh");
const STATE_DOC = () => NBH().doc("state");
const CREDENTIALS_DOC = () => NBH().doc("credentials");

async function readState() {
  const snap = await STATE_DOC().get();
  const state = snap.exists ? snap.data() : { users: [], posts: [], social: {}, rev: 0 };
  if (!Array.isArray(state.users)) state.users = [];
  if (!Array.isArray(state.posts)) state.posts = [];
  if (!state.social || typeof state.social !== "object") state.social = {};
  return state;
}

async function writeState(obj) {
  obj.rev = (Number(obj.rev) || 0) + 1; // revision counter: lets us detect out-of-date saves
  await STATE_DOC().set(removeUndefined(obj));
  return obj;
}


async function writeStateIfRevision(obj, expectedRev) {
  const database = STATE_DOC();
  const transactionResult = await init().runTransaction(async tx => {
    const snap = await tx.get(database);
    const current = snap.exists ? snap.data() : { rev: 0 };
    const currentRev = Number(current.rev) || 0;
    if (currentRev !== Number(expectedRev)) return false;
    const next = removeUndefined({ ...obj, rev: currentRev + 1 });
    tx.set(database, next);
    return true;
  });
  return transactionResult;
}

async function readCredentials() {
  const snap = await CREDENTIALS_DOC().get();
  return snap.exists ? snap.data() : {};
}

async function writeCredentials(obj) {
  await CREDENTIALS_DOC().set(removeUndefined(obj));
}

// Runs once, only the very first time the server ever connects to this
// Firestore project (i.e. the "nbh/credentials" doc doesn't exist yet).
// After that it's a no-op on every subsequent boot.
async function ensureSeeded(defaultStateObj, seedCredentials) {
  const credSnap = await CREDENTIALS_DOC().get();
  if (!credSnap.exists) {
    await CREDENTIALS_DOC().set(removeUndefined(seedCredentials));
    console.log(`[seed] Created Firestore "nbh/credentials" with ${Object.keys(seedCredentials).length} accounts.`);
  }
  const stateSnap = await STATE_DOC().get();
  if (!stateSnap.exists) {
    await STATE_DOC().set(removeUndefined({ ...defaultStateObj, rev: 0 }));
    console.log('[seed] Created Firestore "nbh/state".');
  }
}

module.exports = { readState, writeState, writeStateIfRevision, readCredentials, writeCredentials, ensureSeeded };
