# 🚀 Deploy MailWarm in 15 Minutes — No Local Setup Needed

You only need:
- A GitHub account (free) → github.com
- A Railway account (free) → railway.app  
- A Vercel account (free) → vercel.com

---

## STEP 1 — Upload to GitHub (3 minutes)

1. Go to **github.com** → click the **+** button → **New repository**
2. Name it `mailwarm` → click **Create repository**
3. On the next page, click **uploading an existing file**
4. Drag and drop ALL the files from this zip (the `backend` folder and `frontend` folder)
5. Click **Commit changes**

✅ Your code is now on GitHub!

---

## STEP 2 — Deploy Database on Railway (3 minutes)

1. Go to **railway.app** → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select `mailwarm`
3. Click **Add a Service** → **Database** → **PostgreSQL**
4. Click on the Postgres service → go to **Variables** tab
5. Copy the `DATABASE_URL` value — you'll need it in Step 3

✅ Your database is live!

---

## STEP 3 — Deploy Backend on Railway (4 minutes)

1. Still in Railway, click **Add a Service** → **GitHub Repo** → select `mailwarm`
2. When it asks for the **Root Directory** → type `backend`
3. Click the backend service → go to **Variables** tab → click **Add Variable** and add these one by one:

```
DATABASE_URL        →  paste from Step 2
JWT_SECRET          →  type any long random text (e.g. mySecretKey12345abcXYZ)
ENCRYPTION_KEY      →  type exactly 32 characters (e.g. abcdefgh12345678abcdefgh1234567)
NODE_ENV            →  production
FRONTEND_URL        →  https://mailwarm.vercel.app  (you'll update this after Step 4)
```

4. Railway auto-deploys! Wait ~2 minutes for the green checkmark ✅
5. Click the backend service → **Settings** → copy the **Public Domain** URL
   - It looks like: `https://mailwarm-backend-production.up.railway.app`

✅ Your backend API is live!

---

## STEP 4 — Deploy Frontend on Vercel (3 minutes)

1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New Project** → Import `mailwarm` repo
3. When it shows the config page:
   - Set **Root Directory** to `frontend`
   - Under **Environment Variables**, add:
     ```
     VITE_API_URL  →  https://your-railway-url.up.railway.app/api
     ```
     (paste your Railway backend URL from Step 3, with `/api` at the end)
4. Click **Deploy** → wait ~1 minute

✅ Your frontend is live at `https://mailwarm.vercel.app`!

---

## STEP 5 — Connect Frontend ↔ Backend (1 minute)

1. Copy your Vercel URL (e.g. `https://mailwarm.vercel.app`)
2. Go back to **Railway** → your backend service → **Variables**
3. Update `FRONTEND_URL` to your Vercel URL
4. Railway auto-redeploys in ~30 seconds

---

## ✅ You're Done!

Open your Vercel URL → Register an account → Connect an email → Start warming!

---

## Gmail App Password (Required for Gmail)

Gmail blocks regular passwords. Here's how to get an App Password:

1. Go to **myaccount.google.com**
2. Click **Security** → **2-Step Verification** → turn it ON
3. Go back to **Security** → scroll down → **App Passwords**
4. Select **Mail** → **Generate**
5. Copy the 16-character password → use this in MailWarm instead of your Gmail password

---

## If Something Goes Wrong

**Backend not starting?**
- Go to Railway → your backend service → **Logs** tab → read the error

**Frontend can't connect to backend?**
- Make sure `VITE_API_URL` ends with `/api` 
- Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly

**Database error?**
- Make sure `DATABASE_URL` was copied correctly from the Postgres service

---

## Free Tier Limits

| Service | Free Limit | What happens |
|---------|-----------|--------------|
| Railway | $5 free credits (~1-2 months) | Pay $5/mo after |
| Vercel | Unlimited for static sites | Never expires |
| PostgreSQL | Included in Railway | Uses your credits |

> 💡 Tip: Railway's free $5 credit lasts about 1-2 months. After that it's ~$5/month total for backend + database. Vercel is always free.
