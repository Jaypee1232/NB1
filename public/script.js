/* =========================================
   NEA'S BOARDING HORSE — FRONTEND JAVASCRIPT
   (Community edition — everyone is automatically
   connected, one shared feed, notifications for all)

   FINAL MERGED VERSION
   This file combines and replaces both older copies of
   app.js. Only include THIS file in your HTML — loading
   more than one copy of this script on the same page
   causes "Identifier ... has already been declared" errors
   which silently break login and everything else.
========================================= */

/* =========================================================
   ICONS
   Small inline SVG set, applied to any element with a
   data-icon attribute. Keeps markup icon-agnostic and lets
   both the static HTML and the JS-generated post cards
   share one source of truth.
========================================================= */

const ICON_PATHS = {
  home: '<path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  poll: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  moreHorizontal: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  messageCircle: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  shield: '<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/>'
};

function iconSVG(name, options = {}) {
  const filled = options.filled;
  const inner = ICON_PATHS[name] || "";
  const fill = filled ? "currentColor" : "none";
  return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function applyStaticIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(el => {
    const name = el.getAttribute("data-icon");
    if (ICON_PATHS[name]) {
      el.innerHTML = iconSVG(name);
    }
  });
}

/* =========================================================
   MEDIA UPLOAD
   Sends a compressed image/video (as a data URL) to the
   server, which forwards it to Cloudinary and hands back a
   normal https URL. That URL — not the file itself — is what
   gets saved into posts/albums/profiles from here on.
========================================================= */

async function uploadMedia(dataUrl, kind = "image") {
  const result = await api("/api/upload", { method: "POST", body: { dataUrl, kind } });
  return result.url;
}

/* =========================================================
   THEME (light / dark / system)
========================================================= */

const THEME_KEY = "neas_boarding_horse_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll("[data-theme-icon]").forEach(el => {
    el.innerHTML = iconSVG(theme === "dark" ? "sun" : "moon");
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    console.error("Could not save theme preference.", error);
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) {
    console.error("Could not read theme preference.", error);
  }
  const prefersDark = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

/* =========================================================
   DATA
   The app's shared data (member profiles, posts, comments,
   notifications) now lives on the SERVER — every member who
   logs in sees the same community feed. This file talks to
   it through a small fetch() wrapper (see API below) instead
   of reading/writing localStorage directly.
========================================================= */

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

// Videos now go to Cloudinary instead of being embedded as
// base64 in Firestore, so this only needs to stay under the
// server's request body limit (see express.json limit in
// server.js), not under a "keep the JSON file small" limit.
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message = (payload && payload.error) || `Request failed (${response.status}).`;
    const failure = new Error(message);
    failure.status = response.status;
    failure.payload = payload;
    throw failure;
  }
  return payload;
}

/* =========================================================
   STATE
========================================================= */

// `data` mirrors what used to be stored in localStorage, minus
// anything session-specific (currentUser is tracked separately
// below as `session`, since it's per-browser, not shared).
let data = { users: [], posts: [], social: {} };

// The logged-in member for THIS browser/session. Set after a
// successful login or a valid session cookie check.
let session = null;

let activePostId = null;
let activeAlbumId = null;
let composerImages = [];
let composerVideo = null;
let activeProfileTab = "posts";
let viewingUsername = null;
let adminOverview = { users: [], posts: [] };

/* =========================================================
   STORAGE (now synced to the server instead of localStorage)
========================================================= */

function ensureSocialFor(username) {
  if (!username) {
    return { notifications: [], albums: [], reposts: [], savedPostIds: [], myReactions: {} };
  }
  if (!data.social) data.social = {};
  if (!data.social[username]) {
    data.social[username] = { notifications: [], albums: [], reposts: [], savedPostIds: [], myReactions: {} };
  }
  const social = data.social[username];
  if (!Array.isArray(social.notifications)) social.notifications = [];
  if (!Array.isArray(social.albums)) social.albums = [];
  if (!Array.isArray(social.reposts)) social.reposts = [];
  // These are PER-MEMBER by design: which emoji *this* member picked for a
  // post, and whether *this* member saved it. They must never be a single
  // field on the shared post object — that used to mean one member's
  // reaction/save silently applied to (and overwrote) every other member's view.
  if (!Array.isArray(social.savedPostIds)) social.savedPostIds = [];
  if (!social.myReactions || typeof social.myReactions !== "object") social.myReactions = {};
  return social;
}

// Saves run one at a time so they always reach the server in order.
let saveChain = Promise.resolve();
let savesInFlight = 0;

function saveData() {
  savesInFlight++;
  saveChain = saveChain.then(() => attemptSave(3));
  return true;
}

async function attemptSave(retriesLeft) {
  try {
    const result = await api("/api/state", { method: "POST", body: data });
    if (result && typeof result.rev === "number") data.rev = result.rev;
  } catch (error) {
    const freshState = error.status === 409 && error.payload && error.payload.state;
    if (freshState && typeof freshState.rev === "number" && retriesLeft > 0) {
      // Someone else saved first (even just another member logging in bumps
      // the revision). The server only ever changes fields a member is
      // actually allowed to touch and merges the rest (see server.js), so
      // it's safe to simply retry with the latest revision number rather
      // than throwing away whatever was just clicked.
      data.rev = freshState.rev;
      await attemptSave(retriesLeft - 1);
      return;
    }
    if (freshState) {
      // Repeated conflicts — fall back to at least showing the freshest feed.
      data = freshState;
      renderEverything();
      showMessage("Couldn't save your last change. Please try again.");
    } else {
      console.error("Could not save data to the server.", error);
      showMessage("Couldn't save — check your connection and try again.");
    }
  } finally {
    savesInFlight--;
  }
}

/* =========================================================
   LIVE SYNC
   Polls the server every few seconds so members see each
   other's new posts, comments, and reactions without having
   to refresh. Skipped while a modal (like the composer) is
   open so it never overwrites something being typed.
========================================================= */

let pollTimer = null;

function anyModalOpen() {
  return !!document.querySelector(".modal:not(.hidden)");
}

async function pollState() {
  if (!session || anyModalOpen() || savesInFlight > 0) return;
  try {
    const fresh = await api("/api/state");
    if (savesInFlight > 0) return; // a save started while we were fetching; don't overwrite it
    if (JSON.stringify(fresh) === JSON.stringify(data)) return;
    data = fresh;
    renderEverything();
  } catch (error) {
    // Session probably expired — quietly stop polling; the next
    // user action will surface a proper "please log in again".
    console.error("Live sync paused.", error);
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollState, 7000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/* =========================================================
   HELPERS
========================================================= */

function currentUser() {
  if (!session) return null;
  return data.users.find(user => user.username === session.username);
}

function showMessage(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function avatarLetter(name) {
  return name ? name.charAt(0).toUpperCase() : "N";
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function usernamesMatch(username1, username2) {
  if (!username1 || !username2) return false;
  return String(username1).trim().toLowerCase() === String(username2).trim().toLowerCase();
}

function findUser(username) {
  if (!username) return null;
  return data.users.find(user => usernamesMatch(user.username, username)) || null;
}

/* =========================================================
   COMMUNITY MEMBERS
   Every account is automatically connected to every other
   account — there is no friend request system anymore.
========================================================= */

function otherMembers(excludeUsername) {
  return data.users.filter(user => !usernamesMatch(user.username, excludeUsername));
}

function ensureSocial() {
  const user = currentUser();
  return ensureSocialFor(user ? user.username : null);
}

/* =========================================================
   NORMALIZE SERVER DATA
   Fills in any missing fields on data just fetched from the
   server, same idea as the old "upgrade saved data" step —
   just no longer needs to seed default users, since the
   server already owns that.
========================================================= */

function upgradeData() {
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.posts)) data.posts = [];
  if (!data.social || typeof data.social !== "object") data.social = {};

  data.users.forEach(user => ensureSocialFor(user.username));

  data.posts.forEach(post => {
    if (!post.reactions) post.reactions = {};
    if (!Array.isArray(post.commentsList)) post.commentsList = [];
    if (typeof post.comments !== "number") post.comments = post.commentsList.length;
    if (typeof post.shares !== "number") post.shares = 0;
    // `userReaction` / `saved` used to live directly on the (shared) post
    // object, which meant one member's reaction or save leaked into every
    // other member's view. They're per-member now (see ensureSocialFor),
    // so any leftover legacy fields on the post itself are just noise —
    // drop them rather than let old data confuse anything.
    delete post.userReaction;
    delete post.saved;
  });
}

/* =========================================================
   FILE HELPERS
========================================================= */

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file, maxDimension = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    readFileAsDataURL(file).then(rawDataUrl => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = rawDataUrl;
    }).catch(reject);
  });
}

/* =========================================================
   AUTH
========================================================= */

function showWelcome() {
  document.getElementById("welcomePage")?.classList.remove("hidden");
  document.getElementById("loginPage")?.classList.add("hidden");
}

function showLogin() {
  document.getElementById("welcomePage")?.classList.add("hidden");
  document.getElementById("loginPage")?.classList.remove("hidden");
  setLoginError("");
}

function setLoginError(message) {
  const el = document.getElementById("loginError");
  if (!el) return;
  if (!message) {
    el.classList.add("hidden");
    el.textContent = "";
  } else {
    el.classList.remove("hidden");
    el.textContent = message;
  }
}

/* =========================================================
   LOGIN FORM
   Real authentication now happens on the server: the browser
   never sees anyone's password hash, and the server sets an
   httpOnly session cookie once the username/password check
   out. (The old version let anyone in by typing "admin" with
   no password at all — that's fixed; admin now logs in the
   same way as everyone else.)
========================================================= */

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setLoginError("");
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitButton = loginForm.querySelector("button[type='submit']");

    if (submitButton) submitButton.disabled = true;
    try {
      const result = await api("/api/auth/login", { method: "POST", body: { username, password } });
      session = result;
      await loadStateAndEnter();
    } catch (error) {
      setLoginError(error.message || "Incorrect username or password.");
      showMessage(error.message || "Incorrect username or password.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

/* =========================================================
   ENTER APP
========================================================= */

async function loadStateAndEnter() {
  data = await api("/api/state");
  upgradeData();
  enterApplication();
}

function enterApplication() {
  document.getElementById("authScreen")?.classList.add("hidden");
  document.getElementById("app")?.classList.remove("hidden");
  renderEverything();
  updateAdminNavigation();
  openPage("home");
  startPolling();
}

function updateAdminNavigation() {
  const show = !!session?.isAdmin;
  document.getElementById("adminNavButton")?.classList.toggle("hidden", !show);
  document.getElementById("adminMobileNav")?.classList.toggle("hidden", !show);
  document.getElementById("adminPage")?.classList.toggle("hidden", !show && document.getElementById("adminPage")?.classList.contains("active"));
}

async function loadAdminPanel() {
  if (!session?.isAdmin) return;
  try {
    const result = await api("/api/admin/overview");
    adminOverview = result;
    document.getElementById("adminUserCount").textContent = result.users.length;
    document.getElementById("adminPostCount").textContent = result.posts.length;
    renderAdminUsers();
    renderAdminPosts();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showMessage("Admin session is no longer active.");
      openPage("home");
      return;
    }
    showMessage(error.message || "Could not load the admin panel.");
  }
}

function renderAdminUsers() {
  const container = document.getElementById("adminUsersList");
  if (!container) return;
  const search = String(document.getElementById("adminUserSearch")?.value || "").toLowerCase().trim();
  const users = (adminOverview.users || []).filter(u =>
    !search || `${u.name} ${u.username}`.toLowerCase().includes(search)
  );
  if (!users.length) {
    container.innerHTML = `<p class="no-results">No accounts found.</p>`;
    return;
  }
  container.innerHTML = users.map(u => `
    <div class="admin-user-row">
      <div class="avatar">${u.avatarImage ? `<img src="${escapeHTML(u.avatarImage)}" alt="${escapeHTML(u.name || u.username)}">` : escapeHTML(u.avatar || "U")}</div>
      <div class="admin-user-info">
        <strong>${escapeHTML(u.name || u.username)}</strong>
        <span>@${escapeHTML(u.username)} · ${u.postCount} post${u.postCount === 1 ? "" : "s"}</span>
      </div>
      <div class="admin-user-actions">
        ${u.isAdmin ? `<span class="admin-badge">Admin</span>` : `<span class="admin-badge member">Member</span>`}
        ${u.disabled ? `<span class="admin-badge disabled">Disabled</span>` : ""}
        ${u.username.toLowerCase() === String(session.username).toLowerCase() ? `<span class="admin-current">You</span>` : `
          <button class="soft-button small-admin-btn" onclick="adminRenameUser('${encodeURIComponent(u.username)}', '${escapeHTML((u.name || '').replace(/'/g, "&#39;"))}')">Rename</button>
          <button class="soft-button small-admin-btn" onclick="adminResetPassword('${encodeURIComponent(u.username)}')">Reset Password</button>
          <button class="soft-button small-admin-btn" onclick="adminToggleDisabled('${encodeURIComponent(u.username)}', ${u.disabled ? 'true' : 'false'})">${u.disabled ? 'Enable' : 'Disable'}</button>
          <button class="soft-button small-admin-btn" onclick="adminToggleRole('${encodeURIComponent(u.username)}', ${u.isAdmin ? 'true' : 'false'})">${u.isAdmin ? 'Remove Admin' : 'Make Admin'}</button>
          <button class="danger-button" onclick="deleteAdminUser('${encodeURIComponent(u.username)}')">Delete</button>`}
      </div>
    </div>
  `).join("");
}

function renderAdminPosts() {
  const grid = document.getElementById("adminPostsGrid");
  if (!grid) return;
  const posts = adminOverview.posts || [];
  if (!posts.length) {
    grid.innerHTML = `<p class="no-results">No posts yet.</p>`;
    return;
  }
  grid.innerHTML = posts.map(post => {
    const user = (adminOverview.users || []).find(u => u.username.toLowerCase() === String(post.username || "").toLowerCase());
    const author = user?.name || post.name || post.username || "Unknown member";
    const media = post.video
      ? `<video class="admin-post-media" src="${escapeHTML(post.video)}" controls preload="metadata"></video>`
      : post.image
        ? `<img class="admin-post-media" src="${escapeHTML(post.image)}" alt="Posted by ${escapeHTML(author)}" loading="lazy">`
        : Array.isArray(post.images) && post.images.length
          ? `<div class="admin-post-gallery">${post.images.slice(0, 10).map(src => `<img class="admin-post-media" src="${escapeHTML(src)}" alt="Posted by ${escapeHTML(author)}" loading="lazy">`).join("")}</div>`
          : `<div class="admin-no-media">Text post</div>`;
    return `<article class="admin-post-card">
      ${media}
      <div class="admin-post-body">
        <strong>${escapeHTML(author)}</strong>
        <span>@${escapeHTML(post.username || "unknown")}</span>
        ${post.text ? `<p>${escapeHTML(post.text).replace(/\n/g, "<br>")}</p>` : ""}
        <button class="danger-button admin-delete-post" onclick="deleteAdminPost('${encodeURIComponent(String(post.id))}')">Delete Post</button>
      </div>
    </article>`;
  }).join("");
}

async function createAdminUser(event) {
  event.preventDefault();
  const button = event.target.querySelector("button[type='submit']");
  const body = {
    name: document.getElementById("adminNewName").value.trim(),
    username: document.getElementById("adminNewUsername").value.trim(),
    password: document.getElementById("adminNewPassword").value
  };
  button.disabled = true;
  try {
    await api("/api/admin/users", { method: "POST", body });
    event.target.reset();
    showMessage("Account created.");
    await loadAdminPanel();
  } catch (error) {
    showMessage(error.message || "Could not create account.");
  } finally {
    button.disabled = false;
  }
}

async function adminRenameUser(encodedUsername, currentName) {
  const username = decodeURIComponent(encodedUsername);
  const name = await appPrompt(`New name for ${username}:`, { title: "Rename Account", defaultValue: currentName || "", okLabel: "Save" });
  if (name === null) return;
  if (!name.trim()) return showMessage("Name cannot be empty.");
  try {
    await api(`/api/admin/users/${encodeURIComponent(username)}`, { method: "PATCH", body: { action: "rename", name: name.trim() } });
    showMessage("Account name updated.");
    await loadAdminPanel();
  } catch (error) { showMessage(error.message || "Could not rename account."); }
}

async function adminResetPassword(encodedUsername) {
  const username = decodeURIComponent(encodedUsername);
  const password = await appPrompt(`Enter a new password for ${username}:`, { title: "Reset Password", inputType: "password", okLabel: "Reset Password" });
  if (password === null) return;
  if (password.length < 6) return showMessage("Password must be at least 8 characters.");
  try {
    await api(`/api/admin/users/${encodeURIComponent(username)}/reset-password`, { method: "POST", body: { password } });
    showMessage("Password reset successfully.");
  } catch (error) { showMessage(error.message || "Could not reset password."); }
}

async function adminToggleDisabled(encodedUsername, disabled) {
  const username = decodeURIComponent(encodedUsername);
  const action = disabled ? "enable" : "disable";
  const confirmed = await appConfirm(`${disabled ? "Enable" : "Disable"} ${username}'s account?`, {
    title: disabled ? "Enable Account" : "Disable Account",
    okLabel: disabled ? "Enable" : "Disable",
    danger: !disabled
  });
  if (!confirmed) return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(username)}`, { method: "PATCH", body: { action } });
    showMessage(`Account ${disabled ? "enabled" : "disabled"}.`);
    await loadAdminPanel();
  } catch (error) { showMessage(error.message || "Could not update account."); }
}

async function adminToggleRole(encodedUsername, isAdmin) {
  const username = decodeURIComponent(encodedUsername);
  const action = isAdmin ? "demote" : "promote";
  const confirmed = await appConfirm(`${isAdmin ? "Remove admin access from" : "Make"} ${username} ${isAdmin ? "?" : "an admin?"}`, {
    title: "Admin Access",
    okLabel: isAdmin ? "Remove Admin" : "Make Admin",
    danger: isAdmin
  });
  if (!confirmed) return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(username)}`, { method: "PATCH", body: { action } });
    showMessage(isAdmin ? "Admin access removed." : "Admin access granted.");
    await loadAdminPanel();
  } catch (error) { showMessage(error.message || "Could not change admin access."); }
}

async function deleteAdminPost(encodedPostId) {
  const postId = decodeURIComponent(encodedPostId);
  const confirmed = await appConfirm("Delete this post for everyone? This cannot be undone.", { title: "Delete Post", okLabel: "Delete", danger: true });
  if (!confirmed) return;
  try {
    await api(`/api/admin/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    showMessage("Post deleted.");
    await loadAdminPanel();
    await loadStateAndEnter();
    openPage("admin");
  } catch (error) { showMessage(error.message || "Could not delete post."); }
}

async function deleteAdminUser(encodedUsername) {
  const username = decodeURIComponent(encodedUsername);
  const confirmed = await appConfirm(`Delete the account ${username}? Their posts will also be removed.`, { title: "Delete Account", okLabel: "Delete", danger: true });
  if (!confirmed) return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(username)}`, { method: "DELETE" });
    showMessage("Account deleted.");
    await loadAdminPanel();
    await loadStateAndEnter();
    openPage("admin");
  } catch (error) {
    showMessage(error.message || "Could not delete account.");
  }
}

const adminCreateForm = document.getElementById("adminCreateForm");
if (adminCreateForm) adminCreateForm.addEventListener("submit", createAdminUser);

async function logout() {
  stopPolling();
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout request failed.", error);
  }

  session = null;
  data = { users: [], posts: [], social: {} };

  activePostId = null;
  activeAlbumId = null;
  composerImages = [];
  composerVideo = null;
  viewingUsername = null;

  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("authScreen")?.classList.remove("hidden");
  document.getElementById("loginForm")?.reset();

  showWelcome();
  showMessage("You've been logged out.");
}

/* =========================================================
   NAVIGATION
   Keeps the mobile bottom nav and the desktop sidebar rail
   in sync — both call the same openPage(), just styled
   differently by screen size.
========================================================= */

function openPage(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
  const target = document.getElementById(page + "Page");
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  const nav = document.querySelector(`.nav-item[onclick="openPage('${page}')"]`);
  if (nav) nav.classList.add("active");

  document.querySelectorAll(".rail-item").forEach(btn => btn.classList.remove("active"));
  const rail = document.querySelector(`.rail-item[data-rail="${page}"]`);
  if (rail) rail.classList.add("active");

  if (page === "friends") {
    renderFriends();
  }
  if (page === "admin") {
    if (!session?.isAdmin) {
      openPage("home");
      return;
    }
    loadAdminPanel();
  }
  if (page === "notifications") {
    const social = ensureSocial();
    social.notifications.forEach(n => { n.unread = false; });
    saveData();
    renderNotifications();
    updateNotificationDot();
  }
}

/* =========================================================
   PROFILE HEADER
========================================================= */

function applyProfileCover(user) {
  const cover = document.getElementById("profileCover");
  if (!cover) return;
  cover.style.backgroundImage = user.bannerImage ? `url("${user.bannerImage}")` : "";
}

function renderUser() {
  const user = currentUser();
  if (!user) return;
  ["headerAvatar", "homeAvatar", "modalAvatar", "profileAvatar", "sidebarAvatar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (user.avatarImage) {
      el.innerHTML = `<img src="${escapeHTML(user.avatarImage)}" alt="${escapeHTML(user.name)}">`;
    } else {
      el.textContent = user.avatar || avatarLetter(user.name);
    }
  });
  document.getElementById("modalName")?.replaceChildren(document.createTextNode(user.name));
  const profileName = document.getElementById("profileName");
  if (profileName) profileName.textContent = user.name;
  const profileUsername = document.getElementById("profileUsername");
  if (profileUsername) profileUsername.textContent = user.username;
  const profileBio = document.getElementById("profileBio");
  if (profileBio) profileBio.textContent = user.bio;
  const sidebarName = document.getElementById("sidebarName");
  if (sidebarName) sidebarName.textContent = user.name;
  const sidebarUsername = document.getElementById("sidebarUsername");
  if (sidebarUsername) sidebarUsername.textContent = user.username;
  applyProfileCover(user);
}

/* =========================================================
   AVATAR UPLOAD
========================================================= */

function triggerAvatarUpload() {
  document.getElementById("avatarInput")?.click();
}

const avatarInput = document.getElementById("avatarInput");
if (avatarInput) {
  avatarInput.addEventListener("change", async function () {
    const file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file.");
      return;
    }
    showMessage("Updating profile picture…");
    try {
      const dataUrl = await compressImageFile(file, 500, 0.86);
      const url = await uploadMedia(dataUrl, "image");
      const user = currentUser();
      if (!user) return;
      user.avatarImage = url;
      if (saveData()) {
        renderEverything();
        showMessage("Profile picture updated!");
      }
    } catch (error) {
      console.error(error);
      showMessage("Couldn't update your profile picture.");
    }
  });
}

/* =========================================================
   COVER UPLOAD
========================================================= */

function triggerBannerUpload() {
  document.getElementById("bannerInput")?.click();
}

const bannerInput = document.getElementById("bannerInput");
if (bannerInput) {
  bannerInput.addEventListener("change", async function () {
    const file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file.");
      return;
    }
    showMessage("Updating cover photo…");
    try {
      const dataUrl = await compressImageFile(file, 1600, 0.85);
      const url = await uploadMedia(dataUrl, "image");
      const user = currentUser();
      if (!user) return;
      user.bannerImage = url;
      if (saveData()) {
        applyProfileCover(user);
        showMessage("Cover photo updated!");
      }
    } catch (error) {
      console.error(error);
      showMessage("Couldn't update your cover photo.");
    }
  });
}

/* =========================================================
   POST CARD HTML
========================================================= */

function postCardHTML(post, options = {}) {
  // Which emoji (if any) the CURRENTLY LOGGED-IN member picked for this
  // post — per-member state, so it never shows another member's reaction
  // as if it were yours (see ensureSocialFor).
  const myReaction = (ensureSocial().myReactions || {})[post.id];
  const reactionButtons = REACTIONS.map(emoji => `    <button class="reaction-btn ${myReaction === emoji ? "active" : ""}" onclick="toggleReaction(${post.id}, '${emoji}')">
      ${emoji}
      ${post.reactions && post.reactions[emoji] ? ` ${post.reactions[emoji]}` : ""}
    </button>
  `).join("");

  let mediaHTML = "";

  if (post.video) {
    mediaHTML = `
      <video class="post-video" src="${escapeHTML(post.video)}" controls playsinline></video>
    `;
  } else if (post.images && post.images.length) {
    mediaHTML = `
      <div class="post-album">
        ${post.images.map(src => `<img src="${escapeHTML(src)}" alt="Album image">`).join("")}
      </div>
    `;
  } else if (post.image) {
    mediaHTML = `
      <img class="post-image" src="${escapeHTML(post.image)}" alt="Post image">
    `;
  }

  const author = findUser(post.username) || {
    name: post.name,
    avatar: post.avatar,
    avatarImage: post.avatarImage
  };
  const authorAvatarHTML = author.avatarImage
    ? `<img src="${escapeHTML(author.avatarImage)}" alt="${escapeHTML(author.name)}">`
    : escapeHTML(author.avatar || avatarLetter(author.name));

  const repostTag = options.repostedBy
    ? `<div class="repost-tag">${iconSVG("repeat")} ${escapeHTML(options.repostedBy)} reposted</div>`
    : "";

  // Whether the CURRENTLY LOGGED-IN member has saved this post — also
  // per-member state, not a field on the shared post (see ensureSocialFor).
  const saved = ensureSocial().savedPostIds.includes(post.id);

  return `
    <article class="post-card" data-post-id="${post.id}">
      ${repostTag}
      <div class="post-header">
        <div class="avatar ${post.username ? "clickable" : ""}" ${post.username ? `onclick="openUserProfile('${escapeHTML(post.username)}')"` : ""}>
          ${authorAvatarHTML}
        </div>
        <div class="post-user" ${post.username ? `onclick="openUserProfile('${escapeHTML(post.username)}')"` : ""}>
          <strong>${escapeHTML(author.name)}</strong>
          <small>${escapeHTML(post.time)} · Community</small>
        </div>
        <button onclick="openPostMenu(${post.id})" aria-label="Post options"><span class="icon">${iconSVG("moreHorizontal")}</span></button>
      </div>
      <div class="post-text">${escapeHTML(post.text)}</div>
      ${mediaHTML}
      <div class="reaction-bar">${reactionButtons}</div>
      <div class="post-actions">
        <button onclick="openComments(${post.id})"><span class="icon">${iconSVG("messageCircle")}</span> ${post.comments || 0}</button>
        <button class="${isRepostedByCurrentUser(post.id) ? "shared" : ""}" onclick="sharePost(${post.id})"><span class="icon">${iconSVG("repeat")}</span> ${post.shares || 0}</button>
        <button class="save-button" onclick="savePost(${post.id})" aria-label="${saved ? "Remove from saved" : "Save post"}"><span class="icon">${iconSVG("bookmark", { filled: saved })}</span></button>
      </div>
      <div class="post-reactions">
        ${totalReactions(post) > 0 ? `${totalReactions(post)} people reacted to this post` : "Be the first to react"}
      </div>
    </article>
  `;
}

/* =========================================================
   FEED
   One shared community feed — every member's posts show up
   here for everyone, newest first.
========================================================= */

function renderFeed() {
  const feed = document.getElementById("feed");
  if (!feed) return;
  if (!data.posts.length) {
    feed.innerHTML = `<p class="no-results">No posts yet. Be the first to share something!</p>`;
    return;
  }
  feed.innerHTML = data.posts.map(post => postCardHTML(post)).join("");
}

function totalReactions(post) {
  if (!post.reactions) return 0;
  return Object.values(post.reactions).reduce((total, count) => total + count, 0);
}

/* =========================================================
   REACTIONS
========================================================= */

function toggleReaction(id, emoji) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return;
  if (!post.reactions) post.reactions = {};

  const user = currentUser();
  const social = ensureSocial();
  const previousReaction = social.myReactions[id] || null;
  const wasReacting = previousReaction === emoji;

  if (wasReacting) {
    post.reactions[emoji] = Math.max(0, (post.reactions[emoji] || 0) - 1);
    delete social.myReactions[id];
  } else {
    if (previousReaction) {
      post.reactions[previousReaction] = Math.max(0, (post.reactions[previousReaction] || 0) - 1);
    }
    post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    social.myReactions[id] = emoji;
  }



  saveData();
  renderFeed();
  renderProfile();
  if (activePostId === id) refreshPostView();
}

/* =========================================================
   SHARE / REPOST
========================================================= */

function isRepostedByCurrentUser(postId) {
  const social = ensureSocial();
  return social.reposts.some(r => r.postId === postId);
}

function sharePost(id) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return;
  const user = currentUser();
  if (!user) return;

  const social = ensureSocial();
  const alreadyReposted = social.reposts.some(r => r.postId === id);

  if (alreadyReposted) {
    social.reposts = social.reposts.filter(r => r.postId !== id);
    post.shares = Math.max(0, (post.shares || 0) - 1);
    saveData();
    renderFeed();
    renderProfile();
    if (activePostId === id) refreshPostView();
    showMessage("Repost removed.");
    return;
  }

  social.reposts.unshift({
    postId: id,
    time: "Just now"
  });
  post.shares = (post.shares || 0) + 1;



  saveData();
  renderFeed();
  renderProfile();
  if (activePostId === id) refreshPostView();
  showMessage("Reposted to your profile!");
}

/* =========================================================
   SAVE
========================================================= */

function savePost(id) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return;
  const social = ensureSocial();
  const index = social.savedPostIds.indexOf(id);
  const nowSaved = index === -1;
  if (nowSaved) social.savedPostIds.push(id);
  else social.savedPostIds.splice(index, 1);
  saveData();
  renderFeed();
  renderProfile();
  if (activePostId === id) refreshPostView();
  showMessage(nowSaved ? "Post saved." : "Post removed from saved.");
}

/* =========================================================
   POST MENU
========================================================= */

function openPostMenu(id) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return;
  activePostId = id;
  const user = currentUser();
  const isOwner = user && post.username && usernamesMatch(post.username, user.username);
  const isAdmin = user && user.isAdmin;
  const options = document.getElementById("postMenuOptions");
  if (!options) return;
  options.innerHTML = `
    ${isOwner || isAdmin ? `
      <button class="menu-option danger" onclick="confirmDeletePost(${id})">🗑 Delete Post</button>
    ` : `
      <p class="no-results">Only the post owner can delete this post.</p>
    `}
    <button class="menu-option" onclick="closeModal('postMenuModal')">Cancel</button>
  `;
  document.getElementById("postMenuModal")?.classList.remove("hidden");
}

/* =========================================================
   DELETE POST
========================================================= */

function confirmDeletePost(id) {
  if (!confirm("Delete this post? This can't be undone.")) return;
  deletePost(id);
}

function deletePost(id) {
  const index = data.posts.findIndex(p => p.id === id);
  if (index === -1) return;
  data.posts.splice(index, 1);
  if (data.social) {
    Object.values(data.social).forEach(social => {
      if (Array.isArray(social.reposts)) {
        social.reposts = social.reposts.filter(r => r.postId !== id);
      }
      if (Array.isArray(social.savedPostIds)) {
        social.savedPostIds = social.savedPostIds.filter(savedId => savedId !== id);
      }
      if (social.myReactions && typeof social.myReactions === "object") {
        delete social.myReactions[id];
      }
    });
  }
  saveData();
  closeModal("postMenuModal");
  closeModal("postViewModal");
  closeModal("commentsModal");
  if (activePostId === id) activePostId = null;
  renderEverything();
  showMessage("Post deleted.");
}

/* =========================================================
   COMMENTS
========================================================= */

function openComments(id) {
  activePostId = id;
  renderCommentsList();
  const input = document.getElementById("commentInput");
  if (input) input.value = "";
  document.getElementById("commentsModal")?.classList.remove("hidden");
  input?.focus();
}

function renderCommentsList() {
  const post = data.posts.find(p => p.id === activePostId);
  const container = document.getElementById("commentsList");
  if (!post || !container) return;
  const list = post.commentsList || [];
  if (!list.length) {
    container.innerHTML = `<p class="no-results">No comments yet. Be the first to comment!</p>`;
    return;
  }
  container.innerHTML = list.map(comment => `
    <div class="comment-item">
      <div class="avatar">
        ${comment.avatarImage ? `<img src="${escapeHTML(comment.avatarImage)}" alt="${escapeHTML(comment.name)}">` : escapeHTML(comment.avatar || avatarLetter(comment.name))}
      </div>
      <div class="comment-body">
        <strong>${escapeHTML(comment.name)}</strong>
        <span>${escapeHTML(comment.text)}</span>
        <small>${escapeHTML(comment.time)}</small>
      </div>
    </div>
  `).join("");
  container.scrollTop = container.scrollHeight;
}

/* =========================================================
   COMMENT FORM
========================================================= */

const commentForm = document.getElementById("commentForm");
if (commentForm) {
  commentForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text || !activePostId) return;
    const post = data.posts.find(p => p.id === activePostId);
    if (!post) return;
    const user = currentUser();
    if (!user) return;

    if (!post.commentsList) post.commentsList = [];
    post.commentsList.push({
      name: user.name,
      avatar: user.avatar,
      avatarImage: user.avatarImage || null,
      text: text,
      time: "Just now"
    });
    post.comments = post.commentsList.length;


    saveData();
    input.value = "";
    renderCommentsList();
    renderFeed();

    const postViewModal = document.getElementById("postViewModal");
    if (postViewModal && !postViewModal.classList.contains("hidden")) {
      refreshPostView();
    }
  });
}

/* =========================================================
   POST VIEW
========================================================= */

function openPostView(id) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return;
  activePostId = id;
  const content = document.getElementById("postViewContent");
  if (!content) return;
  content.innerHTML = postCardHTML(post);
  document.getElementById("postViewModal")?.classList.remove("hidden");
}

function refreshPostView() {
  const post = data.posts.find(p => p.id === activePostId);
  const content = document.getElementById("postViewContent");
  if (!post || !content) return;
  content.innerHTML = postCardHTML(post);
}

/* =========================================================
   COMPOSER
========================================================= */

function openComposer() {
  const user = currentUser();
  if (!user) return;
  const modalName = document.getElementById("modalName");
  if (modalName) modalName.textContent = user.name;
  const modalAvatar = document.getElementById("modalAvatar");
  if (modalAvatar) {
    if (user.avatarImage) {
      modalAvatar.innerHTML = `<img src="${escapeHTML(user.avatarImage)}" alt="${escapeHTML(user.name)}">`;
    } else {
      modalAvatar.textContent = user.avatar;
    }
  }
  document.getElementById("composerModal")?.classList.remove("hidden");
  document.getElementById("postText")?.focus();
}

function closeComposer() {
  document.getElementById("composerModal")?.classList.add("hidden");
  const postText = document.getElementById("postText");
  if (postText) postText.value = "";
  composerImages = [];
  composerVideo = null;
  renderComposerPreview();
}

function addPhoto() {
  document.getElementById("postPhotoInput")?.click();
}

function addAlbum() {
  document.getElementById("postPhotoInput")?.click();
}

function addVideo() {
  document.getElementById("postVideoInput")?.click();
}

/* =========================================================
   PHOTO INPUT
========================================================= */

const postPhotoInput = document.getElementById("postPhotoInput");
if (postPhotoInput) {
  postPhotoInput.addEventListener("change", async function () {
    const files = Array.from(this.files || []);
    this.value = "";
    if (!files.length) return;
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      showMessage("Please choose image files.");
      return;
    }
    showMessage(imageFiles.length > 1 ? "Adding photos…" : "Adding photo…");
    try {
      const compressed = await Promise.all(
        imageFiles.map(file => compressImageFile(file, 1600, 0.82))
      );
      const urls = await Promise.all(compressed.map(dataUrl => uploadMedia(dataUrl, "image")));
      composerImages.push(...urls);
      composerVideo = null;
      renderComposerPreview();
    } catch (error) {
      console.error(error);
      showMessage("Couldn't add one of those photos.");
    }
  });
}

/* =========================================================
   VIDEO INPUT
========================================================= */

const postVideoInput = document.getElementById("postVideoInput");
if (postVideoInput) {
  postVideoInput.addEventListener("change", async function () {
    const file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      showMessage("Please choose a video file.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      showMessage("That video is too large. Please choose one under 15MB.");
      return;
    }
    showMessage("Adding video…");
    try {
      const dataUrl = await readFileAsDataURL(file);
      const url = await uploadMedia(dataUrl, "video");
      composerVideo = url;
      composerImages = [];
      renderComposerPreview();
    } catch (error) {
      console.error(error);
      showMessage("Couldn't add that video.");
    }
  });
}

/* =========================================================
   COMPOSER PREVIEW
========================================================= */

function removeComposerImage(index) {
  composerImages.splice(index, 1);
  renderComposerPreview();
}

function removeComposerVideo() {
  composerVideo = null;
  renderComposerPreview();
}

function renderComposerPreview() {
  const preview = document.getElementById("imagePreview");
  if (!preview) return;
  if (composerVideo) {
    preview.innerHTML = `
      <div class="preview-item">
        <video src="${escapeHTML(composerVideo)}" controls playsinline></video>
        <button type="button" class="remove-preview" onclick="removeComposerVideo()">×</button>
      </div>
    `;
    preview.classList.remove("hidden");
    return;
  }
  if (composerImages.length) {
    preview.innerHTML = composerImages.map((src, index) => `
      <div class="preview-item">
        <img src="${escapeHTML(src)}" alt="Selected photo">
        <button type="button" class="remove-preview" onclick="removeComposerImage(${index})">×</button>
      </div>
    `).join("");
    preview.classList.remove("hidden");
    return;
  }
  preview.innerHTML = "";
  preview.classList.add("hidden");
}

/* =========================================================
   POLL
========================================================= */

function createPoll() {
  const question = prompt("What is your poll question?");
  if (!question || !question.trim()) return;
  const postText = document.getElementById("postText");
  if (!postText) return;
  postText.value = `📊 ${question.trim()}\n\n• Yes\n• Maybe\n• No`;
}

/* =========================================================
   PUBLISH POST
========================================================= */

function publishPost() {
  const postText = document.getElementById("postText");
  const text = postText ? postText.value.trim() : "";
  if (!text && composerImages.length === 0 && !composerVideo) {
    showMessage("Write something, or add a photo or video first.");
    return;
  }
  const user = currentUser();
  if (!user) return;
  const newPost = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    name: user.name,
    username: user.username,
    avatar: user.avatar || avatarLetter(user.name),
    avatarImage: user.avatarImage || null,
    text: text || "Shared a moment ✨",
    reactions: {},
    comments: 0,
    commentsList: [],
    shares: 0,
    time: "Just now"
  };
  if (composerVideo) {
    newPost.video = composerVideo;
  } else if (composerImages.length > 1) {
    newPost.images = composerImages.slice();
  } else if (composerImages.length === 1) {
    newPost.image = composerImages[0];
  }
  data.posts.unshift(newPost);
  const saved = saveData();
  if (!saved) {
    data.posts.shift();
    return;
  }
  if (postText) {
    postText.value = "";
  }
  composerImages = [];
  composerVideo = null;
  renderComposerPreview();
  closeComposer();
  renderEverything();
  openPage("home");
  showMessage("Your post is live and saved! ✨");
}

/* =========================================================
   COMMUNITY MEMBERS PAGE
   (Formerly "Friends" — everyone is automatically connected,
   so this is now a simple member directory. There is no add,
   accept/decline, or remove flow anymore.)
========================================================= */

function renderFriends(filter = "") {
  const container = document.getElementById("friendsList");
  if (!container) return;
  const current = currentUser();
  if (!current) {
    container.innerHTML = "";
    return;
  }
  const term = filter.trim().toLowerCase();
  let members = otherMembers(current.username);
  if (term) {
    members = members.filter(member =>
      String(member.name || "").toLowerCase().includes(term) ||
      String(member.username || "").toLowerCase().includes(term)
    );
  }
  members.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (!members.length) {
    container.innerHTML = term
      ? `<p class="no-results">No members match "${escapeHTML(filter)}".</p>`
      : `<p class="no-results">No other members yet.</p>`;
    return;
  }
  container.innerHTML = members.map(member => `
    <div class="friend-card" onclick="openUserProfile('${escapeHTML(member.username)}')">
      <div class="avatar">
        ${member.avatarImage ? `<img src="${escapeHTML(member.avatarImage)}" alt="${escapeHTML(member.name)}">` : escapeHTML(member.avatar || avatarLetter(member.name))}
      </div>
      <div class="friend-info">
        <strong>${escapeHTML(member.name)}</strong>
        <small>${escapeHTML(member.username)}</small>
      </div>
    </div>
  `).join("");
}

function filterFriends() {
  const input = document.getElementById("friendSearchInput");
  renderFriends(input ? input.value : "");
}

function renderSidebarMembers() {
  const container = document.getElementById("sidebarMembersList");
  if (!container) return;
  const current = currentUser();
  if (!current) {
    container.innerHTML = "";
    return;
  }
  const members = otherMembers(current.username)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .slice(0, 6);
  if (!members.length) {
    container.innerHTML = `<p class="no-results">No other members yet.</p>`;
    return;
  }
  container.innerHTML = members.map(member => `
    <div class="sidebar-member" onclick="openUserProfile('${escapeHTML(member.username)}')">
      <div class="avatar">
        ${member.avatarImage ? `<img src="${escapeHTML(member.avatarImage)}" alt="${escapeHTML(member.name)}">` : escapeHTML(member.avatar || avatarLetter(member.name))}
      </div>
      <strong>${escapeHTML(member.name)}</strong>
    </div>
  `).join("");
}

// Kept as a no-op redirect so any old bookmark or shortcut that
// still calls openFriendsModal() doesn't break — there's no
// add-friend flow anymore since every account is already
// connected to every other account.
function openFriendsModal() {
  openPage("friends");
  showMessage("Everyone at Nea's Boarding Horse is already connected — no need to add anyone!");
}

/* =========================================================
   VIEW ANOTHER MEMBER'S PROFILE
   Every member can always see every other member's profile
   and posts — there's no locked/friends-only state anymore.
========================================================= */

function openUserProfile(username) {
  const current = currentUser();
  if (!current) return;

  if (usernamesMatch(username, current.username)) {
    closeModal("userProfileModal");
    openPage("profile");
    return;
  }

  const person = findUser(username);
  if (!person) {
    showMessage("Member not found.");
    return;
  }

  viewingUsername = person.username;
  renderUserProfileModal();
  document.getElementById("userProfileModal")?.classList.remove("hidden");
}

function renderUserProfileModal() {
  const content = document.getElementById("userProfileContent");
  if (!content) return;
  const person = findUser(viewingUsername);
  if (!person) return;

  const avatarHTML = person.avatarImage
    ? `<img src="${escapeHTML(person.avatarImage)}" alt="${escapeHTML(person.name)}">`
    : escapeHTML(person.avatar || avatarLetter(person.name));

  const coverStyle = person.bannerImage
    ? `style="background-image:url('${escapeHTML(person.bannerImage)}');background-size:cover;background-position:center;"`
    : "";

  const ownPosts = data.posts.filter(post => post.username && usernamesMatch(post.username, person.username));

  content.innerHTML = `
    <div class="profile-cover" ${coverStyle}></div>
    <div class="user-profile-header">
      <div class="avatar large">${avatarHTML}</div>
      <div>
        <h2>${escapeHTML(person.name)}</h2>
        <p>${escapeHTML(person.username)}</p>
        <span class="privacy">Community Member</span>
      </div>
    </div>
    <p class="user-profile-bio">${escapeHTML(person.bio || "")}</p>
    <div class="profile-grid">
      ${
        ownPosts.length
          ? ownPosts.filter(p => p.image || (p.images && p.images.length)).slice(0, 9).map(p => `
              <div onclick="closeModal('userProfileModal'); openPostView(${p.id})">
                <img src="${escapeHTML(p.image || p.images[0])}" alt="Post">
              </div>
            `).join("")
          : `<p class="no-results">No photos yet.</p>`
      }
    </div>
  `;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function notifyUser(username, notification) {
  const social = ensureSocialFor(username);
  social.notifications.unshift(notification);
  maybeShowSystemNotification(username, notification);
}

function renderNotifications() {
  const list = document.getElementById("notificationsList");
  if (!list) return;
  const social = ensureSocial();

  const permissionBanner = renderNotificationPermissionBanner();

  if (!social.notifications.length) {
    list.innerHTML = `${permissionBanner}<p class="no-results">You're all caught up.</p>`;
    return;
  }
  list.innerHTML = permissionBanner + social.notifications.map((n, index) => `
    <div class="notification" onclick="handleNotificationClick(${index})" role="button" tabindex="0">
      <div class="avatar">
        ${escapeHTML(n.avatar || avatarLetter(n.name))}
      </div>
      <div class="notification-info">
        <strong>${escapeHTML(n.name)}</strong>
        ${escapeHTML(n.text)}
        <br>
        <small>${escapeHTML(n.time)}</small>
      </div>
      ${n.unread ? `<i class="notification-dot"></i>` : ""}
    </div>
  `).join("");
}

function renderNotificationPermissionBanner() {
  if (typeof Notification === "undefined") return "";
  if (Notification.permission === "granted" || Notification.permission === "denied") return "";
  return `
    <div class="notification-permission-banner">
      <span>Turn on alerts to get notifications the moment something happens, even in another tab.</span>
      <button onclick="requestNotificationPermission()">Turn On</button>
    </div>
  `;
}

function requestNotificationPermission() {
  if (typeof Notification === "undefined") {
    showMessage("Your browser doesn't support notifications.");
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      showMessage("Notifications turned on!");
    } else {
      showMessage("Notifications are off. You can turn them on later from your browser settings.");
    }
    renderNotifications();
  });
}

function maybeShowSystemNotification(username, notification) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!session || !usernamesMatch(username, session.username)) return;
  try {
    new Notification(`${notification.name} — Nea's Boarding Horse`, {
      body: notification.text,
      tag: "nbh-notification"
    });
  } catch (error) {
    console.error("Could not show system notification.", error);
  }
}

function handleNotificationClick(index) {
  const social = ensureSocial();
  const notification = social.notifications[index];
  if (!notification) return;

  notification.unread = false;
  saveData();
  updateNotificationDot();

  if (notification.postId != null && data.posts.some(p => p.id === notification.postId)) {
    openPostView(notification.postId);
  } else {
    renderNotifications();
  }
}

function clearNotifications() {
  const social = ensureSocial();
  social.notifications.forEach(n => { n.unread = false; });
  saveData();
  renderNotifications();
  updateNotificationDot();
  showMessage("Notifications cleared.");
}

function updateNotificationDot() {
  const social = ensureSocial();
  const unread = social.notifications.some(n => n.unread);
  ["notificationDot", "notificationDotRail"].forEach(id => {
    const dot = document.getElementById(id);
    if (dot) dot.style.display = unread ? "block" : "none";
  });
}

/* =========================================================
   PROFILE
========================================================= */

function switchProfileTab(tab) {
  activeProfileTab = tab;
  document.getElementById("postsTabButton")?.classList.toggle("active", tab === "posts");
  document.getElementById("repostsTabButton")?.classList.toggle("active", tab === "reposts");
  document.getElementById("profileGrid")?.classList.toggle("hidden", tab !== "posts");
  document.getElementById("repostsGrid")?.classList.toggle("hidden", tab !== "reposts");
  document.getElementById("albumsHeader")?.classList.toggle("hidden", tab !== "posts");
  document.getElementById("albumsGrid")?.classList.toggle("hidden", tab !== "posts");
}

function renderProfile() {
  const user = currentUser();
  if (!user) return;
  const social = ensureSocial();
  const ownPosts = data.posts.filter(post => post.username && usernamesMatch(post.username, user.username));
  const savedPosts = data.posts.filter(post => social.savedPostIds.includes(post.id));
  const postCount = document.getElementById("postCount");
  if (postCount) postCount.textContent = ownPosts.length;
  const friendCount = document.getElementById("friendCount");
  if (friendCount) friendCount.textContent = otherMembers(user.username).length;
  const updateCount = document.getElementById("updateCount");
  if (updateCount) updateCount.textContent = savedPosts.length;
  const reactionsCount = Object.keys(social.myReactions || {}).length;
  const reactionCount = document.getElementById("reactionCount");
  if (reactionCount) reactionCount.textContent = reactionsCount;
  const gridPosts = ownPosts.filter(post => post.image || (post.images && post.images.length));
  const grid = document.getElementById("profileGrid");
  if (grid) {
    grid.innerHTML = gridPosts.length
      ? gridPosts.slice(0, 9).map(post => `
        <div onclick="openPostView(${post.id})">
          <img src="${escapeHTML(post.image || post.images[0])}" alt="Post">
        </div>
      `).join("")
      : `<p class="no-results">No photos yet.</p>`;
  }
  renderReposts(social);
  renderAlbums();
  renderSidebarMembers();
}

function renderReposts(social) {
  const grid = document.getElementById("repostsGrid");
  if (!grid) return;
  const reposts = (social.reposts || [])
    .map(r => ({ repost: r, post: data.posts.find(p => p.id === r.postId) }))
    .filter(entry => entry.post);

  if (!reposts.length) {
    grid.innerHTML = `<p class="no-results">You haven't reposted anything yet. Tap the repost icon on a post to repost it here.</p>`;
    return;
  }

  grid.innerHTML = reposts.map(({ post }) => {
    const thumb = post.image || (post.images && post.images[0]);
    return `
      <div onclick="closeModal('userProfileModal'); openPostView(${post.id})">
        <span class="repost-badge">Reposted</span>
        ${thumb
          ? `<img src="${escapeHTML(thumb)}" alt="Reposted post">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--pink-light);padding:8px;text-align:center;font-size:12px;color:var(--muted);">${escapeHTML((post.text || "").slice(0, 60))}</div>`
        }
      </div>
    `;
  }).join("");
}

function openEditProfile() {
  const user = currentUser();
  if (!user) return;
  const nameInput = document.getElementById("editName");
  if (nameInput) nameInput.value = user.name;
  const bioInput = document.getElementById("editBio");
  if (bioInput) bioInput.value = user.bio;
  document.getElementById("editModal")?.classList.remove("hidden");
}

function saveProfile() {
  const user = currentUser();
  if (!user) return;
  const name = document.getElementById("editName")?.value.trim();
  const bio = document.getElementById("editBio")?.value.trim();
  if (name) {
    user.name = name;
    user.avatar = avatarLetter(name);
  }
  if (bio !== undefined) {
    user.bio = bio;
  }
  saveData();
  renderEverything();
  closeModal("editModal");
  showMessage("Profile updated!");
}

/* =========================================================
   CHANGE PASSWORD
   Lets a logged-in member change their own password from the
   profile. Requires the current password to match (unless
   the account has none set, e.g. the admin account), then
   the new password twice for confirmation.
========================================================= */

function openChangePassword() {
  const user = currentUser();
  if (!user) return;
  ["currentPassword", "newPassword", "confirmNewPassword"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  setChangePasswordError("");
  document.getElementById("changePasswordModal")?.classList.remove("hidden");
  document.getElementById("currentPassword")?.focus();
}

function closeChangePassword() {
  closeModal("changePasswordModal");
}

function setChangePasswordError(message) {
  const el = document.getElementById("changePasswordError");
  if (!el) return;
  if (!message) {
    el.classList.add("hidden");
    el.textContent = "";
  } else {
    el.classList.remove("hidden");
    el.textContent = message;
  }
}

const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setChangePasswordError("");

    const user = currentUser();
    if (!user) return;

    const currentPassword = document.getElementById("currentPassword")?.value || "";
    const newPassword = document.getElementById("newPassword")?.value || "";
    const confirmNewPassword = document.getElementById("confirmNewPassword")?.value || "";

    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setChangePasswordError("New password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords don't match.");
      return;
    }

    const submitButton = changePasswordForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;
    try {
      await api("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      closeChangePassword();
      showMessage("Password updated!");
    } catch (error) {
      setChangePasswordError(error.message || "Could not update password.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

/* =========================================================
   ALBUMS
========================================================= */

function getAlbums() {
  return ensureSocial().albums;
}

function renderAlbums() {
  const container = document.getElementById("albumsGrid");
  if (!container) return;
  const albums = getAlbums();
  if (!albums.length) {
    container.innerHTML = `<p class="no-results">No albums yet. Create one to start collecting photos.</p>`;
    return;
  }
  container.innerHTML = albums.map(album => `
    <button type="button" class="album-card" onclick="openAlbum('${escapeHTML(album.id)}')">
      <div class="album-cover">
        ${album.images[0]
          ? `<img src="${escapeHTML(album.images[0])}" alt="${escapeHTML(album.name)}">`
          : `<div class="album-empty">🗂</div>`
        }
      </div>
      <strong>${escapeHTML(album.name)}</strong>
      <small>${album.images.length} photo${album.images.length === 1 ? "" : "s"}</small>
    </button>
  `).join("");
}

function createAlbum() {
  const name = prompt("Name your new album:");
  if (!name || !name.trim()) return;
  getAlbums().push({
    id: "album_" + Date.now(),
    name: name.trim(),
    images: []
  });
  saveData();
  renderAlbums();
  showMessage("Album created! Open it to start adding photos.");
}

function openAlbum(id) {
  activeAlbumId = id;
  const album = getAlbums().find(a => a.id === id);
  if (!album) return;
  const title = document.getElementById("albumModalTitle");
  if (title) title.textContent = album.name;
  renderAlbumModalGrid();
  document.getElementById("albumModal")?.classList.remove("hidden");
}

function renderAlbumModalGrid() {
  const album = getAlbums().find(a => a.id === activeAlbumId);
  const grid = document.getElementById("albumModalGrid");
  if (!album || !grid) return;
  if (!album.images.length) {
    grid.innerHTML = `<p class="no-results">No photos yet. Tap "+ Add" to add your first one.</p>`;
    return;
  }
  grid.innerHTML = album.images.map((src, index) => `
    <div class="album-photo">
      <img src="${escapeHTML(src)}" alt="${escapeHTML(album.name)} photo">
      <button onclick="removePhotoFromAlbum(${index})" aria-label="Remove photo">×</button>
    </div>
  `).join("");
}

function addPhotoToAlbum() {
  document.getElementById("albumPhotoInput")?.click();
}

const albumPhotoInput = document.getElementById("albumPhotoInput");
if (albumPhotoInput) {
  albumPhotoInput.addEventListener("change", async function () {
    const files = Array.from(this.files || []);
    this.value = "";
    if (!files.length) return;
    const album = getAlbums().find(a => a.id === activeAlbumId);
    if (!album) return;
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      showMessage("Please choose image files.");
      return;
    }
    showMessage(imageFiles.length > 1 ? "Adding photos…" : "Adding photo…");
    try {
      const compressed = await Promise.all(
        imageFiles.map(file => compressImageFile(file, 1400, 0.82))
      );
      const urls = await Promise.all(compressed.map(dataUrl => uploadMedia(dataUrl, "image")));
      album.images.push(...urls);
      if (saveData()) {
        renderAlbumModalGrid();
        renderAlbums();
        showMessage("Photo added to album!");
      }
    } catch (error) {
      console.error(error);
      showMessage("Couldn't add one of those photos.");
    }
  });
}

function removePhotoFromAlbum(index) {
  const album = getAlbums().find(a => a.id === activeAlbumId);
  if (!album) return;
  if (!confirm("Remove this photo from the album?")) return;
  album.images.splice(index, 1);
  saveData();
  renderAlbumModalGrid();
  renderAlbums();
}

/* =========================================================
   MODALS
========================================================= */

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

/* ---------------------------------------------------------
   In-app prompt/confirm — replaces window.prompt()/confirm().
   Native browser dialogs can't be styled (they render outside
   the page, as plain browser chrome), so admin actions like
   renaming an account or confirming a delete use this themed
   modal instead. Same call shape as the native versions:
   appPrompt() resolves to the entered string, or null if
   cancelled; appConfirm() resolves to true/false.
--------------------------------------------------------- */

let promptModalResolve = null;

function openPromptModal({ title, message, okLabel = "OK", cancelLabel = "Cancel", showInput = false, inputType = "text", defaultValue = "", danger = false }) {
  return new Promise(resolve => {
    // If one of these is already open, cancel it rather than leaving its
    // promise dangling forever.
    if (promptModalResolve) resolvePromptModal(showInput ? null : false);

    promptModalResolve = resolve;
    document.getElementById("promptModalTitle").textContent = title;
    document.getElementById("promptModalMessage").textContent = message;

    const inputWrap = document.getElementById("promptModalInputWrap");
    const input = document.getElementById("promptModalInput");
    inputWrap.classList.toggle("hidden", !showInput);
    if (showInput) {
      input.type = inputType;
      input.value = defaultValue;
    }

    const okButton = document.getElementById("promptModalOk");
    okButton.textContent = okLabel;
    okButton.classList.toggle("danger-button", danger);
    okButton.classList.toggle("primary-btn", !danger);
    document.getElementById("promptModalCancel").textContent = cancelLabel;

    document.getElementById("promptModal").classList.remove("hidden");
    if (showInput) {
      // Let the modal finish becoming visible before focusing.
      setTimeout(() => { input.focus(); input.select(); }, 0);
    }
  });
}

function resolvePromptModal(value) {
  document.getElementById("promptModal")?.classList.add("hidden");
  const resolve = promptModalResolve;
  promptModalResolve = null;
  if (resolve) resolve(value);
}

function appPrompt(message, { title = "Nea's Boarding Horse", okLabel = "OK", cancelLabel = "Cancel", defaultValue = "", inputType = "text" } = {}) {
  return openPromptModal({ title, message, okLabel, cancelLabel, showInput: true, inputType, defaultValue });
}

function appConfirm(message, { title = "Please confirm", okLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  return openPromptModal({ title, message, okLabel, cancelLabel, showInput: false, danger });
}

document.getElementById("promptModalOk")?.addEventListener("click", () => {
  const isPrompt = !document.getElementById("promptModalInputWrap")?.classList.contains("hidden");
  resolvePromptModal(isPrompt ? document.getElementById("promptModalInput").value : true);
});

document.getElementById("promptModalCancel")?.addEventListener("click", () => {
  const isPrompt = !document.getElementById("promptModalInputWrap")?.classList.contains("hidden");
  resolvePromptModal(isPrompt ? null : false);
});

document.getElementById("promptModalInput")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("promptModalOk")?.click();
  }
});

// The app already hides any open .modal on a backdrop click or Escape
// (see the window "click"/"keydown" listeners below) — but that only
// toggles the CSS class, so a pending appPrompt()/appConfirm() promise
// needs to be resolved the same way those paths close the modal.
document.getElementById("promptModal")?.addEventListener("click", event => {
  if (event.target.id === "promptModal") {
    const isPrompt = !document.getElementById("promptModalInputWrap")?.classList.contains("hidden");
    resolvePromptModal(isPrompt ? null : false);
  }
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && promptModalResolve && !document.getElementById("promptModal")?.classList.contains("hidden")) {
    const isPrompt = !document.getElementById("promptModalInputWrap")?.classList.contains("hidden");
    resolvePromptModal(isPrompt ? null : false);
  }
});

window.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.classList.add("hidden");
  }
});

window.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".modal:not(.hidden)").forEach(modal => modal.classList.add("hidden"));
});

/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function togglePassword(id) {
  const input = document.getElementById(id);
  if (!input) return;
  const button = document.getElementById(id + "Toggle");
  const showing = input.type === "password";
  input.type = showing ? "text" : "password";
  if (button) {
    button.innerHTML = `<span class="icon">${iconSVG(showing ? "eyeOff" : "eye")}</span>`;
    button.setAttribute("aria-label", showing ? "Hide password" : "Show password");
  }
}

/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {
  renderUser();
  renderFeed();
  renderFriends();
  renderNotifications();
  renderProfile();
  switchProfileTab(activeProfileTab);
  updateNotificationDot();
}

/* =========================================================
   STARTUP
   Checks whether the browser already has a valid session
   cookie (e.g. the member reloaded the page or came back
   later) before deciding whether to show the login screen
   or drop them straight into the app.
========================================================= */

async function startup() {
  initTheme();
  applyStaticIcons();

  try {
    session = await api("/api/auth/me");
    await loadStateAndEnter();
  } catch (error) {
    session = null;
    showWelcome();
  }
}

startup();

/* =========================================================
   PWA: SERVICE WORKER REGISTRATION
   Lets the browser install this site as an app (Add to Home
   Screen / desktop install) and caches the static shell for
   fast reloads. Safe to leave in even if you never deploy
   over HTTPS locally — registration just silently no-ops on
   plain http://localhost in some browsers.
========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}