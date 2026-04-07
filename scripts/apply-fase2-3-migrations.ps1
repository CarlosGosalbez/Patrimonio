# Apply FASE 2-3 migrations to Supabase (remote via REST API)
# Run: .\scripts\apply-fase2-3-migrations.ps1
# Requires: SUPABASE_ACCESS_TOKEN in .env.local

$ErrorActionPreference = "Stop"

# Load environment variables from .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1]
        $value = $matches[2] -replace '^"(.*)"$', '$1'  # Remove quotes
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$SUPABASE_ACCESS_TOKEN = $env:SUPABASE_ACCESS_TOKEN
$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL

if (-not $SUPABASE_ACCESS_TOKEN) {
    Write-Error @"
❌ SUPABASE_ACCESS_TOKEN not found in .env.local

Para aplicar migraciones, necesitas:
1. Ir a https://supabase.com/dashboard/account/tokens
2. Crear un Personal Access Token
3. Añadir a .env.local: SUPABASE_ACCESS_TOKEN=sbp_xxxxx
4. Ejecutar de nuevo este script

ALTERNATIVA: Aplicar manualmente vía Dashboard → SQL Editor
"@
    exit 1
}

if (-not $SUPABASE_URL) {
    Write-Error "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
    exit 1
}

# Extract project ref from URL
$PROJECT_REF = ($SUPABASE_URL -replace 'https://', '' -replace '\.supabase\.co.*', '')

Write-Host "🔄 Aplicando migraciones a proyecto: $PROJECT_REF" -ForegroundColor Cyan

# Helper function to execute SQL via Management API
function Invoke-SupabaseSQL {
    param([string]$Query, [string]$Description)
    
    Write-Host "`n📝 $Description" -ForegroundColor Yellow
    
    $body = @{ query = $Query } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod `
            -Uri "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" `
            -Method POST `
            -Headers @{
            "Authorization" = "Bearer $SUPABASE_ACCESS_TOKEN"
            "Content-Type"  = "application/json"
        } `
            -Body $body
        
        Write-Host "✅ $Description - completada" -ForegroundColor Green
        return $true
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        
        if ($statusCode -eq 409 -or $errorBody -match "already exists") {
            Write-Host "⚠️  $Description - ya aplicada anteriormente" -ForegroundColor Yellow
            return $true
        }
        else {
            Write-Host "❌ Error en $Description" -ForegroundColor Red
            Write-Host "   Status: $statusCode" -ForegroundColor Red
            Write-Host "   Error: $errorBody" -ForegroundColor Red
            return $false
        }
    }
}

# Migration 1: Extend profiles
$migration1 = Get-Content "supabase\migrations\20260408020000_extend_profiles.sql" -Raw
Invoke-SupabaseSQL -Query $migration1 -Description "Migración 1: Extender tabla profiles"

# Migration 2: Create avatars bucket
$migration2 = Get-Content "supabase\migrations\20260408020001_create_avatars_bucket.sql" -Raw
Invoke-SupabaseSQL -Query $migration2 -Description "Migración 2: Crear bucket de avatars"

# Migration 3: GDPR data export
$migration3 = Get-Content "supabase\migrations\20260408030000_gdpr_data_export.sql" -Raw
Invoke-SupabaseSQL -Query $migration3 -Description "Migración 3: Función export_user_data"

Write-Host "`n✨ Proceso completado." -ForegroundColor Cyan
Write-Host "📌 Próximo paso: npm run db:types (regenerar types/database.ts)" -ForegroundColor Cyan
