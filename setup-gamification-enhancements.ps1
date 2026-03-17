# 🎉 Quick Setup Script for All 5 Gamification Enhancements
# Run this script to set up everything in one go

Write-Host "🎮 Starting Gamification Enhancements Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate Prisma Client
Write-Host "📦 Step 1/5: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 2: Create migration
Write-Host "🗄️ Step 2/5: Creating database migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_gamification_enhancements
Write-Host "✅ Migration created and applied" -ForegroundColor Green
Write-Host ""

# Step 3: Seed Tiered Achievements
Write-Host "🏆 Step 3/5: Seeding tiered achievements..." -ForegroundColor Yellow
npx tsx prisma/seed-tiered-achievements.ts
Write-Host "✅ Tiered achievements seeded (24 achievements)" -ForegroundColor Green
Write-Host ""

# Step 4: Seed Quest Templates
Write-Host "🎯 Step 4/5: Seeding quest templates..." -ForegroundColor Yellow
npx tsx prisma/seed-quest-templates.ts
Write-Host "✅ Quest templates seeded (25 templates)" -ForegroundColor Green
Write-Host ""

# Step 5: Install dependencies
Write-Host "📚 Step 5/5: Installing dependencies..." -ForegroundColor Yellow
npm install recharts date-fns
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Setup Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor White
Write-Host "1. Start your application: npm run dev"
Write-Host "2. Open /gamification to see all new features"
Write-Host "3. Go to 'Ranking' tab to see new leaderboards"
Write-Host "4. Go to 'Statystyki' tab to see charts"
Write-Host "5. Check achievements for tier badges (Bronze/Silver/Gold/Platinum)"
Write-Host ""
Write-Host "🔧 Optional: Setup cron jobs for auto-generation" -ForegroundColor Yellow
Write-Host "   - Daily quests: curl -X POST http://localhost:3000/api/admin/quests/generate"
Write-Host "   - Weekly leaderboard: curl -X POST 'http://localhost:3000/api/admin/leaderboard/snapshot?period=weekly'"
Write-Host ""
Write-Host "📚 Documentation: See docs/GAMIFICATION_ALL_ENHANCEMENTS_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ All 5 enhancements are ready to use! ✨" -ForegroundColor Green

