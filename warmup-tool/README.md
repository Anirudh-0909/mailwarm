# 🔥 MailWarm — Free Email Warmup Tool

A full-stack email warmup tool similar to Warmforge/Instantly, built with Node.js, React, and PostgreSQL.

## Features

- **Multi-provider support** — Gmail, Outlook, and custom SMTP/IMAP
- **Automatic warmup** — Emails sent and received on a smart ramp-up schedule
- **Auto-reply engine** — Automatically replies to warmup emails via IMAP
- **Spam rescue** — Detects and moves emails from spam back to inbox
- **Analytics dashboard** — Track reputation scores, inbox rates, and volume
- **Campaign management** — Multiple campaigns with customizable schedules
- **Secure** — Passwords encrypted at rest, JWT auth

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Vite + Tailwind CSS |
| Database | PostgreSQL (free on Supabase) |
| Scheduling | node-cron |
| Auth | JWT + bcrypt |
| Email | Nodemailer (SMTP) + imapflow (IMAP) |

---

## Project Structure

```
warmup-tool/
├── backend/
│   ├── src/
│   │   ├── config/        # Database config & schema
│   │   ├── jobs/          # Cron scheduler (warmup engine)
│   │   ├── middleware/    # Auth, error handling
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Email service (SMTP/IMAP)
│   │   └── utils/         # Logger, crypto
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/         # Dashboard, Accounts, Campaigns, Analytics
    │   ├── components/    # Layout, shared UI
    │   ├── store/         # Zustand auth store
    │   └── utils/         # Axios API client
    └── package.json
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL (or free Supabase account)

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Start dev server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "VITE_API_URL=/api" > .env.local

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

### Backend `.env`

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Get free DB from supabase.com → Settings → Database → Connection string
DATABASE_URL=postgresql://user:password@host:5432/warmup_db

# Generate a random 32+ char string
JWT_SECRET=your-super-secret-jwt-key-here

# Generate a random 32 char string for password encryption
ENCRYPTION_KEY=32-char-encryption-key-here
```

---

## Free Deployment Guide

### Option A: Railway (Easiest)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add a PostgreSQL database plugin
5. Set environment variables from the template above
6. Deploy backend service (set start command: `npm start`)
7. Deploy frontend to Vercel (see below)

### Option B: Render + Supabase + Vercel

**Database (Supabase — free 500MB):**
1. Create account at [supabase.com](https://supabase.com)
2. New project → get the connection string from Settings → Database
3. Use as `DATABASE_URL`

**Backend (Render — free tier):**
1. Push backend to GitHub
2. New Web Service at [render.com](https://render.com)
3. Connect repo, set:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add all environment variables

**Frontend (Vercel — free):**
1. Push frontend to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Set environment variable:
   - `VITE_API_URL=https://your-render-backend.onrender.com/api`
4. Deploy

### Option C: Fly.io (More control)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Backend
cd backend
fly launch
fly secrets set DATABASE_URL="..." JWT_SECRET="..." ENCRYPTION_KEY="..."
fly deploy

# Frontend
cd frontend
npm run build
fly launch  # serve with a simple static server
```

---

## Gmail Setup (Important!)

For Gmail accounts, you CANNOT use your regular password. You must use an **App Password**:

1. Enable 2-Factor Authentication on your Google account
2. Go to **Google Account** → **Security** → **App Passwords**
3. Create a new app password for "Mail"
4. Use this 16-character password in MailWarm

---

## How the Warmup Scheduler Works

The scheduler runs every **15 minutes** and processes all active campaigns:

1. **Checks schedule** — Is it within the campaign's active hours/days?
2. **Calculates daily target** — Uses exponential ramp-up curve
3. **Sends warmup emails** — To accounts in the warmup pool
4. **Processes inbox** — Finds incoming warmup emails via IMAP
5. **Auto-replies** — Sends realistic replies to warmup emails
6. **Rescues spam** — Moves warmup emails from spam to inbox
7. **Updates analytics** — Records daily stats and reputation score

### Ramp-up Curve

```
Day 1:  ~2 emails/day
Day 7:  ~5-8 emails/day
Day 14: ~15-20 emails/day
Day 21: ~30-40 emails/day
Day 30: ~50+ emails/day (at max target)
```

---

## Warmup Pool

For warmup to work, you need a pool of email accounts to send/receive between.

### Option 1: Use Your Own Accounts
Add multiple email accounts you control. They'll warm each other up.

### Option 2: Community Pool
Add a `warmup_pool` table entry for shared pool accounts (requires coordination).

### Option 3: Seed Script
Create multiple Gmail/Outlook accounts and add them to the `warmup_pool` table directly.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/accounts | List email accounts |
| POST | /api/accounts | Add email account |
| DELETE | /api/accounts/:id | Remove account |
| POST | /api/accounts/:id/test | Test connection |
| GET | /api/warmup/campaigns | List campaigns |
| POST | /api/warmup/campaigns | Create campaign |
| PATCH | /api/warmup/campaigns/:id | Update status |
| DELETE | /api/warmup/campaigns/:id | Delete campaign |
| GET | /api/analytics/overview | Dashboard analytics |
| GET | /api/analytics/account/:id | Per-account analytics |

---

## Limitations on Free Tiers

| Service | Free Limit | Impact |
|---------|-----------|--------|
| Render | 750 hrs/month, sleeps after 15min | Scheduler may miss runs |
| Railway | $5 free credits | ~3 months free |
| Supabase | 500MB storage | ~100k+ emails |
| Vercel | Unlimited (static) | No impact |

**Recommendation**: Use Railway for backend (doesn't sleep) + Supabase + Vercel.

---

## Security Notes

- Email passwords are encrypted using AES-256 before storage
- JWT tokens expire after 7 days
- Rate limiting on all API routes (100 req/15min)
- CORS restricted to your frontend URL
- Never commit `.env` files to git

---

## License

MIT — use freely, modify, deploy commercially.
