# NOUN Smart Active Recall Quiz System
**100% Free Stack — No credit card required**

| Service | Cost | Sign up |
|---|---|---|
| Vercel (hosting) | Free | vercel.com |
| Supabase (database + auth) | Free | supabase.com |
| Groq (AI — questions + grading) | Free | console.groq.com |
| GitHub (code) | Free | github.com |

---

## 10-Minute Deployment

### Step 1 — Supabase (5 min)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Settings → API → copy **Project URL**, **anon key**, **service_role key**
3. SQL Editor → paste `supabase/migrations/001_initial_schema.sql` → Run
4. Authentication → Users → Add User → create your admin email + password

### Step 2 — Groq Free API (1 min)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up free (no credit card)
3. API Keys → Create API Key → copy it

### Step 3 — Deploy to Vercel (4 min)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL       = your supabase project url
NEXT_PUBLIC_SUPABASE_ANON_KEY  = your supabase anon key
SUPABASE_SERVICE_ROLE_KEY      = your supabase service role key
GROQ_API_KEY                   = your groq api key
NEXT_PUBLIC_APP_URL            = https://your-project.vercel.app
```
4. Click Deploy → your live URL is ready!

---

## Admin Workflow
1. Login at `/login`
2. **Upload Material** → select course → upload PDF/DOCX → Generate Questions
3. **Quizzes** → Create Quiz → Publish → Copy Link
4. Share link with students: `/quiz/edu231-week3-quiz`
5. **Students** → view scores, expand answers, reset attempts

## AI Model
Uses **Groq's llama-3.3-70b-versatile** — completely free, fast, accurate.
Questions are generated strictly from uploaded course material only.
