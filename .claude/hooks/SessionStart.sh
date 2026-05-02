#!/usr/bin/env bash

# SessionStart.sh - Hook ejecutado al iniciar sesión de Claude Code
# Purpose: Setup del entorno y verificación del proyecto

set -e

echo "🚀 Patrimonio - Session Start"
echo "=============================="
echo ""

# Verificar Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js version must be >=20.0.0 (current: $NODE_VERSION)"
  exit 1
fi
echo "✅ Node.js $NODE_VERSION"

# Verificar npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi
echo "✅ npm $(npm -v)"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found - run 'npm install'"
else
  echo "✅ node_modules exists"
fi

# Verificar .env.local
if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local not found - copy from .env.example"
else
  echo "✅ .env.local exists"
fi

# Check si Supabase local está corriendo
if command -v supabase &> /dev/null; then
  if supabase status &> /dev/null; then
    echo "✅ Supabase local running"
  else
    echo "⚠️  Supabase local not running - run 'supabase start'"
  fi
else
  echo "⚠️  Supabase CLI not installed"
fi

echo ""
echo "=============================="
echo "Session initialized successfully!"
echo "Type '@patrimonio-orchestrator' to start"
echo ""
