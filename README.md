# <img src="/client/public/logo192.png" width="32" height="32" align="center"> SwiftTalk

A lightweight, real-time chat application with AI-powered helpers (smart replies, translations, chat summaries), file sharing, push notifications and group/private chats.

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white&style=flat)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB&style=flat)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white&style=flat)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white&style=flat)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white&style=flat)](https://www.mysql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white&style=flat)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat)](https://vercel.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web-blue?style=flat)]()
[![Status](https://img.shields.io/badge/status-active-brightgreen)]()

---

## Quick features
- Real-time messaging and presence (Socket.IO)
- Private & group chats, message replies, forward and visibility controls
- File uploads (chunk-friendly) and attachments
- Push notifications (Web Push / VAPID)
- AI features: smart replies, translations, summaries (Gemini integration)
- Auth with OTP, JWT access/refresh, and session management

---

## Tech stack 
- Frontend: React (client/), optional Electron build
- Backend: Node.js + Express (server/), Socket.IO
- DB: MySQL via Prisma ORM
- Cache / presence: Redis (optional — in-memory fallback available)
- Push: web-push (VAPID)
- Auth: JWT + OTP

---

## Quick start — development (minimal)

Prerequisites:
- Node 18+
- MySQL (or a MySQL-compatible server)
- Redis (optional)

1. Clone
```bash
git clone https://github.com/RushiK8626/ConvoHub-Chat-Messaging-App.git
cd ConvoHub-Chat-Messaging-App
```

2. Start backend
```bash
cd server
npm install
# create and edit .env (see env samples below)
npx prisma generate
npx prisma migrate dev      # applies migrations (interactive)
npm run dev                 # nodemon - development
# or `npm start` for production node server
```

3. Start frontend
```bash
cd ../client
npm install
# (optional) create .env with REACT_APP_API_URL
npm start                   # launches dev server (default: http://localhost:3000)
```

Open the frontend: http://localhost:3000
Backend default: http://localhost:3001

---

## Environment (examples)

Server (.env) — either DATABASE_URL or DB_* vars are supported
```env
# Database (either single URL or components)
DATABASE_URL="mysql://user:password@localhost:3306/convohub"
# OR
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=secret
DB_NAME=convohub
DB_PORT=3306

# JWT
JWT_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Redis (optional)
# Use either REDIS_URL or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/REDIS_TLS
REDIS_URL="redis://localhost:6379"
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# AI & Push
GEMINI_API_KEY="your-gemini-api-key"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Server port (optional)
PORT=3001
```

Client (.env)
```env
REACT_APP_API_URL=http://localhost:3001
```

Notes:
- Redis is optional — server has an in-memory fallback but some features (presence, scalable session data) work best with Redis.
- VAPID keys are required for web-push notifications to work.

---

## Database & migrations
- Prisma schema: server/prisma/schema.prisma
- Apply migrations (development):
  - npx prisma migrate dev
- For non-destructive sync (not recommended for prod): npx prisma db push
- Open Prisma Studio: npx prisma studio

---

## Useful scripts

Server (server/package.json)
- npm run dev — start with nodemon (development)
- npm start — run node server (production)
- npm test — run Jest tests
- npm run db:generate / db:push / db:studio — Prisma helpers

Client (client/package.json)
- npm start — start dev server (CRA + craco)
- npm run build — production build (build/)
- npm test — run tests

---

## API & socket
Primary API roots (see server/src/routes):
- /api/auth       — login, register, OTP, refresh token, logout
- /api/users      — user profiles
- /api/chats      — create/update/delete chats and members
- /api/messages   — send/read/forward/upload attachments
- /api/notifications — push subscription endpoints
- /api/ai         — AI helpers (smart replies, summaries, translate)
- /uploads        — static uploads served

Health:
- GET /health — reports DB and Redis availability

Real-time:
- Socket.IO path: /socket.io/ (use socket.io-client on frontend)
- Max buffer set to support large file transfers (100MB in server config)

---

## Push notifications
- Uses web-push with VAPID keys (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
- Server stores push subscriptions in the database (PushSubscription model).
- If a subscription becomes invalid (410/404), server removes it.

---

## Common troubleshooting
- DB connection failed: check DATABASE_URL or DB_* env vars and ensure MySQL is reachable from server.
- Redis not connecting: server will continue in-memory, but presence/scale features may be limited. Verify REDIS_URL or REDIS_HOST and REDIS_TLS if using cloud services.
- Port conflicts: default client port 3000, server 3001 — change PORT or REACT_APP_API_URL as needed.
- Auth issues: client stores accessToken/refreshToken in localStorage. Use /api/auth endpoints to obtain tokens.
- 
---

## License & author
- MIT License — see LICENSE file
- Author: Rushikesh Kadepurkar — GitHub: @RushiK8626

---
