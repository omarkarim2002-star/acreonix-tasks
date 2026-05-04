# Acreonix Tasks

Smart task management and AI calendar organiser by Acreonix.  
Deployed at: **tasks.acreonix.co.uk**

---

## Phase 1 Setup — Complete Step-by-Step

### Step 1 — Copy the project to your Mac

The project folder goes into: `Macintosh HD > Users > omarkarim > Documents > Task Management`

```bash
# Open Terminal and run:
cp -R /path/to/acreonix-tasks ~/Documents/Task\ Management/acreonix-tasks
cd ~/Documents/Task\ Management/acreonix-tasks
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Set up Supabase

1. Go to https://supabase.com → New project → name it `acreonix-tasks`
2. Once created, go to **SQL Editor**
3. Paste the entire contents of `supabase-schema.sql` and click **Run**
4. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret)

---

### Step 4 — Set up Clerk

1. Go to https://dashboard.clerk.com → Create application
2. Name it `Acreonix Tasks`, enable Email + Google sign-in
3. Go to **API Keys** and copy:
   - Publishable key
   - Secret key

---

### Step 5 — Set up Anthropic API

1. Go to https://console.anthropic.com
2. Create an API key

---

### Step 6 — Create environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in all the values from steps 3–5.

---

### Step 7 — Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the Acreonix Tasks landing page.

---

### Step 8 — Initialise Git and push to GitHub

```bash
git init
git add .
git commit -m "feat: Phase 1 — Acreonix Tasks initial build

- Next.js 14 app with Clerk auth
- Supabase DB with projects + tasks schema
- Claude Haiku AI task extraction
- Dashboard with project and task list views
- Mobile-responsive sidebar + bottom nav
- Full CRUD API routes for tasks and projects"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/acreonix-tasks.git
git push -u origin main
```

---

### Step 9 — Deploy to Vercel

```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to your Vercel account
# - Project name: acreonix-tasks
# - Framework: Next.js (auto-detected)
```

Then add all your environment variables in Vercel:
- Go to vercel.com > your project > Settings > Environment Variables
- Add every variable from your .env.local

```bash
# Redeploy with env vars
vercel --prod
```

---

### Step 10 — Point tasks.acreonix.co.uk to Vercel

**In Vercel:**
1. Go to your project > Settings > Domains
2. Add domain: `tasks.acreonix.co.uk`
3. Vercel will show you DNS records to add

**In your domain registrar (wherever acreonix.co.uk is registered):**
Add a CNAME record:
```
Type:  CNAME
Name:  tasks
Value: cname.vercel-dns.com
TTL:   Auto / 3600
```

Wait 5–30 minutes for DNS to propagate. Then visit https://tasks.acreonix.co.uk ✓

---

### Step 11 — Update Clerk allowed origins

In Clerk dashboard > your app > Domains:
- Add `tasks.acreonix.co.uk` as a production domain

---

## Git workflow going forward

```bash
# After making changes:
git add .
git commit -m "feat: describe what you changed"
git push

# Vercel auto-deploys on every push to main
```

---

## Project structure

```
acreonix-tasks/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract-tasks/    # AI task extraction
│   │   │   ├── projects/         # Projects CRUD
│   │   │   └── tasks/            # Tasks CRUD
│   │   ├── dashboard/
│   │   │   ├── extract/          # AI input page
│   │   │   ├── projects/         # Projects list + detail
│   │   │   └── tasks/            # Tasks list + detail + new
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── components/
│   │   └── layout/               # Logo, Sidebar, MobileNav
│   ├── lib/                      # supabase, anthropic, utils
│   └── types/                    # TypeScript types
├── supabase-schema.sql           # Run this in Supabase
├── .env.local.example            # Copy to .env.local
└── vercel.json
```

---

## Phase roadmap

| Phase | What gets built | Status |
|-------|----------------|--------|
| 1 | Foundation: auth, DB, AI extraction, task/project CRUD | ✅ Done |
| 2 | Mind map (React Flow), richer task editing | Next |
| 3 | Smart calendar, drag-drop scheduling, focus mode | — |
| 4 | Time tracking, real habit learning | — |
| 5 | Daily/weekly summaries, AI coaching | — |
