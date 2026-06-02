# 🌍 GlobeRadio

GlobeRadio is a full-stack SaaS web application that allows users to explore the world through live radio stations. Users can spin an interactive globe, discover stations from different countries, listen to live broadcasts, save favorites, track listening history, and secure their accounts with Two-Factor Authentication (2FA).

---

## 🚀 Features

### 🌎 Interactive Globe Navigation
- Rotatable and interactive globe interface
- Click countries to discover local radio stations
- Smooth globe animations and country selection

### 📻 Global Radio Discovery
- Search stations by:
  - Country
  - City
  - Language
- Stream live radio broadcasts directly within the application
- Real-time station information display

### 👤 User Authentication
- User registration
- Secure login/logout
- Password reset functionality
- Session management

### 🔐 Two-Factor Authentication (2FA)
- Google Authenticator compatible
- QR code generation
- TOTP verification
- Recovery codes support

### ⭐ Favorites System
- Save favorite radio stations
- Persistent user-specific storage
- Quick access dashboard

### 🕒 Listening History
- Track recently played stations
- Personalized listening history
- Database persistence

### 📊 User Dashboard
- Profile management
- Favorite stations
- Recently played stations
- Security settings

---

## 🏗️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- Prisma ORM
- SQLite (Development)
- PostgreSQL Ready (Production)

### Security
- PBKDF2 Password Hashing
- TOTP Authentication
- Session Management
- Recovery Codes

### External APIs
- Radio Browser API

---

## 📂 Project Structure

```text
globeradioapp/
│
├── assets/
├── prisma/
│   ├── dev.db
│   └── schema.prisma
│
├── src/
│   ├── components/
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Globe.tsx
│   │   ├── Header.tsx
│   │   ├── Player.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── lib/
│   │   └── totp.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts
│
├── server.ts
├── package.json
├── vite.config.ts
└── README.md
