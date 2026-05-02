#!/bin/bash

echo "🏛️ Patrimonio - Setup Script"
echo "============================="
echo ""

# Check Node version
NODE_VERSION=$(node -v)
echo "✓ Node version: $NODE_VERSION"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Copy environment variables
if [ ! -f .env.local ]; then
  echo ""
  echo "📝 Creating .env.local file..."
  cp .env.example .env.local
  echo "⚠️  Please configure your .env.local with your Supabase credentials"
fi

# Create public folders
echo ""
echo "📁 Creating public folders..."
mkdir -p public/icons

# Build placeholder icons (you should replace these with real icons)
echo "⚠️  Please add your app icons to public/icons/"
echo "   - icon-192x192.png"
echo "   - icon-512x512.png"

echo ""
echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Configure .env.local with your Supabase credentials"
echo "2. Start Supabase local: npx supabase start"
echo "3. Run dev server: npm run dev"
echo "4. Add your app icons to public/icons/"
echo ""
echo "Happy coding! 🚀"
