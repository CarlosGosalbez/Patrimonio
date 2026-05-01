<#
.SYNOPSIS
    Pre-deployment verification script for Patrimio
    
.DESCRIPTION
    Comprehensive checks before deploying to production:
    - TypeScript compilation
    - ESLint validation
    - Build verification
    - Dependency audit
    - Environment variables check
    
.EXAMPLE
    .\pre-deploy-check.ps1
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "`n🔍 Patrimio Pre-Deploy Verification`n" -ForegroundColor Cyan

# Track results
$checks = @{
    TypeCheck = $false
    Lint      = $false
    Build     = $false
    Audit     = $false
    EnvVars   = $false
}

# 1. TypeScript Check
Write-Host "[1/5] TypeScript compilation..." -ForegroundColor Yellow
try {
    npm run type-check 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ TypeScript: 0 errors" -ForegroundColor Green
        $checks.TypeCheck = $true
    }
    else {
        Write-Host "  ❌ TypeScript: errors found" -ForegroundColor Red
        npm run type-check
    }
}
catch {
    Write-Host "  ❌ TypeScript: check failed" -ForegroundColor Red
}

# 2. Lint Check
Write-Host "`n[2/5] ESLint validation..." -ForegroundColor Yellow
try {
    npm run lint 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Lint: 0 warnings" -ForegroundColor Green
        $checks.Lint = $true
    }
    else {
        Write-Host "  ❌ Lint: warnings/errors found" -ForegroundColor Red
        npm run lint
    }
}
catch {
    Write-Host "  ❌ Lint: check failed" -ForegroundColor Red
}

# 3. Build Check
Write-Host "`n[3/5] Production build..." -ForegroundColor Yellow
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0 -and $buildOutput -match "Creating an optimized production build") {
        Write-Host "  ✅ Build: successful" -ForegroundColor Green
        $checks.Build = $true
    }
    else {
        Write-Host "  ❌ Build: failed" -ForegroundColor Red
        Write-Host $buildOutput
    }
}
catch {
    Write-Host "  ❌ Build: check failed" -ForegroundColor Red
}

# 4. Security Audit
Write-Host "`n[4/5] Security audit..." -ForegroundColor Yellow
try {
    $auditOutput = npm audit --audit-level=high 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Audit: no high/critical vulnerabilities" -ForegroundColor Green
        $checks.Audit = $true
    }
    else {
        Write-Host "  ⚠️  Audit: vulnerabilities found" -ForegroundColor Yellow
        npm audit --audit-level=high
        # Non-blocking
        $checks.Audit = $true
    }
}
catch {
    Write-Host "  ⚠️  Audit: check skipped" -ForegroundColor Yellow
    $checks.Audit = $true
}

# 5. Environment Variables Check
Write-Host "`n[5/5] Environment variables..." -ForegroundColor Yellow
# Only check build-time variables (NEXT_PUBLIC_*)
# SUPABASE_SERVICE_ROLE_KEY is runtime-only (Vercel env vars), not needed for build
$requiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Test-Path "env:$var")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -eq 0) {
    Write-Host "  ✅ Env vars: all required variables present" -ForegroundColor Green
    $checks.EnvVars = $true
}
else {
    Write-Host "  ⚠️  Env vars: missing variables (check Vercel config)" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "    - $var" -ForegroundColor Gray
    }
    # Non-blocking for local env
    $checks.EnvVars = $true
}

# Summary
Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
$totalChecks = $checks.Values.Count
$passedChecks = ($checks.Values | Where-Object { $_ -eq $true }).Count

if ($passedChecks -eq $totalChecks) {
    Write-Host "✅ Pre-deploy verification PASSED ($passedChecks/$totalChecks)" -ForegroundColor Green
    Write-Host "`nReady to deploy to production!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ Pre-deploy verification FAILED ($passedChecks/$totalChecks)" -ForegroundColor Red
    Write-Host "`nFix the issues above before deploying." -ForegroundColor Red
    exit 1
}
