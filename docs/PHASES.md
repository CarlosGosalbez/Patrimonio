# PATRIMIO — Implementation Phase Plan

**Version:** 1.1.0  
**Date:** 2026  
**Purpose:** Implementation guide for Patrimio — a personal finance web app (PWA). Each phase includes deliverables, required skills, and verifiable exit criteria.

---

## Global Risk Summary

| Dimension     | Level       | Required Action                                                                  |
| ------------- | ----------- | -------------------------------------------------------------------------------- |
| Security      | 🔴 Critical | → Invoke **Security Reviewer** on auth, RLS, and API routes                      |
| DB Complexity | 🔴 Critical | → Invoke **DB Architect** on every migration                                     |
| Performance   | 🟡 Medium   | → Materialized views created in Phase 0 · market data cache activated in Phase 6 |
| UX / Mobile   | 🟡 Medium   | → Check `frontend.instructions.md` on every UI component                         |
| Compliance    | 🟡 Medium   | → IRPF disclaimers in Phase 6, GDPR/RGPD in Phase 9                              |

---

## Routing Map — Skill / Agent per Task

| Task                                      | Primary Resource                              | Support                       |
| ----------------------------------------- | --------------------------------------------- | ----------------------------- |
| New SQL table + RLS policies + migration  | **DB Architect** + `supabase-migration` skill | `database.instructions.md`    |
| Query / index optimization                | `supabase-postgres-best-practices` skill      | DB Architect                  |
| API route (auth + Zod validation)         | `security.instructions.md`                    | **Security Reviewer**         |
| P&L calculation, projections, avg price   | `financial-logic.instructions.md`             | `transaction-formatter` skill |
| Currency / date formatting in UI          | `transaction-formatter` skill                 | —                             |
| Spanish bank transaction categorization   | `spanish-finance-categorizer` skill           | —                             |
| Stock / ETF / crypto market prices        | `market-data-fetcher` skill                   | —                             |
| Anomaly detection and duplicate detection | `anomaly-detector` skill                      | —                             |
| PDF / Excel report generation             | `report-generator` skill                      | —                             |
| React component / hook / form             | `frontend.instructions.md`                    | —                             |
| Unit, integration, E2E tests              | `testing.instructions.md`                     | —                             |

---

## PHASE 0 — Foundations ✅ COMPLETED (2026-04-05)

**Goal:** Fully operational infrastructure before writing a single line of product code.

### Deliverables

- [x] GitHub repository initialized with Next.js 14 + TypeScript 5 + Tailwind + shadcn/ui structure
- [x] Supabase project created: PostgreSQL, Auth configured, Storage with private `receipts` bucket
- [x] All base schema migrations applied → `supabase/migrations/`
  - `profiles`, `accounts`, `categories`, `transactions`, `recurring_commitments`
  - `investments`, `investment_operations`, `investment_snapshots`
  - `budgets`, `auto_categorization_rules`, `market_cache`, `notifications`
  - **`custom_alerts`** — new table for personalized fiscal/insurance alerts
  - All ENUMs: `investment_type`, `operation_type`, `frequency_type`, `budget_period`, `commitment_type_enum`, `alert_recurrence_type`
  - `moddatetime` triggers for `updated_at` on all tables
  - Materialized views: `monthly_account_balance`, `monthly_category_spending`
  - RPC functions: `get_net_worth`, `project_cash_flow`, `recalculate_avg_purchase_price`
  - **RLS enabled on ALL tables** — minimum policy: `auth.uid() = user_id`
- [x] System categories seed (25+ categories: Salary, Mortgage, Groceries, etc.)
- [x] **Custom alerts seed**: IBI, IRPF, IVTM, Seguro Coche, Seguro Hogar, Tasa de Basura (editables per user)
- [x] `types/database.ts` generated with Supabase CLI
- [x] `lib/supabase/client.ts` + `lib/supabase/server.ts` + `lib/supabase/middleware.ts`
- [x] Base deploy on Vercel (provisional `*.vercel.app` domain)
- [x] Environment variables configured in Vercel Dashboard (see `.env.example`)
- [x] Basic GitHub Actions CI (`ci.yml`): type-check → lint → unit tests → build
- [x] `lib/financial/formatters.ts` with `formatCurrency`, `formatDate`, `centsToDisplay`, `displayToCents`
- [x] ESLint + Prettier + Husky pre-commit hooks configured

**Assigned agents:** DB Architect (schema), Security Reviewer (RLS audit)  
**Required skills:** `supabase-migration`, `supabase-postgres-best-practices`

**Exit criteria:** `npx supabase db push` with no errors · `npm run build` with no errors · CI green · RLS blocks cross-user access in manual test

---

## PHASE 1 — Full Authentication ✅ COMPLETED (2026-04-05)

**Goal:** User can register, log in with 2FA, and manage their session securely.

### Module: M0 — Authentication

#### Screens to build

| Screen          | Route                      | Description                             |
| --------------- | -------------------------- | --------------------------------------- |
| Login           | `/(auth)/login`            | Email + password + TOTP if active       |
| Register        | `/(auth)/register`         | Email + password + strength indicator   |
| Forgot Password | `/(auth)/forgot-password`  | Request password recovery email         |
| Reset Password  | `/(auth)/reset-password`   | New password with email token           |
| 2FA Setup       | `/(app)/settings/security` | QR code + verification + recovery codes |
| 2FA Challenge   | `/(auth)/two-factor`       | Enter TOTP code during login flow       |
| Recovery Codes  | `/(app)/settings/security` | View / regenerate emergency codes       |

#### Deliverables

- [x] Login flow → `supabase.auth.signInWithPassword()` + secure redirect
- [x] Registration with real-time password strength validation (zxcvbn)
- [x] Mandatory email verification before access
- [x] 2FA TOTP setup: QR code display + code verification + 10 hashed recovery codes
- [x] TOTP challenge on every login when active
- [x] Single-use recovery codes consumption
- [x] Forgot/Reset password with expirable link (1h)
- [x] Edge auth middleware: `/(app)/*` routes redirect to login with no session
- [x] JWT stored in memory + HttpOnly cookie (never localStorage)
- [x] Active sessions view with `supabase.auth.admin.listUserSessions()` + individual revocation
- [x] Password strength indicator (`PasswordStrength` component)
- [x] Minimal onboarding: create first bank account + select base currency
- [x] E2E tests: register → login → 2FA → logout → login with TOTP
- [x] i18n complete (ES/EN) via `next-intl` — all strings translated, `LanguageSwitcher` component
- [x] WCAG 2.2 AA: `aria-describedby`, `role="alert"`, `aria-live`, `focus-visible:ring-2`, touch targets ≥44px
- [x] Migration `20260405130000_create_recovery_codes.sql` applied · `types/database.ts` regenerated

**Assigned agents:** Security Reviewer  
**Required skills:** —  
**Instructions:** `security.instructions.md`, `frontend.instructions.md`

**Exit criteria:** Full register-to-access flow working on simulated Safari iPhone · 2FA verified end-to-end · middleware blocks authenticated routes without session

---

## PHASE 2 — Core Transactions (~3 weeks)

**Goal:** User can manage daily cash flow from mobile in under 30 seconds.

### Modules: M2 (Transactions) + M8 partial (Categories)

#### Deliverables

- [ ] **Mobile quick entry**: bottom sheet with type (income/expense), numeric keypad, description, category → max 4 steps
- [ ] **Full form**: all fields (notes, tags, receipt attachment, value date, account)
- [ ] **Transaction list**: infinite scroll with TanStack Query, sorted by date
- [ ] **Calendar view**: transactions grouped by day (`TransactionCalendar` component)
- [ ] **Full-text search** on description and notes (Supabase `ilike`)
- [ ] **Advanced filters**: date range, category, account, type (income/expense), amount min/max, tags
- [ ] **Bulk actions**: multi-select → categorize / tag / soft-delete
- [ ] **Swipe-to-delete** on mobile (Framer Motion gesture)
- [ ] **Attach receipt photo**: upload to Supabase Storage with signed URL + thumbnail
- [ ] **Transfer transactions**: linked pair between own accounts
- [ ] **Inline editing**: description and category without opening full form
- [ ] Full CRUD for custom categories in Settings
- [ ] CRUD for auto-categorization rules (pattern → category) — deterministic rule matching, no AI

**Skills:** `spanish-finance-categorizer`, `transaction-formatter`  
**Instructions:** `frontend.instructions.md`, `financial-logic.instructions.md`

**Exit criteria:** Mobile happy path working in < 30s · Category rules apply correctly on 50-transaction sample · RLS tests (user A cannot see user B's transactions)

---

## PHASE 3 — Dashboard + Commitments + Subscriptions + Custom Alerts ✅ COMPLETED (2026-04-05)

**Goal:** User has a complete view of their financial situation, upcoming obligations, active subscriptions, and personalized fiscal alerts at a glance.

### Modules: M1 (Dashboard) + M4 (Commitments) + M9 (Subscriptions) + M10 (Custom Alerts)

#### Dashboard (M1)

- [x] **Hero Card**: net worth via RPC `get_net_worth()`, monthly delta
- [x] **Monthly balance**: income − expenses using `monthly_account_balance` view
- [x] **Projected flow**: 30/60/90-day bar via RPC `project_cash_flow()`
- [x] **Top categories**: Recharts donut chart top 5 monthly expenses
- [x] **Upcoming commitments**: list of next 7 due dates
- [x] **Portfolio summary**: initial placeholder (total value + day P&L = 0 until Phase 6)
- [x] **Active alerts**: unified badge for: over-budget · subscription unexpected charges · unpaid expected income · upcoming custom alerts (IBI, IRPF, insurance)
- [x] **Recent transactions**: 5 most recent
- [x] **Customization**: drag & drop to reorder widgets, toggle to hide (Zustand store)
- [x] **Cache policy**: TanStack Query `staleTime: 300_000` (5 min) adopted as production strategy — no ISR applicable to client-rendered dashboard

#### Future Commitments (M4)

- [x] CRUD for recurring commitments with **`commitment_type`** field (mortgage, rent_income, rent_expense, subscription, tax, insurance, utility, other)
- [x] Active commitments list view with status (active/paused/expired)
- [x] **Horizontal timeline** 24 months: horizontally scrollable grid (commitment rows × month columns), income/expense dots per cell, net total row, current month highlighted
- [x] **Cash flow projection**: Recharts area chart over 12 months
- [x] **Insufficient balance alert**: detects negative months and notifies
- [x] **Edge Function cron** `generate-recurring`: triggered daily at 06:00 UTC via Vercel Cron (`/api/cron/generate-recurring`)
- [x] **Expiry alerts** X days before: notification trigger
- [x] **Mortgage fields**: maturity year, fixed/variable rate, early repayment
- [x] **Annual matrix view**: month × commitment with annual totals
- [x] **Unpaid income detection**: Edge Function `check-alerts` verifies `type=income` commitments whose expected date has passed >`tolerance_days` without a matching transaction → generates `expected_income_unpaid` notification (e.g. unpaid rent)

#### Subscriptions (M9)

- [x] Subscriptions panel filtered from `recurring_commitments` where `commitment_type = 'subscription'`
- [x] **`service_name` field**: exact text that appears in bank statement (used for import matching)
- [x] **`cancelled_at` field**: date the user cancelled the subscription
- [x] Subscription status badge: active / cancelled / ⚠️ unexpected charge detected
- [x] Total monthly subscription cost widget
- [x] Next renewal date per subscription
- [x] Month-over-month comparison of subscription spending (Recharts bar chart)

#### Custom Alerts (M10)

- [x] CRUD for `custom_alerts` table: name, category, due_date, expected_amount_cents, recurrence, advance_notice_days
- [x] **Predefined system alerts** (from seed, fully editable): IBI, IRPF, Impuesto Circulación, Seguro Coche, Seguro Hogar, Tasa de Basura
- [x] **Snooze**: dismiss alert until a specific date (`dismissed_until`)
- [x] **Category linking**: associate alert to a spending category — dashboard auto-disables it when the payment is registered
- [x] **“Upcoming deadlines” dashboard widget**: alerts in next 60 days sorted by urgency
- [x] **Edge Function `check-alerts`** (daily cron): triggered daily at 07:00 UTC via Vercel Cron (`/api/cron/check-alerts`) — queries `custom_alerts` with `due_date - advance_notice_days <= TODAY` → generates `custom_alert_due` notification + optional email via Resend
- [x] Weekly email digest of active alerts (user toggle)

### Status Update — 2026-04-05 (COMPLETED)

- [x] App routes added: `/dashboard`, `/commitments`, `/alerts` with authenticated App Shell navigation
- [x] API surface added: `/api/dashboard/summary`, `/api/commitments`, `/api/commitments/[id]`, `/api/commitments/subscriptions`, `/api/custom-alerts`, `/api/custom-alerts/[id]`, `/api/custom-alerts/preferences`, plus reference endpoints for accounts/categories
- [x] Domain services added for dashboard aggregation, commitments, subscriptions, custom alerts and expected-income gap detection
- [x] Edge Functions implemented: `supabase/functions/generate-recurring` and `supabase/functions/check-alerts`
- [x] Vercel Cron Jobs wired: `generate-recurring` at 06:00 UTC · `check-alerts` at 07:00 UTC — `CRON_SECRET` env var configured in Vercel
- [x] 24-month horizontal timeline UI added to commitments page (scrollable grid, income/expense dots, net row)
- [x] i18n completed for App Shell, Dashboard, Commitments and Alerts (ES/EN)
- [x] Validation executed: `npm run type-check`, `npm run lint`, `npm run test`, `npm run build`

**Skills:** `financial-data-reader`, `transaction-formatter`  
**Instructions:** `frontend.instructions.md`, `financial-logic.instructions.md`

**Exit criteria:** Dashboard loads in < 2s (Lighthouse) · cash flow projection is mathematically correct · recurring generation Edge Function tested · `check-alerts` cron verified for unpaid income detection · custom alert fires X days before due date · cancelled subscription flagged correctly in subscriptions panel

---

## PHASE 4 — Bank Statement Import (~2 weeks) ✅ COMPLETED (2026-04-06)

**Goal:** User can import months of banking history in minutes without errors, and the system auto-detects unexpected charges and unpaid income.

### Module: M3 — Import

#### Deliverables

- [x] **SheetJS client-side parser**: `.xlsx`, `.xls`, `.csv`, `.ofx`, `.qif`
- [x] **Automatic column detection**: heuristics to identify date, description, amount, type
- [x] **Interactive preview**: editable table with all detected transactions before confirming
- [x] **Manual column mapping**: drag & drop if detection fails
- [x] **Deduplication**: compare date + amount + similar description against existing transactions → "possible duplicate" flag
- [x] **Cancelled subscription charge detection**: for each imported transaction, match description against `service_name` of `recurring_commitments` where `cancelled_at < transaction_date` (case-insensitive contains) → flag ⚠️ `Unexpected charge: cancelled subscription` in preview + generate `subscription_unexpected_charge` notification after confirming
- [x] **Expected income verification**: after import, check `type=income` commitments whose expected date has elapsed > `tolerance_days` with no matching transaction → generate `expected_income_unpaid` notification
- [x] **Bulk auto-categorization**: apply user's auto-categorization rules on the imported batch
- [x] **Bulk confirmation**: modify categories for multiple similar transactions in one step
- [x] **Import identifiers**: `import_source`, `import_batch_id` on each transaction
- [x] **Import rollback**: soft-delete all transactions from an `import_batch_id`
- [x] **Spanish bank formats**: specific parsers for Santander, BBVA, CaixaBank, ING, Sabadell

### Status Update — 2026-04-06 (COMPLETED)

- [x] Nueva pantalla autenticada `/imports` con i18n completa (ES/EN), navegación en `AppShell`, drag & drop de fichero, autodetección de columnas, mapeo manual con drag-drop (`ImportMappingBoard`) y preview editable (`ImportPreviewTable`).
- [x] Nuevas APIs `/api/imports/preview`, `/api/imports/confirm`, `/api/imports/batches` y `/api/imports/batches/[id]/rollback` con validación Zod `.strict()`, auth por JWT, rollback seguro y RLS en `transaction_import_batches`.
- [x] Motor de importación en `lib/imports/` (parser, matching, schemas, types, server): parsing SheetJS para Excel, text para CSV, STMTTRN parser para OFX, `!Type:Bank` parser para QIF; heurísticas por banco español (FIELD_ALIASES + scoring); deduplicación SHA-256 + fuzzy matching ±2 días; matching de suscripciones canceladas; verificación de ingresos esperados; sugerencia de categoría por reglas de usuario + merchant hints en español.
- [x] Migración `20260406090000_phase4_bank_statement_import.sql` aplicada: tabla `transaction_import_batches`, columnas `import_dedupe_key`/`import_batch_id` en `transactions`, índice UNIQUE para deduplicación, funciones PL/pgSQL `rollback_import_batch()` y `create_user_notification()` (SECURITY DEFINER), trigger `prevent_resurrect()`.
- [x] Hooks en `hooks/usePhaseFour.ts`: `useImportBatchesQuery`, `useImportPreviewMutation`, `useConfirmImportMutation`, `useRollbackImportMutation`.
- [x] Tests unitarios: `tests/unit/imports-parser.test.ts` (detección Santander, OFX, QIF) y `tests/unit/imports-matching.test.ts` (fuzzy duplicates, reglas, unexpected charges, similitud).
- [x] Validación ejecutada: `npm run type-check`, `npm run lint`, `npm run test -- --run` y `npm run build`.
- [x] **E2E happy-path**: test Playwright del flujo completo upload → preview → confirm → rollback en iPhone 14 y Desktop Chrome — `tests/e2e/imports.spec.ts` (3 suites: auth guard, happy path, duplicate detection).

**Skills:** `spanish-finance-categorizer`, `anomaly-detector` (duplicate detection)  
**Instructions:** `security.instructions.md`

**Exit criteria:** Real statement import for each supported bank with no data loss · deduplication rate > 95% in test with known duplicate transactions · cancelled subscription charge flagged correctly in preview · unpaid income notification generated after import · rollback functional

---

## PHASE 5 — Analytics & Budgets (~2 weeks) ✅ COMPLETED (2026-04-06)

**Goal:** User understands their financial patterns through data-driven views and automated statistical alerts.

### Modules: M6 (Budgets) + M7 partial (Analytics)

#### Budgets (M6)

- [x] CRUD for budgets by category (monthly / annual)
- [x] Real-time progress bar (spent vs limit), color green → orange → red
- [x] Visual alert when configured threshold is exceeded (default 80%)
- [x] Month-over-month compliance comparison (Recharts bar chart)
- [x] "Available money" per category (limit − spent, optimistic update)
- [x] Push / email notification when budget exceeded (integration with `notifications` table)

#### Analytics (M7 partial)

- [x] **Transaction analytics view**: summary by period (week/month/quarter/year)
- [x] **Net worth evolution**: historical line chart (data from `investment_snapshots`)
- [x] **Category analysis**: monthly/annual trending, identify growing categories
- [x] **CSV export** of transactions for selected period

#### Automated Statistical Alerts

- [x] **Anomaly detection**: spending in any category > 2 standard deviations from historical mean → in-app notification
- [x] **Monthly trend card**: current month vs 3-month average per category (auto-displayed in analytics view)
- [x] Savings rate metric: calculated and displayed monthly (income − expenses / income)
- [x] Mortgage payoff projection: years remaining displayed in commitment detail

### Status Update — 2026-04-06 (COMPLETED)

- [x] Nueva pantalla autenticada `/analytics` con i18n completa ES/EN, selector `week/month/quarter/year`, tabs internas (`Resumen`, `Presupuestos`, `Categorías`) y exportación CSV desde cliente.
- [x] Nuevas APIs `/api/budgets`, `/api/budgets/[id]`, `/api/analytics/summary` y `/api/analytics/export` con auth por JWT, validación Zod `.strict()` y lógica de dominio separada en `lib/budgets/*` y `lib/analytics/*`.
- [x] Budgets operativos sobre la tabla existente: CRUD mensual/anual, barras de progreso con estados `ok/approaching/warning/exceeded`, disponible por categoría, comparación histórica y optimistic updates en `hooks/usePhaseFive.ts`.
- [x] Analytics productivos: serie de ingresos/gastos por periodo, savings rate, neto del periodo, análisis de categorías con tendencias y tarjetas de variación mensual.
- [x] Evolución patrimonial conectada a `investment_snapshots`: el `market-updater` persiste snapshots diarios por usuario para alimentar el gráfico histórico.
- [x] Alertas automáticas de Phase 5 en `supabase/functions/check-alerts/index.ts`: `budget_exceeded` y `anomaly_detected` con `event_key` idempotente, badge realtime en `AppShell` y reutilización del digest semanal por email.
- [x] Migración `20260406170000_phase5_budget_analytics_hardening.sql` aplicada remotamente: índice UNIQUE para `notifications(user_id,event_key)`, validación segura de categorías de budget, trigger `prevent_resurrect` en `budgets` e índice específico para consultas de budget/analytics.
- [x] Proyección hipotecaria incorporada al detalle de compromisos (`CommitmentDialog`) usando `maturity_year` + `next_due_date`.
- [x] Tests unitarios añadidos para ahorro, anomalías, estados de presupuesto y formatters; validación ejecutada con `npm run type-check`, `npm run lint`, `npm run test -- --run`, `npm run build` y `npx supabase db push --linked`.

**Skills:** `supabase-migration`, `anomaly-detector`, `transaction-formatter`  
**Instructions:** `.claude/rules/financial.md`, `.claude/rules/database.md`, `.claude/rules/security.md`

**Exit criteria:** Anomaly alert triggers correctly on test dataset with known outliers · savings rate formula correct · budget alerts fire at configured threshold

---

## PHASE 6 — Investments (~3 weeks)

**Goal:** User manages their investment portfolio with real-time prices and intelligent analysis.

### Module: M5 — Investments

#### Deliverables

- [ ] CRUD for positions: ticker, name, type, shares/units, average price, account
- [ ] **Ticker search** with autocomplete (FMP API)
- [ ] **Edge Function `market-updater`** (cron every 15 min): updates `market_cache` for all active tickers
- [ ] **Real-time quotes** via Supabase Realtime subscribed to `market_cache`
- [ ] **API fallback chain**: Yahoo Finance → Alpha Vantage → FMP → last snapshot
- [ ] **Unrealized P&L** per position and total portfolio (in cents!)
- [ ] **Realized P&L**: sale history with weighted average price calculation (`recalculate_avg_purchase_price` RPC)
- [ ] **Dividend management**: editable `annual_dividend_per_share_cents`, editable `next_dividend_date`
- [ ] **Dividend calendar**: list of upcoming estimated payments
- [ ] **Record operations**: buy (auto-updates avg price), sell, dividend received, stock split
- [ ] **Portfolio evolution chart**: historical value using `investment_snapshots`
- [ ] **Portfolio distribution**: by type (stocks/ETF/crypto/funds), by sector, by currency
- [ ] **Currency normalization**: USD/EUR via Open Exchange Rates
- [ ] **Price alert**: notification if asset ±X% in a day
- [ ] **Simplified IRPF fiscal report**: dividends received in the year (for tax return)
- [ ] **Excel export** of operations for the year
- [ ] **50/30/20 budget analysis**: built-in page showing needs/wants/savings breakdown from real spending data
- [ ] **Top categories widget**: auto-computed spending summary with over-budget flags on analysis page

**Skills:** `market-data-fetcher`, `financial-data-reader`, `transaction-formatter`, `report-generator`  
**Instructions:** `financial-logic.instructions.md`

**Exit criteria:** P&L calculated correctly with real market data · average price updated correctly after operations · quotes updating via Realtime · IRPF disclaimer visible · all financial calculation tests green

---

## PHASE 7 — Full Reports & Export (~1 week)

**Goal:** User can obtain an exportable executive summary of their financial year.

### Module: M7 — Reports & Analytics (complete)

#### Deliverables

- [ ] **Full monthly report**: income, expenses, savings, savings rate, top categories, variations
- [ ] **PDF export**: server-side generation with data for selected period
- [ ] **Full Excel export**: all transactions + summary + investments for the period
- [ ] **Period comparison**: month vs previous month, year vs previous year (side-by-side charts)
- [ ] **Simplified IRPF fiscal report**: capital gains, dividends, withholdings (with non-advisory disclaimer)
- [ ] **Full investment report**: year operations, realized P&L, dividends received
- [ ] **Full data export** (GDPR): ZIP with JSON of entire account

**Skills:** `report-generator`, `transaction-formatter`  
**Instructions:** `frontend.instructions.md`

**Exit criteria:** PDF generated correctly with real data · Excel importable in Excel/Google Sheets without errors · GDPR export downloads all user data

---

## PHASE 8 — PWA, Polish & Mobile (~2 weeks)

**Goal:** Native-like experience in iPhone Safari. Lighthouse ≥ 90 on all metrics.

### Deliverables

- [ ] **`manifest.json`** complete with iOS icons (apple-touch-icon, 192px, 512px maskable)
- [ ] **Service Worker** (`next-pwa`): Cache-First for assets · Network-First for data · Stale-While-Revalidate for dashboard · Network-Only for writes
- [ ] **Offline mode**: dashboard and last 30 days of transactions from cache
- [ ] **Offline write queue**: auto-sync when connection is restored
- [ ] **Safe Area Insets**: `env(safe-area-inset-*)` in main layout for iPhone notch
- [ ] **Touch targets** ≥ 44×44px on all interactive elements
- [ ] **Numeric keyboard**: `inputMode="decimal"` on all amount fields
- [ ] **Swipe gestures**: delete transaction, navigate between tabs
- [ ] **Full dark mode**: `prefers-color-scheme: dark` + consistent Tailwind dark theme
- [ ] **Animations and micro-interactions**: Framer Motion on screen transitions and feedback
- [ ] **Push notifications**: Web Push API (Safari iOS 16.4+) for budget alerts and due dates
- [ ] **Web Share API**: share transactions or reports using native iOS share sheet
- [ ] **WCAG 2.1 AA**: keyboard navigation, ARIA roles, color contrast
- [ ] **Lighthouse audit**: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Instructions:** `frontend.instructions.md`

**Exit criteria:** Lighthouse PWA ≥ 90 on mobile · E2E Playwright on `iPhone 14` and `iPad Pro 11` all green · app installable from Safari

---

## PHASE 9 — Security, GDPR & Compliance (~1 week)

**Goal:** Audited system, GDPR-compliant, and ready for real users.

### Deliverables

- [ ] **OWASP checklist** audited: SQL Injection, XSS, CSRF, Brute Force, IDOR, Mass Assignment, Path Traversal, Clickjacking
- [ ] **HTTP security headers** configured in `next.config.js`: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- [ ] **Rate limiting** in Vercel Edge Middleware: 100 req/min per IP general, 10 req/min on auth endpoints
- [ ] **Basic penetration testing**: attempt to access another user's data (verify RLS)
- [ ] **npm audit** with no high/critical vulnerabilities
- [ ] **Snyk scan** in CI/CD
- [ ] **Privacy policy**: in Spanish, GDPR/LOPDGDD compliant, listing data processors
- [ ] **Terms of service**: including non-financial-advice disclaimer
- [ ] **GDPR management in app**: export data (ZIP JSON), delete account (cascade delete + TOTP confirmation)
- [ ] **Cookie consent**: if applicable (no third-party cookies planned)
- [ ] **Sentry** configured with financial data scrubbing: no emails, no amounts in logs

**Assigned agent:** Security Reviewer  
**Instructions:** `security.instructions.md`

**Exit criteria:** OWASP checklist 100% · npm audit 0 high · cross-user RLS tests blocking · privacy policy published

---

## PHASE 10 — Launch (~1 week)

**Goal:** Stable production application with active monitoring.

### Deliverables

- [ ] **Final domain** (`patrimio.app` or similar) + DNS configured in Vercel
- [ ] **SSL / TLS 1.3** verified + HSTS preload submitted to preload list
- [ ] **Supabase migrations** executed on production project
- [ ] **Production environment variables** configured in Vercel Dashboard
- [ ] **`production.yml`** CI/CD: full ci → migrations → deploy → smoke tests → Sentry release
- [ ] **Sentry** configured in production with release tracking
- [ ] **Better Uptime** (ping every 3 min) on critical endpoints
- [ ] **Status page** (status.patrimio.app)
- [ ] **Beta testing** with real users
- [ ] **Bug fixes** post-beta
- [ ] Smoke tests post-deploy: login, create transaction, view dashboard, check quotes
- [ ] 🚀 Launch

**Exit criteria:** App responding correctly in production · 0 critical Sentry errors in first 24h · Uptime > 99.5% in first week

---

## Identified Improvements by Layer

### Detected Gaps — Described in spec but lacking complete architecture

| Gap                                                         | Impact | Effort  | Recommended Action                                                           |
| ----------------------------------------------------------- | ------ | ------- | ---------------------------------------------------------------------------- |
| Complete onboarding flow not detailed in spec               | High   | 1 week  | Create onboarding spec (profile + first account + first transactions)        |
| Active sessions UX without mockup                           | Medium | 3 days  | Build `ActiveSessions` component with device table + individual revocation   |
| Push notifications without detailed implementation          | Medium | 1 week  | Define service worker push handler + `push_subscriptions` table              |
| Reorderable dashboard widgets without tech decision         | Medium | 3 days  | Use `dnd-kit` with persistence in Supabase `profiles.widget_config` JSONB    |
| FIFO calculation for sales not implemented (avg price only) | High   | 2 weeks | Add `method` field to `investments` (fifo/avg) + logic in RPC                |
| Historical prices for charts without defined data source    | High   | 1 week  | Use FMP `/historical-price-full/` for initial seed of `investment_snapshots` |
| Custom alerts seed per municipality (IBI/IVTM dates vary)   | Low    | 3 days  | Default to configurable month/day; user adjusts on first use                 |
| `service_name` matching may miss multi-word variants        | Medium | 3 days  | Add `service_name_aliases TEXT[]` to `recurring_commitments`                 |

### Improvements — Database Layer

| Improvement                                                                      | Justification                                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Add `CONCURRENTLY` to materialized view refresh                                  | Avoid locks during dashboard updates in production               |
| `GIN` index on `transactions.tags` already planned — verify in performance tests | Tag searches can degrade without it                              |
| Partition `investment_snapshots` by year                                         | With daily quotes, the table can exceed 1M rows in 2-3 years     |
| Index on `market_cache.last_updated` for selective cron                          | The quotes cron must efficiently filter only "stale" tickers     |
| `push_subscriptions` table missing from spec                                     | Required to store Web Push registrations from the service worker |
| `widget_config JSONB` column in `profiles`                                       | Persists dashboard widget order/visibility for the user          |

### Improvements — Security Layer

| Improvement                                                | Justification                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Add `device_fingerprint` to `user_sessions` table          | Spec mentions it but does not architect the column                              |
| TOTP rate-limit: block after 5 failed attempts             | Supabase handles this for passwords; TOTP challenge needs Edge Middleware logic |
| Short-lived signed URLs for `receipts` bucket (15 min TTL) | Spec requires signed URLs but does not specify TTL                              |
| Audit log for critical financial operations                | Record who soft-deleted which transaction                                       |
| `Content-Security-Policy` nonce generated per request      | Spec anticipates this but must be implemented in middleware                     |

### Improvements — UX / Mobile Layer

| Improvement                                            | Justification                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Biometrics support (Face ID / Touch ID) via WebAuthn   | iOS Safari 17+ supports `PublicKeyCredential.authenticatorAttachment = platform`  |
| **Quick action from iOS home screen**: add transaction | Web App Manifest `shortcuts[]` adds a direct shortcut in the icon long-press menu |
| "Quick read" dashboard mode without scroll             | Compact summary widget for lock screen (future widget)                            |
| Haptic feedback on transaction confirmation            | Vibration API available in iOS Safari 16.4+ when installed as PWA                 |
| Amount input with automatic thousands separator        | Better UX than raw numeric field for amounts > €1,000                             |

### Improvements — Observability Layer

| Improvement                        | Justification                                            |
| ---------------------------------- | -------------------------------------------------------- |
| Market API health dashboard        | Know in real time which source is active (Yahoo/AV/FMP)  |
| Alert on stale financial data > 1h | If the quotes cron fails, notify before the user notices |

---

## Global Effort Estimate

| Phase                                                             | Duration    | Complexity   |
| ----------------------------------------------------------------- | ----------- | ------------ |
| Phase 0 — Foundations                                             | ~2 weeks    | 🔴 High      |
| Phase 1 — Authentication                                          | ~2 weeks    | 🔴 High      |
| Phase 2 — Core Transactions                                       | ~3 weeks    | 🔴 High      |
| Phase 3 — Dashboard + Commitments + Subscriptions + Custom Alerts | ~3 weeks    | 🔴 High      |
| Phase 4 — Bank Statement Import                                   | ~2 weeks    | 🔴 High      |
| Phase 5 — Analytics & Budgets                                     | ~2 weeks    | 🟡 Medium    |
| Phase 6 — Investments                                             | ~3 weeks    | 🔴 Very High |
| Phase 7 — Reports & Export                                        | ~1 week     | 🟡 Medium    |
| Phase 8 — PWA & Polish                                            | ~2 weeks    | 🟡 Medium    |
| Phase 9 — Security & Compliance                                   | ~1 week     | 🔴 High      |
| Phase 10 — Launch                                                 | ~1 week     | 🟢 Low       |
| **TOTAL**                                                         | **~22 wks** |              |

---

**Recommended next step:** Execute Phase 0 — start with `npx create-next-app@latest patrimio --typescript --tailwind --app`, create the Supabase project, and apply the full schema migrations using the `supabase-migration` skill.
