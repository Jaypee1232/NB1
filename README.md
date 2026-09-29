# Nea's Boarding Horse

Nea's Boarding Horse is a private community website with a browser frontend, an Express backend, Firestore for application data, and Cloudinary for uploaded photos/videos.

## Project structure

```text
nbh/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── theme.css
│   ├── script.js
│   ├── manifest.webmanifest
│   └── service-worker.js
├── server/
│   ├── server.js
│   ├── firestore-store.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── .gitignore
└── README.md
```

## How it works

```text
Browser
  ↓
Express server
  ├── Firebase Admin → Firestore
  └── Cloudinary → photos/videos
```

Passwords are hashed with bcrypt. Sessions use an httpOnly JWT cookie. Normal members receive public community data plus their own private social data. Admin routes are checked on the server.

## Run locally

You need Node.js 18 or newer.

```bash
cd server
npm install
npm start
```

The site is then available at `http://localhost:3000`.

Before starting the server, copy `server/.env.example` to `server/.env` and fill in your own Firebase, Cloudinary, JWT, and password values. Never commit `server/.env`.

## Firebase / Firestore

The application stores its shared state in Firestore. The current store uses the `nbh/state` and `nbh/credentials` documents. The server account must have permission to read and write Firestore.

For local development, you can use either:

- `FIREBASE_SERVICE_ACCOUNT` containing the complete Firebase service-account JSON as one line.
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local service-account JSON file.

Do not place a Firebase private key in the repository, ZIP file, `.env.example`, frontend code, or browser storage.

## Cloudinary

Uploaded media is sent to `/api/upload`, then forwarded to Cloudinary. The application stores the returned media URL instead of storing the file in Firestore.

Set these environment variables:

```text
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

The backend validates the media type and size. The current maximum is 15 MB for videos and 8 MB for images.

## Production deployment

For a Node host such as Render:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Add the environment variables from `server/.env.example` in the host dashboard.

Do not upload `.env` or a Firebase service-account JSON file to the repository.

For production, the server requires:

- `JWT_SECRET`
- `ADMIN_PASSWORD`
- all six `SEED_PASSWORD_*` values
- Firebase credentials
- Cloudinary credentials

The six seed passwords are only used when the Firestore database is first created. In development, missing seed passwords are generated and printed to the server console. In production, all six must be set explicitly. After the first seed, normal account management is handled through the admin panel.

## Important security notes

1. If credentials from an older copy of this project were ever committed or shared, rotate them before deployment. This includes Firebase service-account keys, Cloudinary API secrets, and JWT secrets.
2. Never use the example values in production.
3. Keep `.env` out of Git.
4. Do not place real secrets in `.env.example`.
5. Keep the admin password private.

## Main features

- Login-only private community
- Shared community feed
- Member profiles
- Posts with text, photos, and videos
- Comments
- Reactions
- Reposts
- Saved posts
- Albums
- Notifications
- Admin account management
- Admin post management
- Cloudinary media storage
- Firestore shared data
- Live polling for feed updates
- Light/dark theme support
- PWA/service-worker support
