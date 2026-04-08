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

- [x] CRUD for positions: ticker, name, type, shares/units, average price, account
- [x] **Ticker search** with autocomplete (FMP API)
- [x] **Edge Function `market-updater`** (cron every 15 min): updates `market_cache` for all active tickers
- [x] **Real-time quotes** via Supabase Realtime subscribed to `market_cache`
- [x] **API fallback chain**: Yahoo Finance → Alpha Vantage → FMP → last snapshot
- [x] **Unrealized P&L** per position and total portfolio (in cents!)
- [x] **Realized P&L**: sale history with weighted average price calculation (`recalculate_avg_purchase_price` RPC)
- [x] **Dividend management**: editable `annual_dividend_per_share_cents`, editable `next_dividend_date`
- [x] **Dividend calendar**: list of upcoming estimated payments
- [x] **Record operations**: buy (auto-updates avg price), sell, dividend received, stock split
- [x] **Portfolio evolution chart**: historical value using `investment_snapshots`
- [x] **Portfolio distribution**: by type (stocks/ETF/crypto/funds), by sector, by currency
- [x] **Currency normalization**: USD/EUR via Open Exchange Rates
- [x] **Price alert**: notification if asset ±X% in a day
- [x] **Simplified IRPF fiscal report**: dividends received in the year (for tax return)
- [x] **Excel export** of operations for the year
- [x] **50/30/20 budget analysis**: built-in page showing needs/wants/savings breakdown from real spending data
- [x] **Top categories widget**: auto-computed spending summary with over-budget flags on analysis page

**Skills:** `market-data-fetcher`, `financial-data-reader`, `transaction-formatter`, `report-generator`  
**Instructions:** `financial-logic.instructions.md`

**Exit criteria:** P&L calculated correctly with real market data · average price updated correctly after operations · quotes updating via Realtime · IRPF disclaimer visible · all financial calculation tests green

### Status Update — 2026-04-07

**✅ COMPLETADA** — Todos los deliverables implementados y auditados.

**Fixes aplicados en esta sesión:**

- Eliminados 2 `window.confirm` en `InvestmentsPageClient.tsx` → patrón inline accesible con confirm/cancel
- Corregido `(value / 100)` en `InvestmentPositionDialog.tsx` → `centsToDec(value)` (financial rule)
- Corregidas 17 divisiones `/ 100` en `app/api/investments/export/route.ts` → `centsToDec()` (financial rule)
- Añadidos 5 tests `buildPositionLedger` en `tests/unit/phase6-investments.test.ts` → cobertura WACC completa

**Test coverage:** 11/11 tests passing

---

**Goal:** Native-like experience in iPhone Safari. Lighthouse ≥ 90 on all metrics.

### Deliverables

- [x] **`manifest.json`** complete with iOS icons, display_override, shortcuts
- [x] **Service Worker** (`@ducanh2912/next-pwa`): Cache-First (assets/fonts/images) · Network-First (data) · StaleWhileRevalidate (dashboard) · Network-Only (writes/auth)
- [x] **Offline mode**: `/offline` fallback page + service worker caching
- [x] **Offline write queue**: IndexedDB auto-sync (lib/pwa/offlineQueue.ts + useOfflineQueue hook)
- [x] **Safe Area Insets**: `env(safe-area-inset-*)` via CSS vars + Tailwind utilities in `globals.css`
- [x] **Touch targets** ≥ 44×44px on all interactive elements (nav 56px, buttons 44px)
- [x] **Numeric keyboard**: `inputMode="decimal"` audited on all amount fields
- [x] **Swipe gestures**: SwipeableTransactionRow component with framer-motion drag="x" + DELETE endpoint
- [x] **Full dark mode**: `next-themes` ThemeProvider + `prefers-color-scheme` CSS vars + ThemeToggle
- [x] **Animations and micro-interactions**: Framer Motion page transitions, FadeInUp, StaggerContainer, ScaleOnPress, AnimatedCounter
- [x] **Push notifications**: Web Push API + VAPID + `push_subscriptions` table (RLS) + `/api/pwa/subscribe` + `usePushNotifications` hook + `PushNotificationsSettings` component
- [x] **Web Share API**: `ShareButton` component with clipboard fallback
- [x] **WCAG 2.1 AA**: skip link, :focus-visible, role="alert", aria-live, aria-describedby, labels via useId()
- [ ] **Lighthouse audit**: pending Vercel deploy measurement

**Packages added:** `@ducanh2912/next-pwa`, `framer-motion`, `next-themes`

### Implementation summary

| Layer             | Files                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| PWA manifest      | `public/manifest.json`                                                                     |
| Service Worker    | `next.config.mjs` (withPWA + runtimeCaching)                                               |
| Dark mode         | `components/providers/ThemeProvider.tsx`, `components/ui/ThemeToggle.tsx`                  |
| Offline page      | `app/offline/page.tsx`                                                                     |
| Offline queue     | `lib/pwa/offlineQueue.ts`, `hooks/useOfflineQueue.ts`                                      |
| Swipe gestures    | `components/ui/SwipeableTransactionRow.tsx`, `app/api/transactions/[id]/route.ts` (DELETE) |
| Animations        | `components/providers/PageTransition.tsx`, `components/ui/Animations.tsx`                  |
| Web Share         | `components/ui/ShareButton.tsx`                                                            |
| Offline indicator | `components/ui/OfflineIndicator.tsx`                                                       |
| Push DB           | `supabase/migrations/20260406210000_phase8_push_subscriptions.sql`                         |
| Push API          | `app/api/pwa/subscribe/route.ts`, `lib/pwa/notifications.ts`                               |
| Push UI           | `hooks/usePushNotifications.ts`, `components/settings/PushNotificationsSettings.tsx`       |
| Settings page     | `app/(app)/settings/notifications/page.tsx`                                                |
| AppShell          | Skip link, OfflineIndicator, ThemeToggle, PageTransition, WCAG main#main-content           |
| CSS               | `app/globals.css` — safe-area vars, dark mode, pt/pb/px-safe utilities, momentum scroll    |
| i18n              | `messages/es.json + en.json` — offline, pushNotifications namespaces                       |

**Migration applied:** `push_subscriptions` table + RLS + updated_at trigger + types regenerated ✅

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
| Phase 7 — Reports & Export                                        | ~1 week     | ✅ Done      |
| Phase 8 — PWA & Polish                                            | ~2 weeks    | 🟡 Medium    |
| Phase 9 — Security & Compliance                                   | ~1 week     | 🔴 High      |
| Phase 10 — Launch                                                 | ~1 week     | 🟢 Low       |
| **TOTAL**                                                         | **~22 wks** |              |

---

**Recommended next step:** Execute Phase 0 — start with `npx create-next-app@latest patrimio --typescript --tailwind --app`, create the Supabase project, and apply the full schema migrations using the `supabase-migration` skill.
