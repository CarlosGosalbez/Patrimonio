# i18n Checker Skill

## Metadata

- **name**: i18n-checker
- **description**: Busca hardcoded strings y variable names expuestos. Detecta texto no internacionalizado.
- **when-to-use**: Pre-release, UI refactor, nuevas features, accessibility review
- **model**: sonnet

## What this skill does

Busca strings hardcodeados en componentes React que deberían usar `useTranslations()`:

1. Texto en español/inglés hardcodeado
2. Variable names expuestos en UI (camelCase, snake_case)
3. Componentes sin `const t = useTranslations()`
4. Strings en JSX sin `{t("key")}`

## Actions

```bash
# 1. Buscar strings en español (patterns comunes)
grep -rn "En directo\|Patrimonio\|Transacciones\|Inversiones\|Presupuestos" \
  components/ app/ --include="*.tsx" --exclude-dir=node_modules

# 2. Buscar variable names expuestos (camelCase, snake_case en strings)
grep -rn '"[a-z_]*_[a-z_]*"\|"[a-z]*[A-Z]' \
  components/ app/ --include="*.tsx" | grep -v "className\|aria-" | head -30

# 3. Detectar componentes sin useTranslations
grep -L "useTranslations\|getTranslations" \
  components/**/*.tsx app/**/*.tsx |
  xargs grep -l "export.*function\|export default" | head -20

# 4. Buscar texto en JSX que no es {t("...")}
grep -rn '>[A-Z][a-z].*<\|>[0-9]\+\s[a-z]' \
  components/ app/ --include="*.tsx" | grep -v ">{t(\|>{value}\|>{" | head -30
```

## Output format

```
🌐 i18n AUDIT REPORT
═══════════════════════════════════════════════

❌ HARDCODED STRINGS (15 found)

components/dashboard/NetWorthWidget.tsx:45
  "Patrimonio neto"
  → t("dashboard.netWorth")

components/transactions/TransactionRow.tsx:89
  "En directo"
  → t("transactions.live")

app/(app)/investments/page.tsx:23
  "Investment Portfolio"
  → t("investments.title")

⚠️  VARIABLE NAMES EXPOSED (8 found)

components/imports/ImportsPageClient.tsx:112
  {status === "completed" && "completed"}
  → {status === "completed" && t("imports.statusCompleted")}

components/analytics/CategoryBreakdown.tsx:67
  "net_cent"
  → Should be formatted with formatCurrency(), not raw

🔍 COMPONENTS WITHOUT i18n (5 found)

components/reports/ReportGenerator.tsx
  → Add: const t = useTranslations("reports");

components/settings/NotificationSettings.tsx
  → Add: const t = useTranslations("settings");

📊 SUMMARY
Total files scanned: 87
Files with hardcoded strings: 15
Files missing useTranslations: 5
Estimated i18n coverage: 77% (target: 100%)

🎯 ACTION PLAN
1. Add t() to 15 files with hardcoded strings
2. Add useTranslations() to 5 components
3. Update messages/es.json + messages/en.json with 23 new keys
4. Run: grep -r "FIXME.*i18n" to verify all fixed
```

## Prerequisites

- next-intl configurado en el proyecto
- messages/es.json + messages/en.json existen

## Example invocation

"@i18n-checker busca strings hardcodeados antes del release"
