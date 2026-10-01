/* =========================================================
   NEA'S BOARDING HORSE — BACKEND SERVER
   Express + Firestore + Cloudinary.

   What this server does:
   - Owns real user credentials (bcrypt-hashed, never sent
     to the browser).
   - Owns the shared app data (users' public profiles, posts,
     comments, notifications) in Firestore state document, so every
     member who logs in sees the SAME shared community feed
     instead of a private-per-browser copy.
   - Issues an httpOnly session cookie (JWT) on login so the
     frontend never has to store or check passwords itself.

   Run locally:
     cd server
     npm install
     npm start
   Then open http://localhost:3000

   See ../README.md for deployment + admin instructions.
========================================================= */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v2: cloudinary } = require("cloudinary");

// ---------------------------------------------------------
// Load a .env file if there is one (server/.env or the project
// root), so "copy .env.example to .env" actually works. Real
// environment variables always win, and blank values are ignored.
// ---------------------------------------------------------
(function loadEnvFile() {
  for (const file of [path.join(__dirname, ".env"), path.join(__dirname, "..", ".env")]) {
    if (!fs.existsSync(file)) continue;
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) return;
      let value = m[2];
      if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
      if (value !== "" && process.env[m[1]] === undefined) process.env[m[1]] = value;
    });
    break;
  }
})();

const DATA_DIR = path.join(__dirname, "data");
// Only the local-disk upload fallback (no Cloudinary configured) still uses
// the filesystem — users/posts/social/credentials now live in Firestore.
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const COOKIE_NAME = "nbh_session";
const SESSION_DAYS = 30;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// ---------------------------------------------------------
// JWT secret: MUST be set via env var in production. A random
// one is generated for local/dev use so it "just works" out
// of the box, but it changes every restart (logging everyone
// out) unless you set JWT_SECRET yourself.
// ---------------------------------------------------------
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString("hex");
  console.warn(
    "\n[WARN] No JWT_SECRET set in the environment.\n" +
    "       Using a random one for this run only — every restart will log everyone out.\n" +
    "       Set a permanent JWT_SECRET in your hosting provider's environment variables before going live.\n"
  );
}

// ---------------------------------------------------------
// Cloud media storage (Cloudinary)
// Photos/videos are uploaded here instead of being embedded
// as base64 inside Firestore — keeps the database
// small and keeps large media off the Render server itself.
// ---------------------------------------------------------
const CLOUDINARY_CONFIGURED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
} else {
  console.warn(
    "\n[WARN] Cloudinary env vars are not set (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).\n" +
    "       Uploads will be saved on this server's own disk instead. That is fine for testing, but set\n" +
    "       Cloudinary before going live because many hosts wipe the disk on every deploy. See .env.example.\n"
  );
}

// ---------------------------------------------------------
// Seed data — used only the FIRST time the server runs
// (i.e. when Firestore credentials document doesn't exist yet).
// After that, everything lives in the JSON files on disk
// and this is ignored.
// ---------------------------------------------------------
function seedPassword(envKey) {
  return process.env[envKey] || crypto.randomBytes(12).toString("base64url");
}

const SEED_MEMBERS = [
  { username: "Jaypee@nbh", password: seedPassword("SEED_PASSWORD_JAYPEE"), name: "Jaypee", bio: "Member of Nea's Boarding Horse.", avatar: "J" },
  { username: "Nea@nbh",    password: seedPassword("SEED_PASSWORD_NEA"),    name: "Nea",    bio: "Member of Nea's Boarding Horse.", avatar: "N" },
  { username: "Jasmin@nbh",password: seedPassword("SEED_PASSWORD_JASMIN"),name: "Jasmin",bio: "Member of Nea's Boarding Horse.", avatar: "J" },
  { username: "Joshua@nbh", password: seedPassword("SEED_PASSWORD_JOSHUA"), name: "Joshua", bio: "Member of Nea's Boarding Horse.", avatar: "J" },
  { username: "Bjay@nbh",   password: seedPassword("SEED_PASSWORD_BJAY"),   name: "Bjay",   bio: "Member of Nea's Boarding Horse.", avatar: "B" },
  { username: "Axel@nbh",   password: seedPassword("SEED_PASSWORD_AXEL"),   name: "Axel",   bio: "Member of Nea's Boarding Horse.", avatar: "A" }
];

if (NODE_ENV !== "production") {
  const generatedSeed = SEED_MEMBERS.filter(m => !process.env[{
    "Jaypee@nbh":"SEED_PASSWORD_JAYPEE", "Nea@nbh":"SEED_PASSWORD_NEA",
    "Jasmin@nbh":"SEED_PASSWORD_JASMIN", "Joshua@nbh":"SEED_PASSWORD_JOSHUA",
    "Bjay@nbh":"SEED_PASSWORD_BJAY", "Axel@nbh":"SEED_PASSWORD_AXEL"
  }[m.username]]);
  if (generatedSeed.length) {
    console.warn("[DEV] Generated first-seed member passwords:");
    generatedSeed.forEach(m => console.warn(`       ${m.username}: ${m.password}`));
  }
}

if (NODE_ENV === "production") {
  const requiredSeedVars = [
    "SEED_PASSWORD_JAYPEE", "SEED_PASSWORD_NEA", "SEED_PASSWORD_JASMIN",
    "SEED_PASSWORD_JOSHUA", "SEED_PASSWORD_BJAY", "SEED_PASSWORD_AXEL"
  ];
  const missingSeed = requiredSeedVars.filter(key => !process.env[key]);
  if (missingSeed.length) {
    throw new Error(`Missing production seed password environment variables: ${missingSeed.join(", ")}`);
  }
}

// The old frontend let anyone in by typing "admin" as the
// username with NO password check at all — that was a real
// security hole. It's fixed here: admin is a normal seeded
// account that requires a real password like everyone else.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");
if (!process.env.ADMIN_PASSWORD && NODE_ENV !== "production") {
  console.warn(`[DEV] Generated admin password for first seed: ${ADMIN_PASSWORD}`);
}
if (!process.env.ADMIN_PASSWORD && NODE_ENV === "production") {
  throw new Error("ADMIN_PASSWORD must be set in production.");
}
SEED_MEMBERS.push({
  username: "admin",
  password: ADMIN_PASSWORD,
  name: "Admin",
  bio: "Site administrator.",
  avatar: "A",
  isAdmin: true
});

function defaultState() {
  return {
    users: SEED_MEMBERS.map(m => ({
      username: m.username,
      name: m.name,
      bio: m.bio,
      avatar: m.avatar,
      avatarImage: null,
      bannerImage: null,
      isAdmin: !!m.isAdmin
    })),
    posts: [
      {
        id: 1,
        name: "Nea",
        username: "Nea@nbh",
        avatar: "N",
        text: "Grateful for the little things today \u2728\nA productive day and good vibes.",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80",
        // reactions/shares are recomputed from real members' own actions
        // every time anyone saves (see the /api/state handler below), so a
        // decorative starting number here would just vanish on the first
        // real reaction/repost. Start the demo post at zero — real numbers
        // appear as soon as members actually use it.
        reactions: {},
        comments: 0,
        commentsList: [],
        shares: 0,
        time: "2h ago"
      }
    ],
    social: {}
  };
}

function defaultSocialFor() {
  return {
    notifications: [],
    albums: [],
    reposts: [],
    // Per-member state that must NEVER be a single field on a shared post
    // object (that was the old bug: one member's reaction/save overwrote
    // what every other member saw). savedPostIds is this member's own
    // bookmarks; myReactions maps postId -> the emoji THIS member picked.
    savedPostIds: [],
    myReactions: {}
  };
}

// ---------------------------------------------------------
// Database: Firestore (see firestore-store.js).
// readState/writeState/readCredentials/writeCredentials are
// all ASYNC now (Firestore is a network call, unlike the old
// synchronous file reads/writes) — every route below
// that touches them is an async handler wrapped in ah().
// ---------------------------------------------------------
const store = require("./firestore-store");
const { readState, writeState, readCredentials, writeCredentials } = store;

function findCredentialKey(credentials, username) {
  const target = String(username || "").trim().toLowerCase();
  return Object.keys(credentials).find(k => k.toLowerCase() === target) || null;
}

// Wrap an async Express handler so a rejected promise (e.g. a Firestore
// hiccup) sends a 500 instead of leaving the request hanging forever.
function ah(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(err => {
      console.error("[route error]", err);
      if (!res.headersSent) res.status(500).json({ error: "Something went wrong. Please try again." });
    });
  };
}

// ---------------------------------------------------------
// App setup
// ---------------------------------------------------------
const app = express();
app.set("trust proxy", 1); // needed on Render/Railway/Heroku-style hosts so secure cookies work
app.use(express.json({ limit: "25mb" })); // media is sent to this server as base64 before being forwarded to Cloudinary
app.use(cookieParser());
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not logged in." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.username = payload.username;
  } catch (err) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  readState().then(state => {
    const user = state.users.find(u => String(u.username).toLowerCase() === String(req.username).toLowerCase());
    if (!user) return res.status(401).json({ error: "Account no longer exists." });
    if (user.disabled) return res.status(403).json({ error: "This account has been disabled by an administrator." });
    req.user = user;
    req.isAdmin = !!user.isAdmin;
    next();
  }).catch(err => {
    console.error("[auth error]", err);
    if (!res.headersSent) res.status(500).json({ error: "Could not verify your session." });
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.isAdmin) return res.status(403).json({ error: "Admin access required." });
    next();
  });
}

function setSessionCookie(res, username) {
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

// ---------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------

// Slow down password guessing: 8 wrong tries per account (per address)
// in 15 minutes, then a short lock-out. A correct login clears the count.
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts) if (v.resetAt <= now) loginAttempts.delete(k);
}, 10 * 60 * 1000).unref();

function loginLimiter(req, res, next) {
  const now = Date.now();
  const key = (req.ip || "unknown") + "|" + String((req.body && req.body.username) || "").toLowerCase();
  let entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, entry);
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    const minutes = Math.ceil((entry.resetAt - now) / 60000);
    return res.status(429).json({ error: `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` });
  }
  res.on("finish", () => {
    if (res.statusCode === 401) entry.count++;
    else if (res.statusCode < 400) loginAttempts.delete(key);
  });
  next();
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (isPlainObject(value)) {
    const cleaned = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        cleaned[key] = removeUndefined(item);
      }
    }
    return cleaned;
  }

  return value;
}

app.post("/api/auth/login", loginLimiter, ah(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const credentials = await readCredentials();
  const key = findCredentialKey(credentials, username);
  if (!key) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  if (!bcrypt.compareSync(password, credentials[key])) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const state = await readState();
  let user = state.users.find(u => u.username.toLowerCase() === key.toLowerCase());
  if (!user) {
    // Credential exists but user profile got removed somehow — recreate a minimal one.
    user = { username: key, name: key, bio: "", avatar: key.charAt(0).toUpperCase(), avatarImage: null, bannerImage: null, isAdmin: false };
    state.users.push(user);
    await writeState(state);
  }

  if (user.disabled) {
    return res.status(403).json({ error: "This account has been disabled by an administrator." });
  }

  if (!state.social[user.username]) {
    state.social[user.username] = defaultSocialFor();
  }
  state.social[user.username].notifications.unshift({
    name: user.name,
    avatar: user.avatar,
    text: "logged in",
    time: "Just now",
    unread: true
  });
  await writeState(state);

  setSessionCookie(res, user.username);
  res.json({ username: user.username, name: user.name, isAdmin: !!user.isAdmin });
}));

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, ah(async (req, res) => {
  const state = await readState();
  const user = state.users.find(u => u.username === req.username);
  if (!user) return res.status(401).json({ error: "Account no longer exists." });
  res.json({ username: user.username, name: user.name, isAdmin: !!user.isAdmin });
}));

app.post("/api/auth/change-password", requireAuth, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different from your current password." });
  }

  const credentials = await readCredentials();
  const key = findCredentialKey(credentials, req.username);
  if (!key) return res.status(404).json({ error: "Account not found." });

  if (!bcrypt.compareSync(currentPassword || "", credentials[key])) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  credentials[key] = bcrypt.hashSync(newPassword, 10);
  await writeCredentials(credentials);
  res.json({ ok: true });
}));

// ---------------------------------------------------------
// MEDIA UPLOAD (Cloudinary)
// The frontend sends a data URL (same format it already
// produces after compressing an image or reading a video
// file). This route uploads it to Cloudinary and returns a
// normal https URL, which is what actually gets saved into
// Firestore — not the file itself.
// ---------------------------------------------------------
app.post("/api/upload", requireAuth, async (req, res) => {
  const { dataUrl, kind } = req.body || {};
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return res.status(400).json({ error: "No file data received." });
  }

  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) return res.status(400).json({ error: "Invalid file data." });
  const mime = match[1].toLowerCase();
  const allowedImages = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/heic", "image/heif"]);
  const allowedVideos = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  const isVideo = kind === "video";
  const allowed = isVideo ? allowedVideos.has(mime) : allowedImages.has(mime);
  if (!allowed) return res.status(400).json({ error: "That file type isn't supported." });
  const estimatedBytes = Math.floor(match[2].length * 3 / 4);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (estimatedBytes > maxBytes) {
    return res.status(413).json({ error: `File is too large. Maximum allowed is ${isVideo ? 15 : 8}MB.` });
  }

  if (!CLOUDINARY_CONFIGURED) {
    // Local fallback: keep the file on this server's disk (safe types only, random name).
    const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/heic": "heic",  "image/heif": "heif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
    const m = match;
    if (!m || !EXT[m[1]]) {
      return res.status(400).json({ error: "That file type isn't supported." });
    }
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const name = crypto.randomBytes(16).toString("hex") + "." + EXT[m[1]];
      await fs.promises.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(m[2], "base64"));
      return res.json({ url: "/uploads/" + name });
    } catch (error) {
      console.error("[local upload error]", error);
      return res.status(500).json({ error: "Couldn't save the file. Please try again." });
    }
  }

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "neas-boarding-horse",
      resource_type: kind === "video" ? "video" : "auto"
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("[cloudinary upload error]",{
       message: error?.message,
       http_code: error?.http_code,
       name: error?.name,
       response: error?.response?.body || error?.response?.data || null
    }); 
    res.status(502).json({ error: "Upload to media storage failed. Please try again." });
  }
});

// ---------------------------------------------------------
// SHARED APP STATE (users' public profiles, posts, social)
// ---------------------------------------------------------

app.get("/api/state", requireAuth, ah(async (req, res) => {
  const state = await readState();
  const ownSocial = state.social?.[req.username] || defaultSocialFor();
  // Members need the shared public feed and their own private social data.
  // Do not send other members' notifications, saved posts, albums, or reactions.
  res.json({
    users: state.users.map(u => ({
      username: u.username, name: u.name, bio: u.bio || "", avatar: u.avatar || "U",
      avatarImage: u.avatarImage || null, bannerImage: u.bannerImage || null,
      isAdmin: !!u.isAdmin, disabled: !!u.disabled
    })),
    posts: state.posts,
    social: { [req.username]: ownSocial },
    rev: Number(state.rev) || 0
  });
}));

// Same reaction set the frontend offers — used to reject junk emoji keys
// and to recompute reaction counts from scratch below.
const REACTIONS = ["\uD83D\uDC4D", "\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDE21"];

const MAX_TEXT_LEN = 5000;
const MAX_COMMENT_LEN = 2000;
const MAX_NAME_LEN = 200;
const MAX_IMAGES_PER_POST = 10;
const MAX_NEW_NOTIFICATIONS_PER_SAVE = 5; // per OTHER member being notified, per save

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sameJSON(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    return false;
  }
}

function clampString(value, maxLen) {
  return String(value == null ? "" : value).slice(0, maxLen);
}

function clampStringArray(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value.filter(v => typeof v === "string").slice(0, maxItems).map(v => clampString(v, maxLen));
}

// Builds the one post object a member is allowed to have produced, given
// what they sent (incomingPost) and — for edits — what the server already
// has (currentPost). Content authorship (who wrote it, what it says, its
// media) can only be set by the post's own author (or an admin); every
// other member's save can only ever leave those fields untouched.
function sanitizePost(incomingPost, currentPost, req, authorProfile) {
  const isOwnerOrAdmin = currentPost
    ? (currentPost.username === req.username || req.isAdmin)
    : true; // brand-new post: ownership is enforced by forcing author fields below

  const base = currentPost ? { ...currentPost } : {};

  if (isOwnerOrAdmin) {
    // New posts always get their author identity from the server's own
    // record for the logged-in member — never trusted from the client —
    // so nobody can publish a post that appears to be from someone else.
    base.username = currentPost ? currentPost.username : req.username;
    base.name = currentPost ? currentPost.name : authorProfile.name;
    base.avatar = currentPost ? currentPost.avatar : authorProfile.avatar;
    base.avatarImage = currentPost ? currentPost.avatarImage : (authorProfile.avatarImage || null);
    base.text = clampString(incomingPost.text, MAX_TEXT_LEN);
    base.time = currentPost ? base.time : "Just now";
    base.image = typeof incomingPost.image === "string" ? clampString(incomingPost.image, 2000) : null;
    base.images = Array.isArray(incomingPost.images) ? clampStringArray(incomingPost.images, MAX_IMAGES_PER_POST, 2000) : undefined;
    if (!base.images || !base.images.length) delete base.images;
    base.video = typeof incomingPost.video === "string" ? clampString(incomingPost.video, 2000) : null;
    if (!base.video) delete base.video;
    if (!base.image) delete base.image;
  }
  // Non-owners editing an existing post: `base` already equals currentPost,
  // so authorship/text/media are left exactly as the server had them.

  // Comments: anyone may add a new comment, but nobody — not even the
  // post's own author — may rewrite or remove a comment that's already
  // there. So the accepted list is always "the old list, unchanged" plus
  // whatever *new* comments were appended after it.
  const oldComments = (currentPost && Array.isArray(currentPost.commentsList)) ? currentPost.commentsList : [];
  const incomingComments = Array.isArray(incomingPost.commentsList) ? incomingPost.commentsList : [];
  const oldPrefixMatches = oldComments.every((c, i) => sameJSON(c, incomingComments[i]));
  let finalComments = oldComments;
  if (oldPrefixMatches && incomingComments.length > oldComments.length) {
    const appended = incomingComments.slice(oldComments.length).map(c => ({
      // A comment's identity is always the CURRENT server-known profile of
      // whoever is saving right now — never trusted from the client — so
      // nobody can post a comment that looks like it came from someone else.
      name: authorProfile.name,
      avatar: authorProfile.avatar,
      avatarImage: authorProfile.avatarImage || null,
      text: clampString(c && c.text, MAX_COMMENT_LEN),
      time: "Just now"
    })).filter(c => c.text.trim().length > 0);
    finalComments = oldComments.concat(appended);
  }
  base.commentsList = finalComments;
  base.comments = finalComments.length;

  // reactions (aggregate counts) and shares are recomputed from every
  // member's own per-member state further down — never trusted here.
  return base;
}

// A member's own social slice (data.social[req.username]) they may set
// however they like, as long as it has the right shape — clearing their
// notifications, renaming an album, saving/unsaving a post, etc. are all
// fine because it only ever affects THEM.
function sanitizeOwnSocial(incoming) {
  const src = isPlainObject(incoming) ? incoming : {};
  const notifications = Array.isArray(src.notifications) ? src.notifications : [];
  const albums = Array.isArray(src.albums) ? src.albums : [];
  const reposts = Array.isArray(src.reposts) ? src.reposts : [];
  const savedPostIds = Array.isArray(src.savedPostIds) ? src.savedPostIds : [];
  const myReactions = isPlainObject(src.myReactions) ? src.myReactions : {};

  return {
    notifications: notifications.filter(isPlainObject).slice(0, 300).map(n => ({
      name: clampString(n.name, MAX_NAME_LEN),
      avatar: clampString(n.avatar, 10),
      avatarImage: typeof n.avatarImage === "string" ? clampString(n.avatarImage, 2000) : null,
      text: clampString(n.text, 300),
      time: clampString(n.time, 100),
      unread: !!n.unread,
      postId: typeof n.postId === "number" ? n.postId : null
    })),
    albums: albums.filter(isPlainObject).slice(0, 100).map(a => ({
      id: clampString(a.id, 100) || ("album_" + crypto.randomBytes(6).toString("hex")),
      name: clampString(a.name, 200),
      images: clampStringArray(a.images, 500, 2000)
    })),
    // Deduplicated by postId: a single member reposting the same post
    // twice must still only ever count as ONE share from them. Without
    // this, a member's own (fully-trusted) slice could list the same
    // postId many times and inflate that post's share count for everyone.
    reposts: (() => {
      const seenPostIds = new Set();
      const deduped = [];
      for (const r of reposts) {
        if (!isPlainObject(r) || typeof r.postId !== "number" || seenPostIds.has(r.postId)) continue;
        seenPostIds.add(r.postId);
        deduped.push({ postId: r.postId, time: clampString(r.time, 100) });
      }
      return deduped.slice(0, 2000);
    })(),
    savedPostIds: [...new Set(savedPostIds.filter(id => typeof id === "number"))].slice(0, 5000),
    myReactions: Object.fromEntries(
      Object.entries(myReactions)
        .filter(([, emoji]) => REACTIONS.includes(emoji))
        .slice(0, 5000)
    )
  };
}

// Another member's social slice: everything stays exactly as the server
// already has it, except this save is allowed to APPEND a handful of new
// notifications to it (that's how "so-and-so reacted/commented/reposted
// your post" reaches the post's owner) — never edit or remove one that's
// already there, and never touch their albums/reposts/saves/reactions.
function mergeOtherMemberSocial(current) {
  const base = current ? { ...current } : defaultSocialFor();

  base.notifications = Array.isArray(base.notifications)
    ? base.notifications
        .filter(isPlainObject)
        .slice(0, 300)
        .map(n => ({
          name: clampString(n.name, MAX_NAME_LEN),
          avatar: clampString(n.avatar, 10),
          avatarImage: typeof n.avatarImage === "string"
            ? clampString(n.avatarImage, 2000)
            : null,
          text: clampString(n.text, 300),
          time: clampString(n.time, 100),
          unread: !!n.unread,
          postId: typeof n.postId === "number" ? n.postId : null,
          type: typeof n.type === "string" ? clampString(n.type, 50) : null
        }))
    : [];

  base.albums = Array.isArray(base.albums) ? base.albums : [];
  base.reposts = Array.isArray(base.reposts) ? base.reposts : [];
  base.savedPostIds = Array.isArray(base.savedPostIds) ? base.savedPostIds : [];
  base.myReactions = isPlainObject(base.myReactions) ? base.myReactions : {};

  return base;
}

app.post("/api/state", requireAuth, ah(async (req, res) => {
  const incoming = req.body;
  if (!incoming || !Array.isArray(incoming.users) || !Array.isArray(incoming.posts)) {
    return res.status(400).json({ error: "Malformed state payload." });
  }

  const current = await readState();
  const currentRev = Number(current.rev) || 0;

  // The sender's copy is out of date (someone else saved first). Saving it would
  // silently wipe their changes, so refuse and hand back the fresh feed instead.
  if (typeof incoming.rev === "number" && incoming.rev !== currentRev) {
    return res.status(409).json({
      error: "Someone else just updated the feed. It has been refreshed, so please try again.",
      state: current
    });
  }

  const requester = current.users.find(u => u.username === req.username);
  if (!requester) return res.status(401).json({ error: "Account no longer exists." });
  req.isAdmin = !!requester.isAdmin;
  const authorProfile = { name: requester.name, avatar: requester.avatar, avatarImage: requester.avatarImage };

  // ---- USERS: members may only edit their OWN profile. Everyone else's
  // profile, and every admin flag, always stays exactly as the server has it.
  const incomingUsersByName = new Map(incoming.users.filter(u => u && u.username).map(u => [u.username, u]));
  const mine = incomingUsersByName.get(req.username);
  if (mine) delete mine.password;
  const finalUsers = current.users.map(u => {
    if (u.username !== req.username || !mine) return u;
    return {
      ...u,
      username: u.username,
      name: clampString(mine.name || u.name || u.username, 80).trim(),
      bio: clampString(mine.bio, 1000),
      avatar: clampString(mine.avatar || u.avatar || "U", 10),
      avatarImage: typeof mine.avatarImage === "string" ? clampString(mine.avatarImage, 2000) : null,
      bannerImage: typeof mine.bannerImage === "string" ? clampString(mine.bannerImage, 2000) : null,
      isAdmin: !!u.isAdmin,
      disabled: !!u.disabled
    };
  });

  // ---- POSTS: authorship/content can only change at the hand of the
  // post's own author (or an admin); deleting a post likewise requires
  // being its author or an admin. Everyone else's save simply leaves
  // other members' posts exactly as they were.
  const incomingPostsById = new Map(incoming.posts.filter(p => p && typeof p.id === "number").map(p => [p.id, p]));
  const finalPostsById = new Map();

  for (const currentPost of current.posts) {
    const incomingPost = incomingPostsById.get(currentPost.id);
    if (!incomingPost) {
      // Missing from what was sent = a deletion. Only the author/admin may do that.
      if (currentPost.username === req.username || req.isAdmin) continue;
      finalPostsById.set(currentPost.id, currentPost);
      continue;
    }
    finalPostsById.set(currentPost.id, sanitizePost(incomingPost, currentPost, req, authorProfile));
  }
  // Any post the sender listed that the server doesn't have yet is a new
  // post — only allowed to be authored as the sender themselves.
  for (const [id, incomingPost] of incomingPostsById) {
    if (finalPostsById.has(id)) continue;
    finalPostsById.set(id, sanitizePost(incomingPost, null, req, authorProfile));
  }
  // Preserve the sender's ordering where possible (newest-first), then
  // append anything they didn't include but weren't allowed to delete.
  const orderedIds = incoming.posts.filter(p => p && typeof p.id === "number").map(p => p.id);
  const seen = new Set();
  let finalPosts = [];
  for (const id of orderedIds) {
    if (finalPostsById.has(id) && !seen.has(id)) { finalPosts.push(finalPostsById.get(id)); seen.add(id); }
  }
  for (const [id, post] of finalPostsById) {
    if (!seen.has(id)) { finalPosts.push(post); seen.add(id); }
  }
  const validPostIds = new Set(finalPosts.map(p => p.id));

  // ---- SOCIAL: a member may freely rewrite their OWN slice; every other
  // member's slice keeps its saves/reactions/albums/reposts untouched and
  // only accepts newly-appended notifications (see mergeOtherMemberSocial).
  const incomingSocial = isPlainObject(incoming.social) ? incoming.social : {};
  const finalSocial = {};
  for (const user of finalUsers) {
    if (user.username === req.username) {
      finalSocial[user.username] = sanitizeOwnSocial(incomingSocial[user.username]);
    } else {
      finalSocial[user.username] = mergeOtherMemberSocial(current.social[user.username]);
    }
  }

  // Drop references to posts that no longer exist (deleted just now, or
  // already gone) out of everyone's saves/reactions/reposts — keeps the
  // data self-consistent no matter what any client sent.
  for (const username of Object.keys(finalSocial)) {
    const social = finalSocial[username];
    social.savedPostIds = social.savedPostIds.filter(id => validPostIds.has(id));
    social.reposts = social.reposts.filter(r => validPostIds.has(r.postId));
    social.myReactions = Object.fromEntries(Object.entries(social.myReactions).filter(([id]) => validPostIds.has(Number(id))));
  }

  // Reaction counts and share counts are never trusted from the client —
  // they're tallied fresh from every member's own per-member state, so a
  // single member can never inflate/forge the totals everyone else sees.
  const reactionTotals = new Map(); // postId -> { emoji: count }
  const shareTotals = new Map();    // postId -> count
  for (const social of Object.values(finalSocial)) {
    for (const [postIdStr, emoji] of Object.entries(social.myReactions)) {
      const postId = Number(postIdStr);
      if (!reactionTotals.has(postId)) reactionTotals.set(postId, {});
      const bucket = reactionTotals.get(postId);
      bucket[emoji] = (bucket[emoji] || 0) + 1;
    }
    for (const repost of social.reposts) {
      shareTotals.set(repost.postId, (shareTotals.get(repost.postId) || 0) + 1);
    }
  }
  finalPosts.forEach(post => {
    post.reactions = reactionTotals.get(post.id) || {};
    post.shares = shareTotals.get(post.id) || 0;
  });

  // Notifications are generated from verified state changes on the server.
  // Client-supplied notification text is ignored, preventing members from
  // forging notifications for other accounts.
  const oldOwnSocial = current.social?.[req.username] || defaultSocialFor();
  const newOwnSocial = finalSocial[req.username] || defaultSocialFor();
  const notify = (username, notification) => {
  if (!username || username.toLowerCase() === req.username.toLowerCase()) return;
  if (!finalSocial[username]) finalSocial[username] = defaultSocialFor();

  const safeNotification = {
    name: clampString(notification?.name, MAX_NAME_LEN),
    avatar: clampString(notification?.avatar, 10),
    avatarImage: typeof notification?.avatarImage === "string"
      ? clampString(notification.avatarImage, 2000)
      : null,
    text: clampString(notification?.text, 300),
    time: clampString(notification?.time, 100),
    unread: !!notification?.unread,
    postId: typeof notification?.postId === "number"
      ? notification.postId
      : null,
    type: typeof notification?.type === "string"
      ? clampString(notification.type, 50)
      : null
  };

  finalSocial[username].notifications = [
    safeNotification,
    ...(finalSocial[username].notifications || [])
  ].slice(0, 300);
};
  for (const [postIdStr, emoji] of Object.entries(newOwnSocial.myReactions || {})) {
    const oldEmoji = oldOwnSocial.myReactions?.[postIdStr];
    if (emoji !== oldEmoji) {
      const post = finalPosts.find(p => String(p.id) === String(postIdStr));
      if (post && post.username !== req.username) notify(post.username, {
        name: authorProfile.name, avatar: authorProfile.avatar, avatarImage: authorProfile.avatarImage || null,
        text: `reacted ${emoji} to your post`, time: "Just now", unread: true, postId: post.id
      });
    }
  }
  for (const oldId of Object.keys(oldOwnSocial.myReactions || {})) {
    if (!(oldId in (newOwnSocial.myReactions || {}))) {
      // Reaction removal creates no notification.
    }
  }
  const oldRepostIds = new Set((oldOwnSocial.reposts || []).map(r => r.postId));
  for (const repost of newOwnSocial.reposts || []) {
    if (!oldRepostIds.has(repost.postId)) {
      const post = finalPosts.find(p => p.id === repost.postId);
      if (post && post.username !== req.username) notify(post.username, {
        name: authorProfile.name, avatar: authorProfile.avatar, avatarImage: authorProfile.avatarImage || null,
        text: "reposted your post", time: "Just now", unread: true, postId: post.id
      });
    }
  }
  const oldPostIds = new Set(current.posts.map(p => p.id));
  for (const post of finalPosts) {
    if (!oldPostIds.has(post.id) && post.username === req.username) {
      const kind = post.video ? "shared a new video" : (post.image || post.images?.length) ? "shared a new photo" : "shared a new update";
      for (const user of finalUsers) {
        if (user.username !== req.username) notify(user.username, {
          name: authorProfile.name, avatar: authorProfile.avatar, avatarImage: authorProfile.avatarImage || null,
          text: kind, time: "Just now", unread: true, type: "new_post", postId: post.id
        });
      }
    }
  }

  // Detect newly appended comments by comparing the server's old post with the
  // sanitized final post. Only the current member's newly added comments can trigger this.
  for (const oldPost of current.posts) {
    const newPost = finalPosts.find(p => p.id === oldPost.id);
    if (!newPost || newPost.username === req.username) continue;
    const oldLen = Array.isArray(oldPost.commentsList) ? oldPost.commentsList.length : 0;
    const newLen = Array.isArray(newPost.commentsList) ? newPost.commentsList.length : 0;
    if (newLen > oldLen) notify(newPost.username, {
      name: authorProfile.name, avatar: authorProfile.avatar, avatarImage: authorProfile.avatarImage || null,
      text: "commented on your post", time: "Just now", unread: true, postId: newPost.id
    });
  }

  const finalState = {
    users: finalUsers,
    posts: finalPosts,
    social: finalSocial,
    rev: currentRev
  };

  const saved = await store.writeStateIfRevision(finalState, currentRev);
  if (!saved) {
    const fresh = await readState();
    return res.status(409).json({
      error: "Someone else just updated the feed. It has been refreshed, so please try again.",
      state: { users: fresh.users, posts: fresh.posts, social: { [req.username]: fresh.social?.[req.username] || defaultSocialFor() }, rev: Number(fresh.rev) || 0 }
    });
  }
  finalState.rev = currentRev + 1;
  res.json({ ok: true, rev: finalState.rev });
}));

// ---------------------------------------------------------
// ADMIN ROUTES
// ---------------------------------------------------------
// Every admin operation is checked on the server. The frontend
// never gets to decide whether a user is an administrator.
app.get("/api/admin/overview", requireAdmin, ah(async (req, res) => {
  const state = await readState();
  const credentials = await readCredentials();
  const users = state.users.map(u => ({
    username: u.username,
    name: u.name,
    bio: u.bio || "",
    avatar: u.avatar || (u.name || u.username || "U").charAt(0).toUpperCase(),
    avatarImage: u.avatarImage || null,
    bannerImage: u.bannerImage || null,
    isAdmin: !!u.isAdmin,
    postCount: state.posts.filter(p => p.username && p.username.toLowerCase() === u.username.toLowerCase()).length,
    hasPassword: !!findCredentialKey(credentials, u.username),
    disabled: !!u.disabled
  }));
  res.json({
    admin: req.username,
    users,
    posts: state.posts,
    updatedAt: new Date().toISOString()
  });
}));

app.post("/api/admin/users", requireAdmin, ah(async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const name = String(req.body?.name || username).trim().slice(0, 80);
  if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (/\s/.test(username)) return res.status(400).json({ error: "Username cannot contain spaces." });

  const state = await readState();
  const credentials = await readCredentials();
  if (findCredentialKey(credentials, username) || state.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "That username already exists." });
  }

  credentials[username] = bcrypt.hashSync(password, 10);
  state.users.push({
    username,
    name: name || username,
    bio: "Member of Nea's Boarding Horse.",
    avatar: (name || username).charAt(0).toUpperCase(),
    avatarImage: null,
    bannerImage: null,
    isAdmin: false
  });
  state.social[username] = defaultSocialFor();
  await writeCredentials(credentials);
  await writeState(state);
  res.status(201).json({ ok: true, username });
}));

app.delete("/api/admin/users/:username", requireAdmin, ah(async (req, res) => {
  const username = decodeURIComponent(req.params.username || "").trim();
  const state = await readState();
  const credentials = await readCredentials();
  const key = findCredentialKey(credentials, username);
  const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!key || !user) return res.status(404).json({ error: "Account not found." });
  if (user.username.toLowerCase() === req.username.toLowerCase()) return res.status(400).json({ error: "You cannot delete your own admin account." });
  if (user.isAdmin && state.users.filter(u => u.isAdmin).length <= 1) return res.status(400).json({ error: "You cannot delete the last admin account." });

  delete credentials[key];
  state.users = state.users.filter(u => u.username.toLowerCase() !== user.username.toLowerCase());
  delete state.social[user.username];
  state.posts = state.posts.filter(p => !p.username || p.username.toLowerCase() !== user.username.toLowerCase());
  await writeCredentials(credentials);
  await writeState(state);
  res.json({ ok: true });
}));



app.patch("/api/admin/users/:username", requireAdmin, ah(async (req, res) => {
  const username = decodeURIComponent(req.params.username || "").trim();
  const state = await readState();
  const credentials = await readCredentials();
  const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !findCredentialKey(credentials, user.username)) return res.status(404).json({ error: "Account not found." });

  const action = String(req.body?.action || "").toLowerCase();
  if (action === "disable" || action === "enable") {
    if (user.username.toLowerCase() === req.username.toLowerCase()) return res.status(400).json({ error: "You cannot disable your own admin account." });
    user.disabled = action === "disable";
  } else if (action === "promote" || action === "demote") {
    if (user.username.toLowerCase() === req.username.toLowerCase() && action === "demote") return res.status(400).json({ error: "You cannot remove your own admin access." });
    if (action === "demote" && user.isAdmin && state.users.filter(u => u.isAdmin).length <= 1) return res.status(400).json({ error: "You cannot demote the last admin account." });
    user.isAdmin = action === "promote";
  } else if (action === "rename") {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required." });
    user.name = name.slice(0, 80);
  } else {
    return res.status(400).json({ error: "Unknown admin action." });
  }

  await writeState(state);
  res.json({ ok: true, user: { username: user.username, name: user.name, isAdmin: !!user.isAdmin, disabled: !!user.disabled } });
}));

app.post("/api/admin/users/:username/reset-password", requireAdmin, ah(async (req, res) => {
  const username = decodeURIComponent(req.params.username || "").trim();
  const newPassword = String(req.body?.password || "");
  if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const credentials = await readCredentials();
  const key = findCredentialKey(credentials, username);
  if (!key) return res.status(404).json({ error: "Account not found." });
  credentials[key] = bcrypt.hashSync(newPassword, 10);
  await writeCredentials(credentials);
  res.json({ ok: true });
}));

app.delete("/api/admin/posts/:postId", requireAdmin, ah(async (req, res) => {
  const postId = String(req.params.postId);
  const state = await readState();
  const before = state.posts.length;
  state.posts = state.posts.filter(p => String(p.id) !== postId);
  if (state.posts.length === before) return res.status(404).json({ error: "Post not found." });
  await writeState(state);
  res.json({ ok: true });
}));

// ---------------------------------------------------------
// STATIC FRONTEND
// ---------------------------------------------------------
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", setHeaders: res => res.setHeader("X-Content-Type-Options", "nosniff") }));
app.use(express.static(PUBLIC_DIR));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Seed Firestore (first run only — a no-op every run after that), THEN
// start listening. Firestore access is async, unlike the old fs.existsSync
// seeding, so this can't happen at plain top-level code anymore.
store.ensureSeeded(defaultState(), (() => {
  const credentials = {};
  SEED_MEMBERS.forEach(m => { credentials[m.username.toLowerCase()] = bcrypt.hashSync(m.password, 10); });
  return credentials;
})()).then(() => {
  app.listen(PORT, () => {
    console.log(`Nea's Boarding Horse server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("\n[FATAL] Could not connect to Firebase:", err.message);
  process.exit(1);
});
