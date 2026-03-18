# 👨‍👩‍👧‍👦 Family Planner - Complete Home Management App

**Status:** ✅ Production Ready | **Version:** 1.0.0  
**Deployment:** Vercel Ready | **Database:** PostgreSQL

A comprehensive family management application for organizing recipes, tasks, schedules, trips, gamification, and household management. Built with Next.js 16, React 19, TypeScript, Prisma, and PostgreSQL.

---

## 🎯 Key Features

### 📋 Task Management
- Create, assign, and track tasks for family members
- Recurring tasks with flexible recurrence patterns
- Task priority levels and time tracking
- 🏆 Gamification: XP rewards for completions

### 🍳 Recipe Management
- Recipe library with ingredients and detailed steps
- 🤖 Smart import from URLs (Gemini AI)
- 📸 OCR import from photos
- Advanced search, filtering, and nutrition info
- Meal planning and shopping list generation

### 🗓️ Scheduling & Routines
- Event management with smart reminders
- Routine templates (morning, evening, weekly)
- Calendar sync (Google, Outlook)
- Geolocation features
- Birthday & anniversary tracking

### 🛒 Household Management
- Inventory system with low-stock alerts
- Shopping lists with budget tracking
- Meal planning integration
- Financial transaction tracking
- Budget management

### ✈️ Trip Planning
- Trip itineraries and checklists
- Packing lists
- Trip expenses tracking
- Geolocation and map features

### 🎮 Gamification System
- **50+ Achievements** to unlock
- **Level System** (1-50+) with XP progression
- **Reward Shop** with 20+ rewards:
  - 🎨 Cosmetics (themes, titles, avatars)
  - ⚡ Functional (XP boosters, streak shields)
  - 🎁 Physical rewards (family privileges)
- **Daily Quests** and streaks
- 🏆 Leaderboards (household)

### 🔔 Notifications
- 📱 Web push notifications (PWA)
- Smart reminders for tasks, events, meals
- Real-time updates
- Optional email notifications

### 👥 Multi-User & Family
- Support for multiple family members
- Role-based access (Admin, User)
- Household isolation (multi-tenant)
- Privacy controls
- Activity leaderboards

---

## 🚀 Quick Start

### Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your database URL

# 3. Run migrations
npm run db:migrate:dev

# 4. Start dev server
npm run dev
```

Open http://localhost:3000

### Production (Vercel)

```bash
git push origin main
```

See **Deployment** section below for setup.

---

## ⚙️ Environment Configuration

### Required Variables
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-random-secret>
DATABASE_URL=postgresql://user:password@host:5432/planner
```

### Push Notifications (PWA)
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIYaSXi1A8fQqW6d-vRPtogRFz6hw4xmjcMzaePx1LZNYSvCir5h2WcCOD9ht0QAMJQeYyvTwOJd9YiA19iOr3c
VAPID_PRIVATE_KEY=vHkDxpvJXLSNdeqtMOboVnwmFi-LKPXmOVv6pv289WQ
```

### Optional Features
```env
GEMINI_API_KEY=          # AI recipe import
GOOGLE_CLIENT_ID=        # Google OAuth
CLOUDINARY_CLOUD_NAME=   # Image CDN
NEXT_PUBLIC_SENTRY_DSN=  # Error tracking
CRON_SECRET=             # Vercel cron jobs
```

See `.env.example` for complete reference.

---

## 🌐 Vercel Deployment

### Step 1: Push to Git
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### Step 2: Create Project on Vercel
1. https://vercel.com → **New Project**
2. Import your repository
3. **Deploy** (Next.js auto-detected)

### Step 3: Configure Environment
Vercel Dashboard → **Settings → Environment Variables**

Add these from `.env.local`:
- `NEXTAUTH_URL` = `https://your-app.vercel.app`
- `NEXTAUTH_SECRET` = your secret
- `DATABASE_URL` = your database URL
- `VAPID_PUBLIC_KEY` = from .env.local
- `VAPID_PRIVATE_KEY` = from .env.local
- `CRON_SECRET` = generate new: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Important:** Mark each as **Production**

Click **Save & Redeploy**

### Features on Vercel
- ✅ Auto-deploy on git push
- ✅ 17 Cron jobs (daily tasks, reminders, reports)
- ✅ Push notifications (Web Push API)
- ✅ Serverless functions
- ✅ Auto SSL/TLS
- ✅ Global CDN

See `vercel.json` for cron configuration.

---

## 🖥️ VPS Auto-Install (One Command)

Masz gotowy instalator produkcyjny w `scripts/install-vps.sh`, ktory:
- instaluje Node.js 20, PostgreSQL, Nginx, PM2, Certbot,
- tworzy baze i uzytkownika PostgreSQL,
- generuje `.env` / `.env.production` z sekretami,
- odpala migracje Prisma i build,
- konfiguruje Nginx + SSL dla domeny,
- uruchamia aplikacje oraz crony przez PM2.

Uruchom na czystym Ubuntu/Debian (jako root/sudo):

```bash
chmod +x scripts/install-vps.sh
sudo ./scripts/install-vps.sh \
  --domain planner.twojadomena.pl \
  --email admin@twojadomena.pl \
  --repo-url https://github.com/<twoj-login>/planner.git
```

Przy zewnetrznej bazie z certyfikatem CA (np. `secrets/ca.pem`) mozesz dodac:

```bash
sudo ./scripts/install-vps.sh \
  --domain planner.twojadomena.pl \
  --email admin@twojadomena.pl \
  --repo-url https://github.com/<twoj-login>/planner.git \
  --db-host <host-db> \
  --db-ssl-mode require \
  --db-ca-cert-path /opt/planner/secrets/ca.pem
```

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Next.js 16** - Full-stack React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Lucide Icons** - Icon library
- **Zustand** - State management
- **SWR** - Data fetching & caching
- **React Hook Form** - Form handling

### Backend & Database
- **Next.js API Routes** - Serverless backend
- **NextAuth.js** - Authentication & OAuth
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Relational database

### Deployment & Services
- **Vercel** - Hosting & serverless functions
- **Aiven** - PostgreSQL cloud hosting
- **Google Gemini** - AI recipe parsing
- **Web Push API** - Push notifications
- **Sentry** - Error tracking (optional)
- **Cloudinary** - Image CDN (optional)

---

## 🎮 Gamification System

### XP & Levels
- Task completion: 5-50 XP
- Daily login: 10-50 XP
- Streak bonus: 10-200 XP
- Achievements: 100-500 XP
- Levels: 1-50+ (exponential growth)

### 50+ Achievements
- Task milestones
- Streak achievements
- Recipe creation
- Level milestones
- Special events

### Reward Shop
- **Common (100-300 points):** Basic cosmetics
- **Rare (400-1000 points):** Themes, perks
- **Epic (1000-2500 points):** Exclusive rewards
- **Legendary (5000+ points):** Ultra-rare items

Available rewards:
- 🎨 Custom themes and avatars
- 👑 Prestigious titles
- ⚡ XP boosters (25%-200% multiplier)
- 🛡️ Streak shields (protection from losing streak)
- 🎁 Physical rewards (family privileges)

---

## ⏰ Cron Jobs

17 automated tasks run on Vercel schedule:

```
EVERY DAY:
- 0:00   → Daily Quests generation
- 1:00   → Auto-restock inventory
- 6:00   → Inventory alerts
- 7:00   → Birthday & Anniversary reminders
- 8:00   → Daily routine digest
- 9:00   → Trip reminders

EVERY HOUR:
- :00    → Task reminders & escalation

EVERY 30 MINUTES:
- Event & schedule reminders

EVERY 15-20 MINUTES:
- Routine & meal reminders

WEEKLY/MONTHLY:
- Sunday 18:00 → Weekly reports
- 1st of month 18:00 → Monthly reports
```

Each cron job automatically sends notifications to relevant users.

---

## 📱 PWA Features

- Service Worker (`public/sw.js`) for offline support
- Web Push API for push notifications
- App manifest for home screen install
- Progressive loading and caching
- Works on Android, iOS, desktop browsers

### Enable Notifications
1. Settings → Notifications
2. Click "Enable Push Notifications"
3. Browser asks for permission
4. Receive automatic reminders!

---

## 🔐 Security

- ✅ NextAuth.js for secure authentication
- ✅ OAuth support (Google, Microsoft, Azure AD)
- ✅ Password hashing with bcryptjs
- ✅ Role-based access control (RBAC)
- ✅ Household data isolation
- ✅ Bearer token validation for cron jobs
- ✅ Environment variable isolation
- ✅ HTTPS/TLS in production
- ✅ Rate limiting on API endpoints
- ✅ SQL injection prevention (Prisma ORM)

---

## 🧪 Development Commands

```bash
# Type checking
npm run check:types

# Linting
npm run check:lint

# Full validation
npm run check:all

# Build for production
npm run build

# Database studio
npm run db:studio

# Run migrations
npm run db:migrate:dev

# Seed database
npm run db:seed
```

---

## 📁 Project Structure

```
planner/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── api/                 # API endpoints
│   │   │   ├── gamification/   # XP, achievements, rewards
│   │   │   ├── recipes/        # Recipe CRUD
│   │   │   ├── tasks/          # Task management
│   │   │   ├── cron/           # Scheduled jobs
│   │   │   └── ...
│   │   ├── auth/                # Authentication
│   │   └── layout.tsx          # Root layout
│   ├── components/              # Reusable React components
│   ├── lib/                     # Utilities & helpers
│   │   ├── prisma.ts          # Database client
│   │   ├── xp.ts              # XP & gamification
│   │   ├── auth.ts            # Auth utilities
│   │   └── ...
│   ├── auth.ts                 # NextAuth configuration
│   └── instrumentation.ts      # Server startup hook
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── public/
│   ├── sw.js                   # Service Worker
│   └── manifest.json           # PWA manifest
├── vercel.json                 # Vercel configuration
├── next.config.ts              # Next.js configuration
└── package.json                # Dependencies
```

---

## 🐛 Troubleshooting

### Build fails locally
```bash
npm run check:types
npm run build
```

### Database connection error
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Cron jobs not running on Vercel
1. Check `CRON_SECRET` is set correctly
2. Vercel Dashboard → **Cron Jobs** tab
3. Check logs for authorization errors

### Push notifications not working
1. Browser DevTools → Application → Service Workers
2. Should show "Active ✓"
3. Check notification settings in browser

### TypeScript errors
```bash
npm install
npm run check:types
```

---

## 📚 Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Prisma Documentation:** https://www.prisma.io/docs
- **NextAuth.js Documentation:** https://next-auth.js.org
- **Vercel Documentation:** https://vercel.com/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Private project - All rights reserved

---

## 💬 Support

For issues or questions:
1. Check this README and docs/
2. Review Troubleshooting section
3. Check GitHub issues
4. Contact development team

---

**Built with ❤️ for families**

Last Updated: March 2026  
Next.js 16 | React 19 | PostgreSQL | Vercel Ready

