#!/usr/bin/env pwsh
# scripts/apply-migrations.ps1
# Aplica las migraciones en orden usando supabase CLI
# 
# PREREQUISITO:
#   Genera un Personal Access Token en:
#   https://supabase.com/dashboard/account/tokens
#
# USO:
#   $env:SUPABASE_ACCESS_TOKEN="sbp_tu_token_aqui"
#   .\scripts\apply-migrations.ps1

param(
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [string]$ProjectRef = "febokmcgjatrfdfuaeyk"
)

if (-not $AccessToken) {
  Write-Error "Falta SUPABASE_ACCESS_TOKEN. Obtén uno en: https://supabase.com/dashboard/account/tokens"
  exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $AccessToken

Write-Host "🔗 Vinculando proyecto..."
npx supabase link --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) { Write-Error "Error al vincular"; exit 1 }

Write-Host "📦 Aplicando migraciones..."
npx supabase db push

if ($LASTEXITCODE -ne 0) { Write-Error "Error en migraciones"; exit 1 }

Write-Host "⚙️  Generando types/database.ts..."
npx supabase gen types typescript --linked | Out-File -FilePath "types/database.ts" -Encoding utf8

Write-Host "✅ Completado. types/database.ts actualizado."
