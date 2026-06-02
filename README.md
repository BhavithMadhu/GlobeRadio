# 🌍 GlobeRadio

> **Explore the world through live radio.** Spin an interactive 3D globe, click any country, and instantly stream live broadcasts from that region — with favourites, listening history, and 2FA-secured accounts.

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-99.8%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

</div>

---

## Table of Contents

- [What is GlobeRadio?](#what-is-globeradio)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [How It Works](#how-it-works)
- [User Workflow](#user-workflow)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## What is GlobeRadio?

GlobeRadio is a **full-stack SaaS web application** that lets users explore the world through live radio stations. The core experience:

1. A rotatable **3D interactive globe** is the main navigation interface
2. Click any country → discover live radio stations broadcasting from that region
3. Stream audio directly in the browser, no plugins needed
4. Save favourites, track your listening history, and secure your account with **Two-Factor Authentication**

The entire application — frontend and backend — runs as a single Node.js process, making it easy to develop and deploy.

---

## Features

| Feature | Description |
|---|---|
| 🌎 **Interactive Globe** | Rotatable 3D globe — click countries to discover local stations |
| 📻 **Live Radio Streaming** | Stream audio from 30,000+ global stations via the Radio Browser API |
| 🔍 **Station Search** | Filter by country, city, or language |
| 👤 **User Accounts** | Registration, login, and password reset |
| 🔐 **Two-Factor Auth (2FA)** | TOTP-based 2FA compatible with Google Authenticator |
| ⭐ **Favourites** | Save and quickly re-access preferred stations |
| 🕒 **Listening History** | Auto-tracks your last 12 played stations |
| 📊 **User Dashboard** | Manage profile, security settings, favourites, and history |
| 🛡️ **Offline Fallback** | Curated fallback stations if the Radio Browser API is unavailable |

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** — component-based UI
- **Vite** — fast development server and production bundler
- **Plain CSS** — no framework, full styling control

### Backend
- **Node.js** + **Express.js** — REST API server
- **TypeScript** — end-to-end type safety

### Database
- **Prisma ORM** — type-safe database access
- **SQLite** — zero-config file database for development
- **PostgreSQL** — supported for production (swap the provider in `schema.prisma`)

### Security
- **PBKDF2** (Node `crypto`) — password hashing with random salt
- **TOTP** (custom `src/lib/totp.ts`) — RFC 6238 time-based one-time passwords
- **HttpOnly cookies** — session tokens inaccessible to client JavaScript

### External APIs
- **[Radio Browser API](https://www.radio-browser.info/)** — free, open catalogue of 30,000+ radio stations
- **`qrcode` npm package** — QR code generation for 2FA setup

---

## Project Structure

```
SaaS-Website/
│
├── prisma/
│   ├── schema.prisma          # Database models (User, 2FA, Favourites, History)
│   └── dev.db                 # SQLite database (auto-created on first migrate)
│
├── src/
│   ├── components/
│   │   ├── Auth.tsx           # Sign up, login, password reset, 2FA challenge
│   │   ├── Dashboard.tsx      # User profile, favourites, history, security settings
│   │   ├── Globe.tsx          # Interactive 3D globe with country selection
│   │   ├── Header.tsx         # Top navigation bar and logout
│   │   ├── Player.tsx         # Live audio streaming player
│   │   └── Sidebar.tsx        # Saved favourites panel
│   │
│   ├── lib/
│   │   └── totp.ts            # Custom TOTP implementation (secret gen, verify, recovery codes)
│   │
│   ├── App.tsx                # Root component — auth state and view routing
│   ├── main.tsx               # React entry point
│   └── types.ts               # Shared TypeScript types
│
├── server.ts                  # Express backend — all API routes, sessions, auth logic
├── index.html                 # Single HTML entry point for the SPA
├── vite.config.ts             # Vite bundler configuration
├── tsconfig.json              # TypeScript compiler config
├── package.json               # Dependencies and scripts
├── metadata.json              # Project metadata
└── .env.example               # Environment variable template
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** (included with Node.js)
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/BhavithMadhu/SaaS-Website.git
cd SaaS-Website

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# 4. Create the database and run migrations
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev
```

Open **http://localhost:3000** — the app will be running with hot-reload enabled.

### Production Build

```bash
# Build the frontend
npm run build

# Start the production server
NODE_ENV=production node server.ts
```

In production mode, Express serves the pre-built static files from `dist/` instead of using Vite's dev middleware.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Database connection string
# For development (SQLite):
DATABASE_URL="file:./prisma/dev.db"

# For production (PostgreSQL):
# DATABASE_URL="postgresql://user:password@host:5432/globeradio"

# Server port
PORT=3000

# Node environment
NODE_ENV=development
```

> **Switching to PostgreSQL for production:** Update `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`, update `DATABASE_URL`, then run `npx prisma migrate deploy`.

---

## API Reference

All endpoints are served by `server.ts`. Authenticated endpoints require a valid `session_token` cookie.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/signup` | ❌ | Register a new account |
| `POST` | `/api/auth/login` | ❌ | Login with email + password |
| `POST` | `/api/auth/totp-challenge` | ❌ (pending) | Submit 2FA code to complete login |
| `POST` | `/api/auth/logout` | ✅ | Destroy session |
| `GET` | `/api/auth/status` | ❌ | Check current auth state |
| `POST` | `/api/auth/reset-password` | ❌ | Reset password by email |
| `PUT` | `/api/auth/profile` | ✅ | Update name or password |
| `GET` | `/api/auth/2fa/setup` | ✅ | Get 2FA secret + QR code |
| `POST` | `/api/auth/2fa/verify` | ✅ | Verify code and enable 2FA |
| `POST` | `/api/auth/2fa/disable` | ✅ | Disable 2FA |

### Radio Stations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/stations/search` | ❌ | Search stations (`?country=`, `?city=`, `?language=`, `?query=`, `?limit=`) |
| `GET` | `/api/stations/favorites` | ✅ | Get all saved favourites |
| `POST` | `/api/stations/favorites` | ✅ | Save a station to favourites |
| `DELETE` | `/api/stations/favorites/:stationId` | ✅ | Remove a favourite |
| `GET` | `/api/stations/recents` | ✅ | Get last 12 played stations |
| `POST` | `/api/stations/recents` | ✅ | Record a station play |
| `GET` | `/api/stations/active-stats` | ❌ | Live signal and listener stats |

---

## Database Schema

Four models defined in `prisma/schema.prisma`:

```
User
 ├── id          String   (UUID, PK)
 ├── email       String   (unique)
 ├── passwordHash String
 ├── name        String
 └── createdAt   DateTime

TwoFactorSettings  (optional, one per User)
 ├── id            String   (UUID, PK)
 ├── userId        String   (FK → User)
 ├── secret        String   (TOTP secret, base32)
 ├── enabled       Boolean
 ├── recoveryCodes String   (JSON array of 8 codes)
 └── createdAt     DateTime

FavoriteStation  (many per User)
 ├── id        String   (UUID, PK)
 ├── userId    String   (FK → User)
 ├── stationId String
 ├── name, url, favicon, tags, country, frequency, bitrate
 └── createdAt DateTime

RecentlyPlayed  (many per User)
 ├── id        String   (UUID, PK)
 ├── userId    String   (FK → User)
 ├── stationId String
 ├── name, url, favicon, country
 └── playedAt  DateTime
```

---

## How It Works

GlobeRadio uses a **unified server architecture** — a single Express process handles both the API and serves the React frontend:

```
Browser
  │
  │  HTTP requests
  ▼
Express Server (server.ts : 3000)
  │
  ├── /api/*  ──────────────────── REST API routes
  │     ├── Auth (PBKDF2 + TOTP)
  │     ├── Station search (proxies Radio Browser API)
  │     └── Favourites & History (Prisma → SQLite)
  │
  └── /*  ────────────────────────── React SPA
        ├── Dev:  Vite middleware (HMR)
        └── Prod: Static files from dist/
```

**Session flow:** Tokens are random UUIDs stored in a server-side `Map<string, SessionData>` and sent to the browser as `HttpOnly; SameSite=Lax` cookies. The session middleware runs on every request and attaches the user object (or a pending 2FA flag) to the request before routing.

**Radio API proxy:** The frontend never calls the Radio Browser API directly. All station searches go through the Express backend, which adds a timeout, enriches results with FM frequency labels, and falls back to a curated hardcoded list if the upstream API is unavailable.

---

## User Workflow

### New User Journey

```
Visit app → Register (email + password) → Session created → Globe view
```

### Login (with 2FA)

```
Enter credentials
  │
  ├── 2FA disabled → Session fully authenticated → Globe view
  │
  └── 2FA enabled  → "need2fa" session state
                        │
                        └── Enter 6-digit TOTP code (or recovery code)
                              │
                              ├── Valid → Session upgraded → Globe view
                              └── Invalid → Error, retry
```

### Discovering and Playing Radio

```
Spin globe → Click country
  │
  └── GET /api/stations/search?country=...
        │
        ├── Radio Browser API (live) → up to 40 stations returned
        └── Fallback (API down)      → 5 curated stations returned

Select station → Player streams audio → POST /api/stations/recents
```

### Setting Up 2FA

```
Dashboard → Enable 2FA
  │
  └── GET /api/auth/2fa/setup
        │
        └── QR code displayed
              │
              └── Scan with Google Authenticator
                    │
                    └── Enter 6-digit code → POST /api/auth/2fa/verify
                          │
                          └── Verified → 2FA enabled + 8 recovery codes shown
```

---

## Security

| Concern | Approach |
|---|---|
| Password storage | PBKDF2-SHA512 with random 16-byte salt, 1,000 iterations |
| Session tokens | `crypto.randomUUID()`, stored server-side, sent as `HttpOnly` cookie |
| CSRF protection | `SameSite=Lax` cookies |
| 2FA | TOTP (RFC 6238) — SHA1-HMAC, 6 digits, 30-second window |
| Recovery codes | 8 single-use codes; consumed and deleted after use |
| Clock drift | TOTP verifier accepts ±1 time window (±30 seconds) |

---

## Known Limitations

| Limitation | Notes |
|---|---|
| In-memory sessions | Sessions are lost on server restart. Use Redis or DB-backed sessions for production. |
| No email on password reset | Password reset does not send a verification email. Integrate SendGrid / Resend for production. |
| No rate limiting | Auth endpoints have no brute-force protection. Add `express-rate-limit`. |
| SQLite | Not suitable for concurrent production load. Migrate to PostgreSQL. |
| Monolithic `server.ts` | All backend logic is in one file. Split into route modules as the codebase grows. |

---

## Contributing

Contributions are welcome. To get started:

```bash
# Fork the repo, then:
git clone https://github.com/<your-username>/SaaS-Website.git
cd SaaS-Website
npm install
npx prisma migrate dev --name init
npm run dev
```

Please open an issue before submitting a large pull request so we can discuss the approach.

---

<div align="center">


</div>
