# Deploy Smart Job Tracker (free hosting)

Public URLs after deploy:
- **UI:** `https://your-app.vercel.app` (Vercel)
- **API:** `https://sjt-gateway-xxxx.onrender.com` (Render)

---

## Part 1 — Backend on Render (~15 min)

### Step 1: Create Render account
1. Go to **https://render.com** and sign up (GitHub login is easiest).

### Step 2: Deploy from Blueprint
1. Open: **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**
3. Connect your GitHub account if asked.
4. Select repo: **`ajitmishra0110/SmartJobTracker`**
5. Render reads `render.yaml` and creates:
   - PostgreSQL database
   - `sjt-auth`, `sjt-job`, `sjt-ai`, `sjt-gateway` (4 services)
6. Click **Apply**

### Step 3: Set required secrets
After blueprint starts, open each service in Render dashboard:

**sjt-ai** → Environment → add:
```
OPENAI_API_KEY = your-gemini-or-openai-key
```

**sjt-gateway** → Environment → add (after Vercel deploy in Part 2):
```
CORS_ALLOWED_ORIGINS = https://YOUR-VERCEL-URL.vercel.app
```

### Step 4: Wait for deploy
- First build takes **10–20 minutes** (Maven + Docker per service).
- When **sjt-gateway** shows **Live**, copy its URL:
  `https://sjt-gateway-xxxx.onrender.com`

Test API:
```
https://sjt-gateway-xxxx.onrender.com/auth/signup
```
(POST with JSON body from Postman or the UI once deployed)

---

## Part 2 — Frontend on Vercel (~5 min)

### Step 1: Create Vercel account
1. Go to **https://vercel.com** and sign up with GitHub.

### Step 2: Import project
1. **Add New → Project**
2. Import **`ajitmishra0110/SmartJobTracker`**
3. Set **Root Directory** to: `job-tracker-ui`
4. Framework Preset: **Create React App**

### Step 3: Environment variable
Add before deploy:
```
REACT_APP_API_URL = https://sjt-gateway-xxxx.onrender.com
```
(use your real gateway URL from Part 1)

### Step 4: Deploy
Click **Deploy**. Your UI URL will be like:
```
https://smart-job-tracker-xxxx.vercel.app
```

### Step 5: Update CORS on Render
Go back to **sjt-gateway** on Render → Environment:
```
CORS_ALLOWED_ORIGINS = https://smart-job-tracker-xxxx.vercel.app
```
Save (gateway redeploys automatically).

---

## Part 3 — Test the live app

1. Open your **Vercel URL**
2. Sign up for a new account
3. Add a job to the pipeline
4. Try AI features (requires `OPENAI_API_KEY` on sjt-ai)

**Note:** Render free tier services **sleep after ~15 min idle**. First request after sleep takes **30–60 seconds** to wake up.

---

## Quick links

| What | URL |
|------|-----|
| GitHub repo | https://github.com/ajitmishra0110/SmartJobTracker |
| Render dashboard | https://dashboard.render.com |
| Vercel dashboard | https://vercel.com/dashboard |
| One-click Render blueprint | https://dashboard.render.com/select-repo?type=blueprint |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| UI can't reach API | Check `REACT_APP_API_URL` matches gateway URL exactly |
| CORS error in browser | Set `CORS_ALLOWED_ORIGINS` on sjt-gateway to your Vercel URL |
| AI features fail | Set `OPENAI_API_KEY` on sjt-ai service |
| 503 / slow first load | Free tier waking up — wait 60s and retry |
| Signup fails | Check sjt-auth and database are Live on Render |

---

## Cost

| Service | Free tier |
|---------|-----------|
| Render (4 services + DB) | Free (DB 90 days, services sleep when idle) |
| Vercel (UI) | Free |
| Gemini/OpenAI API | Pay per use (your API key) |
