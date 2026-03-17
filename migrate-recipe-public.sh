#!/bin/bash

# Migration script for isPublic field in Recipe model
# Run this after pulling the latest changes

echo "🔄 Creating Prisma migration for Recipe.isPublic field"
echo "======================================================"
echo ""

# Check if Prisma CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

echo "📋 Migration details:"
echo "  Model: Recipe"
echo "  Field: isPublic Boolean @default(false)"
echo "  Description: Czy przepis jest publiczny (widoczny dla innych gospodarstw)"
echo ""

# Development environment
if [ "$1" == "dev" ] || [ -z "$1" ]; then
    echo "🔧 Running migration in DEVELOPMENT mode..."
    npx prisma migrate dev --name add_recipe_is_public

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration created and applied successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Review migration file in prisma/migrations/"
        echo "2. Commit the migration to git"
        echo "3. Deploy to production with: npm run db:migrate"
    else
        echo ""
        echo "❌ Migration failed. Check errors above."
        exit 1
    fi
fi

# Production environment
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
    echo "🚀 Applying migration in PRODUCTION mode..."
    echo "⚠️  WARNING: This will modify the production database!"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes'): " -r

    if [[ $REPLY == "yes" ]]; then
        npx prisma migrate deploy

        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Migration applied successfully in production!"
        else
            echo ""
            echo "❌ Migration failed. Check errors above."
            exit 1
        fi
    else
        echo "Migration cancelled."
        exit 0
    fi
fi

echo ""
echo "📊 Current database schema status:"
npx prisma migrate status

echo ""
echo "✅ Done!"

