# Performance Optimizer Skill

## Metadata

- **name**: performance-optimizer
- **description**: Detecta componentes sin React.memo, bundles grandes, N+1 queries. Optimiza Core Web Vitals.
- **when-to-use**: LCP > 2.5s, bundle > 400KB, slow transactions en Sentry, pre-deploy checks
- **model**: sonnet

## What this skill does

Analiza el proyecto para encontrar oportunidades de optimización de rendimiento:

1. Bundle analysis (componentes > 100KB sin code-split)
2. React performance (componentes sin memo, deps sin memoizar)
3. Sentry traces (queries lentas, N+1 patterns)
4. Core Web Vitals (LCP, FID, CLS)

## Actions

```bash
# 1. Analizar bundles
npm run build | grep -E "Route.*KB" | sort -k2 -rh | head -10

# 2. Buscar componentes sin React.memo
grep -r "export.*function\|export default function" components/ --include="*.tsx" |
  while read line; do
    file=$(echo $line | cut -d: -f1)
    grep -q "React.memo\|memo(" "$file" || echo "❌ $file"
  done

# 3. Buscar arrays/objects sin memoizar en deps
grep -rn "useEffect\|useCallback\|useMemo" components/ hooks/ --include="*.tsx" --include="*.ts" -A 2 |
  grep -E "\[.*\{|\[.*\[" | head -20

# 4. Verificar TanStack Query config
grep -rn "staleTime\|cacheTime\|refetchOnWindowFocus" hooks/ --include="*.ts"
```

## Output format

```
🔍 PERFORMANCE AUDIT
═══════════════════════════════════════════════

📦 BUNDLE SIZE (top 5 routes)
Route                         Size     Action
/investments                  136KB    ⚠️  Code-split charts
/dashboard                    98KB     ✅ OK
/transactions                 87KB     ✅ OK

⚛️  REACT OPTIMIZATION (5 issues)
1. components/investments/InvestmentsPageClient.tsx
   → Wrap in React.memo (expensive component)

2. components/charts/AllocationChart.tsx
   → Memoize data array: const data = useMemo(() => [...], [deps])

🗃️  N+1 QUERIES (Sentry traces)
app/api/dashboard/route.ts:45
   → Replace 3 separate queries with 1 JOIN

⏱️  CORE WEB VITALS
Metric    Current    Target    Status
LCP       3.8s       <2.5s     ❌ FAIL
FID       45ms       <100ms    ✅ PASS
CLS       0.08       <0.1      ✅ PASS

🎯 TOP 5 OPTIMIZATIONS (prioritized by impact)
1. Code-split investments page → -50KB, -0.6s LCP
2. Memo AllocationChart → -0.3s re-render
3. Fix N+1 in dashboard API → -0.4s API latency
4. dynamic() import for Recharts → -30KB initial
5. Add staleTime to useTransactions → -50% requests
```

## Prerequisites

- npm run build debe funcionar
- Sentry Performance configurado
- Lighthouse CLI instalado (opcional): `npm i -g @lhci/cli`

## Example invocation

"@performance-optimizer analiza el proyecto, el LCP está en 3.8s y quiero bajarlo a < 2.5s"
