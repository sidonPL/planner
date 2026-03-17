#!/bin/bash

# 🎉 Quick Setup Script for All 5 Gamification Enhancements
# Run this script to set up everything in one go

set -e  # Exit on error

echo "🎮 Starting Gamification Enhancements Setup..."
echo ""

# Step 1: Generate Prisma Client
echo "📦 Step 1/5: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Step 2: Create migration
echo "🗄️ Step 2/5: Creating database migration..."
npx prisma migrate dev --name add_gamification_enhancements
echo "✅ Migration created and applied"
echo ""

# Step 3: Seed Tiered Achievements
echo "🏆 Step 3/5: Seeding tiered achievements..."
npx tsx prisma/seed-tiered-achievements.ts
echo "✅ Tiered achievements seeded (24 achievements)"
echo ""

# Step 4: Seed Quest Templates
echo "🎯 Step 4/5: Seeding quest templates..."
npx tsx prisma/seed-quest-templates.ts
echo "✅ Quest templates seeded (25 templates)"
echo ""

# Step 5: Install dependencies
echo "📚 Step 5/5: Installing dependencies..."
npm install recharts date-fns
echo "✅ Dependencies installed"
echo ""

echo "🎉 Setup Complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start your application: npm run dev"
echo "2. Open /gamification to see all new features"
echo "3. Go to 'Ranking' tab to see new leaderboards"
echo "4. Go to 'Statystyki' tab to see charts"
echo "5. Check achievements for tier badges (Bronze/Silver/Gold/Platinum)"
echo ""
echo "🔧 Optional: Setup cron jobs for auto-generation"
echo "   - Daily quests: curl -X POST http://localhost:3000/api/admin/quests/generate"
echo "   - Weekly leaderboard: curl -X POST http://localhost:3000/api/admin/leaderboard/snapshot?period=weekly"
echo ""
echo "📚 Documentation: See docs/GAMIFICATION_ALL_ENHANCEMENTS_COMPLETE.md"
echo ""
echo "✨ All 5 enhancements are ready to use! ✨"

