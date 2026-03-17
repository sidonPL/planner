# 🚀 Deployment Guide

Quick deployment instructions for Vercel.

## Development

```bash
npm install
cp .env.example .env.local
# Update .env.local with your database URL

npm run db:migrate:dev
npm run dev
```

Open http://localhost:3000

## Production (Vercel)

### 1. Push to Git
```bash
git push origin main
```

### 2. Import on Vercel
- https://vercel.com → **New Project**
- Select `planner` repository
- **Deploy**

### 3. Set Environment Variables
**Settings → Environment Variables**

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=v8pnIyo1tCqifGpJiOdHUTEqG1iFTzvRYCzGgVKvvN8=
DATABASE_URL=postgres://...
CRON_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIYaSXi1A8fQqW6d-vRPtogRFz6hw4xmjcMzaePx1LZNYSvCir5h2WcCOD9ht0QAMJQeYyvTwOJd9YiA19iOr3c
VAPID_PRIVATE_KEY=vHkDxpvJXLSNdeqtMOboVnwmFi-LKPXmOVv6pv289WQ
```

Mark each as **Production** → **Save & Redeploy**

### 4. Test
```bash
curl https://your-app.vercel.app/api/health
```

## Features on Vercel

✅ Auto-deploy on git push  
✅ 17 Cron jobs (daily tasks, reminders, reports)  
✅ Push notifications (Web Push API)  
✅ Serverless functions  
✅ Auto SSL/TLS  
✅ Global CDN  

See `vercel.json` for cron configuration.

## Troubleshooting

### Build fails
```bash
npm run build
npm run check:types
```

### Database error
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Cron jobs not running
- Vercel Dashboard → **Cron Jobs** tab
- Check logs for authorization errors

### Push notifications not working
- Browser DevTools → Application → Service Workers
- Should show "Active ✓"

---

See `README.md` for full documentation.

