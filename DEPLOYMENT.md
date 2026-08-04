# Deploying Check Proof Submission App to Vercel

This app has two pages:

- `/submit` — the form sales reps use to upload the check photo, deposit slip photo, and deal details. Protected by a shared **rep access code**.
- `/dashboard` — a searchable, exportable list of every submission with links/thumbnails to the photos. Protected by a separate **admin access code**.

There's no automated email — the dashboard *is* the "who's deposited what" view. (You can add email later; see the note at the bottom.)

## What you'll need (all free tier)

1. A [Vercel](https://vercel.com) account (sign up with GitHub, GitLab, or email).
2. A GitHub repository containing this code (Vercel deploys from a git repo).

## Step 1 — Push this code to GitHub

1. Create a new empty repository on GitHub (e.g. `checkproof-app`).
2. From this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/checkproof-app.git
   git push -u origin main
   ```

## Step 2 — Create the Vercel project

1. Go to https://vercel.com/new and import the GitHub repo you just created.
2. Framework preset should auto-detect as **Next.js** — leave build settings as default.
3. Don't click Deploy yet — first add the storage below (Step 3), or deploy now and add env vars/storage after (you'll just need to redeploy once you do).

## Step 3 — Add a Postgres database

1. In your new Vercel project, go to the **Storage** tab.
2. Click **Create Database** → choose **Postgres** (Neon, via the Vercel Marketplace) → follow the prompts to create it and connect it to your project.
3. This automatically adds a `DATABASE_URL` environment variable to your project. (If it instead creates `POSTGRES_URL` only, copy that value into a `DATABASE_URL` env var too — see Step 5.)

The app automatically creates its `submissions` table the first time it runs — no manual SQL needed.

## Step 4 — Add Blob storage (for the photo uploads)

1. Still in the **Storage** tab, click **Create Database** (or **Create Store**) → choose **Blob**.
2. Connect it to your project. This adds a `BLOB_READ_WRITE_TOKEN` environment variable automatically.

## Step 5 — Set the remaining environment variables

In your Vercel project, go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `SESSION_SECRET` | A long random string. Generate one locally with `openssl rand -base64 32`, or use any password generator. |
| `REP_ACCESS_CODE` | The code you'll give sales reps, e.g. `TTSS-Reps-2026`. |
| `ADMIN_ACCESS_CODE` | The code you'll give managers to view the dashboard, e.g. `TTSS-Mgr-2026`. Keep this different from the rep code and share it only with people who should see all submissions. |

`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` should already be there from Steps 3–4.

## Step 6 — Deploy

Click **Deploy** (or, if you already deployed, go to the **Deployments** tab and redeploy so the new env vars take effect).

Once it's live you'll get a URL like `https://checkproof-app.vercel.app`.

- Give sales reps: `https://checkproof-app.vercel.app/submit` + the rep access code.
- Give managers: `https://checkproof-app.vercel.app/dashboard` + the admin access code.

(Optional) Add a custom domain like `checks.toptiersolarsolutions.com` under **Settings → Domains**.

## Using it

- A rep opens `/submit`, enters the access code once (it's remembered for 30 days on that device/browser), and fills out: Sales Rep Name, Sales Team Name, Customer Name, Customer Address, Down Payment Amount, Deposit Date, Check Photo, Deposit Slip Photo, and optional Notes.
- On mobile, the photo fields open the camera directly.
- Every submission appears instantly on `/dashboard`, searchable by rep, team, customer, or address, with an **Export CSV** button and click-to-preview photos.

## Adding automated email later (optional)

If down the road you want an email sent to a distribution list every time someone submits, that's a small addition: add an email-sending step (e.g. Resend, SendGrid, or your Gmail account) inside `src/app/api/submissions/route.ts` right after the database insert. Just ask and it can be wired in.

## Local development

```bash
cp .env.example .env.local   # fill in DATABASE_URL, BLOB_READ_WRITE_TOKEN, SESSION_SECRET, access codes
npm install
npm run dev
```
