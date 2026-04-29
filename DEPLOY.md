# Lakowe SPA — Deployment Guide

> Estimated time: **45 minutes**
> Cost: **₦0/month** (both platforms have free tiers that cover this project)

---

## What you need before starting

- [ ] A laptop or desktop (any OS)
- [ ] A GitHub account → github.com
- [ ] A Supabase account → supabase.com
- [ ] A Vercel account → vercel.com (sign in with GitHub)
- [ ] Node.js 18+ installed → nodejs.org

---

## STEP 1 — Install Node.js (if not installed)

1. Go to https://nodejs.org
2. Download the **LTS** version
3. Install it (click through the wizard)
4. Open a terminal and verify: `node --version` → should show v18+

---

## STEP 2 — Set up Supabase (database + auth + storage)

### 2a. Create project
1. Go to **https://supabase.com** and sign in
2. Click **New Project**
3. Name: `lakowe-spa`
4. Database password: choose a strong password and save it
5. Region: `West EU (Ireland)` or nearest to Lagos
6. Click **Create new project** (takes ~2 minutes)

### 2b. Run the database schema
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations/001_schema.sql` from this project
4. **Select all** (Ctrl+A) and **copy** the entire contents
5. **Paste** into the SQL Editor
6. Click **Run** (Ctrl+Enter)
7. You should see: `Success. No rows returned`

### 2c. Create storage buckets
1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket** and create these 5 buckets:

| Bucket name   | Public? |
|---------------|---------|
| site-photos   | ✅ Yes  |
| snag-photos   | ✅ Yes  |
| documents     | ❌ No   |
| approval-docs | ❌ No   |
| avatars       | ✅ Yes  |

### 2d. Get your API keys
1. In Supabase, click **Settings** → **API**
2. Copy these two values (you'll need them in Step 4):
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## STEP 3 — Set up the project locally

Open a terminal and run:

```bash
# Navigate to wherever you want the project
cd ~/Documents

# If you're using the files from this build:
# Copy the entire lakowe-spa folder here, then:
cd lakowe-spa

# Install all dependencies (takes 1-2 minutes)
npm install
```

---

## STEP 4 — Configure environment variables

1. In the `lakowe-spa` folder, find the file `.env.example`
2. Make a copy and rename it `.env` (no `.example`)
3. Open `.env` in any text editor (Notepad, VS Code, etc.)
4. Fill in your Supabase values from Step 2d:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. Save the file

### Test it locally
```bash
npm run dev
```
Open http://localhost:5173 in your browser. You should see the login page!

---

## STEP 5 — Create your first user account

1. Go to http://localhost:5173
2. Click **"Don't have an account? Sign up"**
3. Enter your name, email and a password
4. Click **Create Account**
5. You should be logged in and see the dashboard

### Make yourself an admin
1. In Supabase, click **Table Editor** → `profiles`
2. Find your row (by email)
3. Click the `role` cell and change it from `viewer` to `admin`
4. Click **Save**
5. Refresh the app — you now have full access

---

## STEP 6 — Push to GitHub

```bash
# In the lakowe-spa folder:
git init
git add .
git commit -m "Initial build — Lakowe SPA Project Command Centre"

# Create a new repository on GitHub:
# 1. Go to github.com → click + → New repository
# 2. Name: lakowe-spa
# 3. Keep it Private
# 4. Click Create repository
# 5. Copy the commands it shows you, roughly:

git remote add origin https://github.com/YOUR_USERNAME/lakowe-spa.git
git branch -M main
git push -u origin main
```

---

## STEP 7 — Deploy to Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **Add New Project**
3. Find and select your `lakowe-spa` repository
4. Click **Import**
5. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
6. Click **Deploy**
7. Vercel builds and deploys (takes ~1-2 minutes)
8. Click the URL it gives you — your app is live! 🎉

---

## STEP 8 — (Optional) Custom domain

If you have a domain (e.g. `spa.lakowe.com` or `spaproject.mixtaafrica.com`):
1. In Vercel, go to your project → **Settings** → **Domains**
2. Add your domain
3. Update your domain's DNS records as Vercel instructs
4. Takes 5-30 minutes to propagate

---

## STEP 9 — Invite your team

After the app is live:
1. Share the URL with your team
2. Each person creates their own account via the Sign Up screen
3. You (as admin) go to Supabase → Table Editor → `profiles`
4. Find each person and set their `role`:
   - `admin` — full access (you + other PMs)
   - `pm` — project management access
   - `engineer` — site engineers
   - `contractor` — contractors (limited write access)
   - `client` — Mixta Africa client reps (view only + approvals)
   - `viewer` — read only

---

## STEP 10 — Enter your contract data

Once the app is live, the first things to fill in:
1. **Financial** → Add the main contract sum (replace ₦0 placeholder)
2. **Procurement** → Add all 30+ procurement items
3. **Team** → Record the first site meeting
4. **Schedule** → Verify and adjust start/finish dates for tasks

---

## Keeping data backed up

Supabase automatically backs up your database daily on the free tier.
For additional peace of mind:
1. In Supabase → **Settings** → **Database**
2. Click **Download backup** weekly

---

## Troubleshooting

**"Missing Supabase environment variables" error**
→ Make sure your `.env` file exists (not `.env.example`) and has the correct values

**Can't log in / sign up**
→ In Supabase → **Authentication** → **Settings**, make sure email confirmations are disabled (or check your email for a confirmation link)

**Photos not uploading**
→ Make sure you created the storage buckets in Step 2c with the exact names listed

**White screen after login**
→ Check the browser console (F12) for errors. Most likely the schema wasn't fully applied — re-run the SQL.

**Build fails on Vercel**
→ Check that both environment variables are set correctly in Vercel settings

---

## Tech reference

| Component | Service | Free tier limit |
|-----------|---------|-----------------|
| Database | Supabase | 500MB, unlimited rows |
| Auth | Supabase | 50,000 monthly active users |
| Storage | Supabase | 1GB |
| Hosting | Vercel | Unlimited deployments, 100GB bandwidth |
| Realtime | Supabase | 200 concurrent connections |

---

*Built with React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Recharts*
*Lakowe Lakes Hospitality Ltd / Mixta Africa — Confidential*
