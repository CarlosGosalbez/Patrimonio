# PATRIMIO — Especificación Técnica Completa

**Versión:** 1.1.0  
**Fecha:** 2026  
**Clasificación:** Documento Técnico de Arquitectura y Producto  
**Autor:** Arquitectura de Sistema

---

## TABLA DE CONTENIDOS

1. [Visión General del Producto](#1-visión-general-del-producto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico Detallado](#3-stack-tecnológico-detallado)
4. [Base de Datos — Esquema Completo](#4-base-de-datos--esquema-completo)
5. [Seguridad — Capas y Protocolos](#5-seguridad--capas-y-protocolos)
6. [Autenticación y Autorización](#6-autenticación-y-autorización)
7. [Módulos Funcionales](#7-módulos-funcionales) (M0–M10)
8. [Integraciones Externas](#8-integraciones-externas)
9. [PWA e Experiencia Mobile (iOS/Safari)](#9-pwa-e-experiencia-mobile-iossafari)
10. [Testing y Calidad](#11-testing-y-calidad)
11. [CI/CD y DevOps](#12-cicd-y-devops)
12. [Observabilidad y Monitoreo](#13-observabilidad-y-monitoreo)
13. [RGPD y Compliance](#14-rgpd-y-compliance)
14. [Roadmap de Fases](#15-roadmap-de-fases)
15. [Estimación de Costes](#16-estimación-de-costes)
16. [Referencias Técnicas](#17-referencias-técnicas)

---

## 1. VISIÓN GENERAL DEL PRODUCTO

### 1.1 Descripción

**Patrimio** es una aplicación web de seguimiento patrimonial personal (personal finance tracking), diseñada para que un único usuario (o familia) registre y visualice su patrimonio completo: gastos, ingresos, compromisos futuros, presupuestos, e inversiones (acciones, ETFs, criptomonedas).

**⚠️ IMPORTANTE — Patrimio NO es una app de pagos ni de banca:**

- **NO gestiona fondos reales** — los usuarios introducen registros manuales de transacciones ya realizadas fuera de la app
- **NO realiza transacciones bancarias** — no conecta con APIs bancarias que muevan dinero (PSD2/Open Banking fuera de alcance)
- **NO custodia activos** — las inversiones son registros de seguimiento, no holdings reales en custodia
- **Datos sensibles GDPR-compliant** — aunque no se mueve dinero, los importes y categorías son datos personales protegidos bajo RGPD/LOPDGDD

La aplicación se despliega como PWA optimizada para iPhone/Safari y se construye sobre una arquitectura serverless con Supabase y Vercel.

### 1.2 Principios de Diseño

- **Security First**: cada capa del sistema asume que la anterior puede fallar
- **Privacy by Design**: los datos de un usuario son físicamente inaccesibles para otro a nivel de motor de base de datos (RLS)
- **Offline-First**: la PWA funciona sin conexión para consultas básicas
- **Mobile-First**: diseñado primariamente para Safari en iPhone, compatible desktop
- **Rule-Based Intelligence**: categorización automática por reglas deterministas y alertas estadísticas de gasto

### 1.3 Usuarios Objetivo

- Perfil principal: individuo adulto con hipoteca, inversiones y necesidad de control financiero
- Uso desde iPhone vía Safari, ocasionalmente desde escritorio
- Sin conocimientos técnicos avanzados requeridos para el uso diario
- Un único propietario de cuenta (arquitectura no multi-tenant en v1)

---

## 2. ARQUITECTURA DEL SISTEMA

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (PWA)                            │
│   Next.js 15 App Router  │  React 18  │  Tailwind + shadcn/ui   │
│   Service Worker (Cache) │  Zustand   │  React Query            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                        │
│   Edge Middleware (Rate Limit + Auth Guard)                     │
│   SSR / ISR / Static Assets                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼───────┐ ┌───────▼──────┐ ┌───────▼──────────┐
│  SUPABASE AUTH │ │  SUPABASE DB │ │ SUPABASE STORAGE │
│  JWT + TOTP    │ │  PostgreSQL  │ │  Private Buckets │
│  RLS Policies  │ │  RLS + RPC   │ │  Signed URLs     │
└────────────────┘ └───────┬──────┘ └──────────────────┘
                           │
                  ┌────────▼────────┐
                  │ SUPABASE EDGE   │
                  │   FUNCTIONS     │
                  │ (Deno / TS)     │
                  └────────┬────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼──────────────────┐ ┌──────────────▼──────┐
│  FINANCIAL MARKET APIS    │ │  RESEND / EMAIL      │
│  Yahoo, AlphaV, FMP…      │ │  NOTIFICATIONS       │
│  (cotizaciones)           │ │                      │
└───────────────────────────┘ └──────────────────────┘
```

### 2.1 Patrones Arquitectónicos Utilizados

- **Repository Pattern**: abstracción de acceso a datos desacoplada de la UI
- **Command Pattern**: para operaciones financieras con undo/redo
- **Event Sourcing (parcial)**: cada transacción financiera es inmutable; las correcciones se realizan con nuevas entradas, no sobreescritura
- **CQRS lite**: separación de queries (lectura, optimizadas con views materializadas) y commands (escritura con validación)
- **Optimistic Updates**: la UI responde inmediatamente y reconcilia con el servidor

---

## 3. STACK TECNOLÓGICO DETALLADO

### 3.1 Frontend

| Tecnología           | Versión           | Rol                                            |
| -------------------- | ----------------- | ---------------------------------------------- |
| **Next.js**          | 14.x (App Router) | Framework React con SSR/ISR/SSG                |
| **React**            | 18.x              | UI library con Concurrent Features             |
| **TypeScript**       | 5.x               | Tipado estático end-to-end                     |
| **Tailwind CSS**     | 3.x               | Utilidades CSS, tema personalizable            |
| **shadcn/ui**        | latest            | Componentes accesibles basados en Radix UI     |
| **Zustand**          | 4.x               | Estado global ligero (sesión, preferencias)    |
| **TanStack Query**   | 5.x               | Server state, cache, invalidación              |
| **TanStack Table**   | 8.x               | Tablas con sort, filter, pagination            |
| **TanStack Virtual** | 3.x               | Virtualización de listas largas (IconPicker)   |
| **Recharts**         | 2.x               | Gráficos SVG responsivos                       |
| **Framer Motion**    | 11.x              | Animaciones de UI declarativas                 |
| **React Hook Form**  | 7.x               | Formularios performantes con validación        |
| **Zod**              | 3.x               | Schema validation isomórfico (client + server) |
| **SheetJS (xlsx)**   | 0.18.x            | Parser Excel/CSV en cliente (sin subir datos)  |
| **date-fns**         | 3.x               | Manipulación de fechas, localización es/en     |
| **Lucide React**     | latest            | Iconos SVG consistentes y ligeros              |
| **next-pwa**         | 5.x               | Service Worker, cache estratégico, offline     |
| **Sentry**           | 8.x               | Error tracking frontend                        |

### 3.2 Backend / Infraestructura

| Tecnología                  | Versión | Rol                                               |
| --------------------------- | ------- | ------------------------------------------------- |
| **Supabase**                | Cloud   | BaaS: DB, Auth, Storage, Realtime, Edge Functions |
| **PostgreSQL**              | 15.x    | Base de datos relacional principal                |
| **Supabase Auth**           | —       | JWT, TOTP 2FA, sesiones, refresh tokens           |
| **Supabase RLS**            | —       | Row Level Security, políticas por tabla           |
| **Supabase Realtime**       | —       | WebSockets para cotizaciones en vivo              |
| **Supabase Edge Functions** | Deno    | Webhooks, cron jobs, lógica serverless            |
| **Supabase Storage**        | —       | Ficheros privados con signed URLs                 |
| **Vercel**                  | —       | Deploy Next.js, Edge Middleware, CDN              |
| **Resend**                  | —       | Emails transaccionales (notificaciones, alertas)  |

### 3.3 DevOps y Calidad

| Herramienta             | Rol                                       |
| ----------------------- | ----------------------------------------- |
| **GitHub Actions**      | CI/CD pipelines                           |
| **Vitest**              | Unit testing (reemplaza Jest, más rápido) |
| **Playwright**          | E2E testing (incluye móvil/Safari)        |
| **ESLint + Prettier**   | Linting y formateo de código              |
| **Husky + lint-staged** | Git hooks pre-commit                      |
| **Dependabot**          | Actualización automática de dependencias  |
| **Sentry**              | Error monitoring + performance            |

---

## 4. BASE DE DATOS — ESQUEMA COMPLETO

### 4.1 Principios de Modelado

- **UUID v4** como primary key en todas las tablas (no integers secuenciales — evita enumeración)
- **Soft deletes**: columna `deleted_at TIMESTAMPTZ` en lugar de `DELETE` físico
- **Auditoría**: columnas `created_at`, `updated_at` con `DEFAULT NOW()` y trigger automático
- **RLS obligatorio**: toda tabla tiene política que filtra por `auth.uid()`
- **Importes en centavos (INTEGER)**: evita errores de punto flotante. `850.75 €` → `85075`
- **Moneda separada del importe**: columna `currency VARCHAR(3)` con código ISO 4217

### 4.2 Esquema Detallado

#### `profiles` — Perfil extendido del usuario

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  base_currency VARCHAR(3)  NOT NULL DEFAULT 'EUR',
  timezone      VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  locale        VARCHAR(10) NOT NULL DEFAULT 'es-ES',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS**: `id = auth.uid()`

#### `accounts` — Cuentas financieras

```sql
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        account_type NOT NULL, -- ENUM: checking, savings, investment, cash, credit
  institution VARCHAR(100),
  currency    VARCHAR(3) NOT NULL DEFAULT 'EUR',
  color       VARCHAR(7), -- HEX color para UI
  icon        VARCHAR(50), -- Nombre del icono Lucide
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
```

**RLS**: `user_id = auth.uid() AND deleted_at IS NULL`

#### `categories` — Categorías de transacciones

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = categoría del sistema
  name        VARCHAR(100) NOT NULL,
  type        category_type NOT NULL, -- ENUM: income, expense, transfer
  icon        VARCHAR(50),
  color       VARCHAR(7),
  parent_id   UUID REFERENCES categories(id), -- subcategorías
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
```

**RLS**: `user_id = auth.uid() OR user_id IS NULL` (sistema visible para todos)

**Categorías del sistema predefinidas:**

- Ingresos: Nómina, Alquiler cobrado, Dividendos, Freelance, Otros ingresos
- Gastos: Vivienda, Hipoteca/Préstamo, Alimentación, Transporte, Salud, Educación, Ocio, Suscripciones, Seguros, Impuestos, Ropa, Restaurantes, Viajes, Tecnología, Otros gastos
- Inversiones: Compra activos, Venta activos, Comisiones broker

#### `transactions` — Transacciones financieras (núcleo del sistema)

```sql
CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES accounts(id),
  category_id           UUID REFERENCES categories(id),
  type                  transaction_type NOT NULL, -- ENUM: income, expense, transfer
  amount_cents          INTEGER NOT NULL, -- Siempre positivo; el tipo indica dirección
  currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
  description           TEXT,
  notes                 TEXT,
  transaction_date      DATE NOT NULL,
  value_date            DATE, -- Fecha valor bancaria (puede diferir)
  recurring_id          UUID REFERENCES recurring_commitments(id),
  is_recurring_instance BOOLEAN DEFAULT false,
  import_source         import_source_type, -- ENUM: manual, excel, csv, api
  import_batch_id       UUID, -- Para agrupar las de una misma importación
  transfer_pair_id      UUID REFERENCES transactions(id), -- Para transferencias entre cuentas
  attachment_path       TEXT, -- Path en Supabase Storage
  tags                  TEXT[] DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_tags ON transactions USING gin(tags);
```

**RLS**: `user_id = auth.uid() AND deleted_at IS NULL`

#### `recurring_commitments` — Compromisos futuros y suscripciones

```sql
CREATE TABLE recurring_commitments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  type              transaction_type NOT NULL, -- income o expense
  commitment_type   commitment_type_enum NOT NULL DEFAULT 'other',
  -- ENUM: mortgage, rent_income, rent_expense, subscription, tax, insurance, utility, other
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'EUR',
  frequency         frequency_type NOT NULL, -- ENUM: weekly, biweekly, monthly, quarterly, annual, custom
  custom_days       SMALLINT,
  start_date        DATE NOT NULL,
  end_date          DATE,
  account_id        UUID REFERENCES accounts(id),
  category_id       UUID REFERENCES categories(id),
  description       TEXT,
  notes             TEXT,
  last_generated    DATE,
  auto_generate     BOOLEAN DEFAULT true,
  is_active         BOOLEAN DEFAULT true,
  -- Campos suscripciones: si cancelled_at está set y aparece cargo posterior → alerta
  cancelled_at      DATE,
  service_name      VARCHAR(100), -- Nombre exacto que aparece en extracto bancario
  -- Campos ingresos esperados: si no llega en tolerance_days → notificación impago
  tolerance_days    SMALLINT DEFAULT 3,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_commitments_user ON recurring_commitments(user_id) WHERE deleted_at IS NULL;
```

**RLS**: `user_id = auth.uid() AND deleted_at IS NULL`

**Ejemplo de datos:**

```text
Hipoteca: type=expense, amount=85000 (850€), frequency=monthly, start_date=2019-03-01, end_date=2041-03-01, category=Hipoteca/Préstamo
Alquiler cobrado: type=income, amount=70000 (700€), frequency=monthly, start_date=2023-01-01, end_date=NULL
```

#### `investments` — Posiciones de inversión

```sql
CREATE TABLE investments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker                  VARCHAR(20) NOT NULL,
  name                    VARCHAR(200) NOT NULL,
  type                    investment_type NOT NULL, -- ENUM: stock, etf, crypto, fund, bond, other
  exchange                VARCHAR(20), -- NYSE, NASDAQ, BME, XETRA...
  shares                  DECIMAL(18, 8) NOT NULL, -- Soporta fracciones (crypto, fondos)
  avg_purchase_price_cents INTEGER NOT NULL, -- Precio medio de compra en centavos
  currency                VARCHAR(3) NOT NULL DEFAULT 'EUR',
  account_id              UUID REFERENCES accounts(id),
  annual_dividend_per_share_cents INTEGER DEFAULT 0, -- EDITABLE por el usuario
  dividend_frequency      frequency_type, -- quarterly, annual...
  next_dividend_date      DATE, -- EDITABLE por el usuario
  notes                   TEXT,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_investments_user_ticker ON investments(user_id, ticker)
  WHERE deleted_at IS NULL AND is_active = true;
```

**RLS**: `user_id = auth.uid() AND deleted_at IS NULL`

#### `investment_operations` — Historial de operaciones de inversión

```sql
CREATE TABLE investment_operations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id     UUID NOT NULL REFERENCES investments(id),
  type              operation_type NOT NULL, -- ENUM: buy, sell, dividend, split, bonus
  shares            DECIMAL(18, 8) NOT NULL,
  price_per_share_cents INTEGER NOT NULL,
  fees_cents        INTEGER DEFAULT 0,
  total_cents       INTEGER NOT NULL, -- shares * price + fees
  operation_date    DATE NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS**: `user_id = auth.uid()`

#### `investment_snapshots` — Histórico de valoración (para gráficos)

```sql
CREATE TABLE investment_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id     UUID NOT NULL REFERENCES investments(id),
  snapshot_date     DATE NOT NULL,
  market_price_cents INTEGER NOT NULL,
  market_value_cents INTEGER NOT NULL, -- shares * market_price
  unrealized_pl_cents INTEGER NOT NULL, -- market_value - (shares * avg_purchase_price)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (investment_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON investment_snapshots(user_id, snapshot_date DESC);
```

**RLS**: `user_id = auth.uid()`

#### `budgets` — Presupuestos por categoría

```sql
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id),
  amount_cents  INTEGER NOT NULL,
  period        budget_period NOT NULL, -- ENUM: monthly, annual
  alert_threshold SMALLINT DEFAULT 80, -- Porcentaje (0-100) para alertar
  year          SMALLINT, -- NULL = aplica todos los años
  month         SMALLINT, -- NULL = aplica todos los meses (si period=monthly)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS**: `user_id = auth.uid()`

#### `auto_categorization_rules` — Reglas de auto-categorización

```sql
CREATE TABLE auto_categorization_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  match_field    match_field_type NOT NULL, -- ENUM: description, amount, both
  match_type     match_type_enum NOT NULL, -- ENUM: contains, starts_with, exact, regex
  match_value    TEXT NOT NULL,
  category_id    UUID NOT NULL REFERENCES categories(id),
  account_id     UUID REFERENCES accounts(id), -- NULL = aplica a todas las cuentas
  priority       SMALLINT DEFAULT 0, -- Mayor = se evalúa primero
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS**: `user_id = auth.uid()`

#### `custom_alerts` — Avisos personalizados (impuestos, seguros, fechas clave)

```sql
CREATE TABLE custom_alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 VARCHAR(200) NOT NULL,
  description          TEXT,
  alert_category       VARCHAR(100), -- 'IBI', 'IRPF', 'seguro_coche', 'impuesto_vehiculo', 'basura', custom
  expected_amount_cents INTEGER,     -- Presupuesto orientativo para el gasto
  due_date             DATE NOT NULL, -- Próxima fecha límite de pago
  recurrence           alert_recurrence_type NOT NULL, -- ENUM: annual, one_time, custom
  recurrence_month     SMALLINT,    -- Mes del año (1-12) para recurrencias anuales
  recurrence_day       SMALLINT,    -- Día del mes (1-31)
  advance_notice_days  SMALLINT DEFAULT 30, -- Avisar X días antes del vencimiento
  is_active            BOOLEAN DEFAULT true,
  last_notified_at     TIMESTAMPTZ,
  dismissed_until      DATE,        -- Snooze: no volver a avisar hasta esta fecha
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_custom_alerts_user ON custom_alerts(user_id, due_date)
  WHERE deleted_at IS NULL AND is_active = true;
```

**RLS**: `user_id = auth.uid() AND deleted_at IS NULL`

**Alertas predefinidas del sistema (seed, editables por el usuario):**

- IBI: recurrencia anual, aviso 30 días antes (mes configurable por comunidad autónoma)
- IRPF / Declaración de la Renta: anual, 30 junio, aviso 45 días antes
- Impuesto de Circulación (IVTM): anual, fecha variable por municipio
- Seguro del Coche: anual, aviso 30 días antes de renovación
- Seguro del Hogar: anual
- Tasa de Basura: anual o semestral, configurable

#### `market_cache` — Caché de cotizaciones (no tiene RLS de usuario)

```sql
CREATE TABLE market_cache (
  ticker        VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(200),
  current_price_cents INTEGER,
  currency      VARCHAR(3) DEFAULT 'EUR',
  change_1d_pct DECIMAL(8,4),
  change_1d_cents INTEGER,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        VARCHAR(50) -- 'alpha_vantage', 'yahoo', 'fmp'
);
```

**RLS**: SELECT público (todos pueden leer cotizaciones), INSERT/UPDATE solo Edge Functions con service_role

#### `notifications` — Notificaciones y alertas del sistema

```sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          notification_type NOT NULL, -- budget_alert, commitment_due, price_alert, etc.
  title         VARCHAR(200) NOT NULL,
  body          TEXT,
  metadata      JSONB, -- datos adicionales dependientes del tipo
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
```

**RLS**: `user_id = auth.uid()`

### 4.3 Vistas Materializadas (para performance)

```sql
-- Balance mensual por cuenta
CREATE MATERIALIZED VIEW monthly_account_balance AS
SELECT
  user_id,
  account_id,
  DATE_TRUNC('month', transaction_date) as month,
  SUM(CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END) as net_cents
FROM transactions
WHERE deleted_at IS NULL
GROUP BY user_id, account_id, DATE_TRUNC('month', transaction_date);

-- Gasto por categoría y mes (para dashboard)
CREATE MATERIALIZED VIEW monthly_category_spending AS
SELECT
  user_id,
  category_id,
  DATE_TRUNC('month', transaction_date) as month,
  SUM(amount_cents) as total_cents,
  COUNT(*) as transaction_count
FROM transactions
WHERE deleted_at IS NULL AND type = 'expense'
GROUP BY user_id, category_id, DATE_TRUNC('month', transaction_date);
```

### 4.4 Funciones RPC (Stored Procedures)

```sql
-- Calcular patrimonio neto total del usuario
CREATE OR REPLACE FUNCTION get_net_worth(p_user_id UUID)
RETURNS TABLE(
  liquid_assets_cents BIGINT,
  investment_value_cents BIGINT,
  total_debts_cents BIGINT,
  net_worth_cents BIGINT
) ...

-- Proyectar flujo de caja para los próximos N meses
CREATE OR REPLACE FUNCTION project_cash_flow(p_user_id UUID, p_months INTEGER)
RETURNS TABLE(
  month DATE,
  projected_income_cents BIGINT,
  projected_expenses_cents BIGINT,
  projected_balance_cents BIGINT
) ...

-- Calcular precio medio ponderado al registrar compra
CREATE OR REPLACE FUNCTION recalculate_avg_purchase_price(p_investment_id UUID)
RETURNS INTEGER ...
```

---

## 5. SEGURIDAD — CAPAS Y PROTOCOLOS

### 5.1 Modelo de Seguridad en Profundidad (Defense in Depth)

```text
Capa 1: RED           — HTTPS obligatorio (TLS 1.3), HSTS
Capa 2: EDGE          — Rate limiting (Vercel Edge), geoblocking opcional
Capa 3: AUTENTICACIÓN — JWT firmado RS256, refresh token rotation, TOTP 2FA
Capa 4: AUTORIZACIÓN  — RLS en PostgreSQL, políticas por tabla y operación
Capa 5: APLICACIÓN    — Validación Zod (client + server), sanitización inputs
Capa 6: DATOS         — Cifrado en reposo (AES-256), Storage con signed URLs
Capa 7: AUDITORÍA     — Logs de acceso, alertas de anomalías
```

### 5.2 Headers de Seguridad HTTP (next.config.js)

```javascript
// Content Security Policy estricta
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';

// Otros headers críticos
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 5.3 Protección contra Ataques Comunes

| Ataque                 | Medida de Mitigación                                              |
| ---------------------- | ----------------------------------------------------------------- |
| **SQL Injection**      | Supabase usa prepared statements; RLS añade capa adicional        |
| **XSS**                | CSP estricta, React escapa por defecto, DOMPurify para rich text  |
| **CSRF**               | SameSite=Strict en cookies, tokens JWT en headers (no cookies)    |
| **Brute Force**        | Rate limiting Vercel Edge + Supabase Auth lockout (5 intentos)    |
| **Session Hijacking**  | Refresh token rotation, binding a device fingerprint              |
| **IDOR**               | RLS hace imposible acceder a recursos de otro user_id             |
| **Mass Assignment**    | Validación Zod estricta con `.strict()` en todos los schemas      |
| **Path Traversal**     | Supabase Storage valida paths; nunca se exponen rutas del sistema |
| **Clickjacking**       | X-Frame-Options: DENY + CSP frame-ancestors                       |
| **Dependency Attacks** | Dependabot + npm audit en CI/CD                                   |

### 5.4 Gestión de Secretos

- **Variables de entorno** en Vercel Dashboard (nunca en `.env` en repo)
- **Supabase secrets** para Edge Functions vía CLI
- **Rotation de claves**: las API keys de servicios externos se rotan trimestralmente
- **Principio de mínimo privilegio**: cada servicio tiene solo las credenciales que necesita
- **Anon key vs Service role key**: la anon key (cliente) tiene RLS; la service_role (solo servidor) tiene acceso total y NUNCA llega al cliente

### 5.5 Política de Contraseñas y Sesiones

**Contraseña:** mínimo 12 chars · mayúscula + minúscula + número + símbolo · zxcvbn ≥ 3 · no igual a últimas 5 · no contiene email

**Sesiones:** JWT expira 1h · refresh token 7 días con rotación · auto-logout 30min inactivo · máx. 5 sesiones simultáneas · email en login desde dispositivo nuevo

---

## 6. AUTENTICACIÓN Y AUTORIZACIÓN

### 6.1 Flujo de Autenticación

```text
Usuario → Email + Password + (TOTP si activo)
       → Supabase Auth valida credenciales
       → Si 2FA activo: challenge TOTP
       → Emite access_token (JWT) + refresh_token
       → JWT contiene: sub (user_id), email, aud, exp, role
       → Cliente almacena en memory (no localStorage) + cookie HttpOnly
       → RLS de PostgreSQL verifica auth.uid() en cada query
```

### 6.2 Configuración 2FA TOTP

**Setup del usuario:**

1. Usuario activa 2FA en configuración de perfil
2. Sistema genera secreto TOTP (base32, 160 bits)
3. Se muestra QR code para escanear con Authenticator App
4. Usuario introduce código de 6 dígitos para verificar
5. Sistema genera 10 códigos de recuperación de un solo uso (16 chars hex cada uno)
6. Códigos de recuperación se muestran UNA VEZ y se almacenan hasheados (bcrypt) en BD
7. 2FA queda activado — cada login requiere el código TOTP

**Aplicaciones compatibles:** Apple Passwords (iOS 17+, integrado en Safari — prioridad), Google Authenticator, Authy, 1Password, Bitwarden

### 6.3 Row Level Security — Políticas Tipo

```sql
-- Política SELECT (usuario ve solo sus datos)
CREATE POLICY "users_own_transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Política INSERT (solo puede insertar con su propio user_id)
CREATE POLICY "users_insert_transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política UPDATE (solo puede modificar sus propios registros)
CREATE POLICY "users_update_transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política DELETE (soft delete, solo sus registros)
CREATE POLICY "users_delete_transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id); -- SET deleted_at = NOW()
```

---

### 6.4 Biometría Web — Face ID / Touch ID (WebAuthn)

WebAuthn API (W3C, Safari iOS 14.5+) permite Face ID / Touch ID sin app nativa.

| Modo             | Descripción                                      | Requisito            |
| ---------------- | ------------------------------------------------ | -------------------- |
| 2FA biométrico   | Face/Touch ID como segundo factor                | iOS 14.5+            |
| Passkey          | Login sin contraseña                             | iOS 16+ / Safari 17+ |
| Re-autenticación | Acciones críticas (borrar cuenta, exportar RGPD) | iOS 14.5+            |

- Frontend: `@simplewebauthn/browser` · Backend: `@simplewebauthn/server`
- Tabla `webauthn_credentials`: credential ID, public key, metadata por dispositivo
- Multidevice: iPhone + iPad + MacBook registrables simultáneamente
- Requiere HTTPS (cubierto por Vercel); funciona en Safari y en PWA standalone

---

## 7. MÓDULOS FUNCIONALES

### 7.1 Módulo de Autenticación (M0)

**Pantallas:** Login, Register, Forgot Password, Reset Password, 2FA Setup, 2FA Challenge, Recovery Codes
**Funcionalidades:**

- Login con email + contraseña + TOTP opcional
- Registro con verificación de email obligatoria
- Recuperación de contraseña vía email (link con expiración 1h)
- Setup y gestión de 2FA (activar, desactivar, regenerar códigos)
- Vista de sesiones activas con posibilidad de revocar
- Indicador de fortaleza de contraseña en tiempo real

### 7.2 Dashboard Principal (M1)

**Objetivo:** Situación financiera completa a golpe de vista en < 3 segundos

**Widgets:**

- **Hero Card**: Patrimonio neto total (activos − pasivos), con variación mensual
- **Saldo del mes**: Ingresos − Gastos del mes actual, comparativa vs mes anterior
- **Flujo proyectado**: Barra 30/60/90 días basada en compromisos recurrentes
- **Top categorías**: Donut chart de los 5 mayores gastos del mes
- **Próximos compromisos**: Lista de los 7 próximos vencimientos/cuotas
- **Cartera resumen**: Valor total inversiones + P&L del día
- **Alertas activas**: Badge unificado con: presupuestos al límite · suscripciones cobradas indebidamente · ingresos esperados no recibidos · avisos personalizados próximos (IBI, IRPF, seguros)
- **Últimas transacciones**: 5 más recientes con categoría e importe

**Personalización:** el usuario puede reordenar y ocultar widgets

### 7.3 Transacciones (M2)

**Vistas:**

- Lista infinita con filtros avanzados
- Vista calendario (transacciones agrupadas por día)
- Vista analítica (resumen por período)

**Funcionalidades:**

- **Entrada manual rápida**: tap tipo (ingreso/gasto), importe con teclado numérico, descripción, categoría, cuenta → 4 pasos máximo desde iPhone
- **Formulario completo**: todos los campos incluyendo notas, etiquetas, adjunto, fecha valor
- **Búsqueda full-text** en descripción y notas
- **Filtros**: rango de fechas, categoría, cuenta, tipo, importe (min/max), etiquetas
- **Acciones bulk**: seleccionar múltiples → categorizar, etiquetar, eliminar
- **Swipe-to-delete** en mobile
- **Adjuntar foto** de recibo desde cámara o galería (solo en mobile)
- **Transacciones transferencia** entre cuentas propias (par vinculado)
- **Edición inline** de descripción y categoría sin abrir formulario completo

### 7.4 Importación de Extractos (M3)

**Formatos soportados:** .xlsx, .xls, .csv, .ofx (Open Financial Exchange), .qif

**Flujo de importación:**

1. Selección de archivo (drag & drop o selector nativo iOS)
2. Parsing en cliente con SheetJS (ningún dato financiero llega al servidor sin procesar)
3. **Detección automática de columnas**: el sistema identifica fecha, descripción, importe, tipo mediante heurísticas
4. **Preview interactivo**: tabla con todas las transacciones detectadas, editable
5. **Mapeo de columnas**: si la detección falla, el usuario arrastra para asignar columnas
6. **Deduplicación**: comparación contra transacciones existentes (fecha + importe + descripción similar) con flag "posible duplicado"
7. **Detección de cobros de suscripciones canceladas**: para cada transacción importada, se comprueba si su descripción coincide con el `service_name` de algún `recurring_commitment` donde `cancelled_at < transaction_date`. Si hay coincidencia → flag `⚠️ Cobro inesperado: suscripción cancelada` y genera notificación `subscription_unexpected_charge`
8. **Verificación de ingresos esperados**: tras importar, el sistema comprueba los compromisos de tipo `income` cuya fecha de cobro esperada ha pasado (`tolerance_days`) sin que haya transacción coincidente → genera notificación `expected_income_unpaid`
9. **Auto-categorización**: aplica las reglas del usuario (motor determinista, sin IA)
10. **Confirmación y ajuste bulk**: el usuario puede modificar categorías de múltiples transacciones similares en un paso
11. Import → transacciones creadas con `import_source` y `import_batch_id` para rollback si es necesario

**Formatos de extracto bancarios españoles soportados:**

- Banco Santander CSV
- BBVA Excel/CSV
- CaixaBank Excel
- ING CSV
- Sabadell CSV
- Formato genérico configurable

### 7.5 Compromisos Futuros (M4) — _"Calendario Financiero"_

**Pantallas:**

- Vista lista de compromisos activos
- Vista línea de tiempo (timeline horizontal de 24 meses)
- Vista proyección de flujo de caja

**Funcionalidades:**

- Crear compromisos con todos los parámetros: nombre, tipo, importe, frecuencia, inicio, fin
- **Tipo de compromiso**: hipoteca, alquiler cobrado/pagado, suscripción, impuesto, seguro, suministro, otro (afecta lógica de alertas)
- **Proyección visual**: curva de saldo estimado a 12 meses combinando compromisos + promedio histórico
- **Alertas de vencimiento**: notificación configurable X días antes de que venza un compromiso
- **Alerta de saldo insuficiente**: proyección detecta si el saldo podría ser negativo en algún mes y avisa
- **Alerta de impago (ingresos)**: Edge Function diaria verifica compromisos `type=income` cuya fecha esperada ha transcurrido más de `tolerance_days` sin transacción coincidente → notificación `expected_income_unpaid` (ej: alquiler no cobrado)
- **Auto-generación de transacciones**: opcionalmente crea la transacción el día que toca (configurable)
- **Gestión de hipoteca**: campo específico para el año de vencimiento, amortización anticipada, tipo fijo/variable
- **Tabla anual de compromisos**: vista matricial mes × compromiso con totales

### 7.6 Inversiones (M5)

**Secciones:**

- Portfolio overview (tabla + gráficos)
- Detalle por posición
- Historial de operaciones
- Dividendos
- Rendimiento histórico

**Funcionalidades:**

- Añadir/editar posición: ticker, nombre, tipo, acciones, precio medio, cuenta, notas
- **Cotizaciones en tiempo real** (o diferido 15 min): precio actual, variación diaria en € y %
- **Búsqueda de tickers**: autocompletado al añadir nueva posición
- **P&L no realizado** por posición y total de cartera
- **P&L realizado** (historial de ventas con cálculo FIFO o precio medio)
- **Dividendos esperados**: cálculo automático basado en `annual_dividend_per_share_cents` editable × acciones
- **Calendario de dividendos**: fecha estimada de cobro por posición (editable)
- **Operaciones**: registrar compra (actualiza precio medio automáticamente), venta, dividendo cobrado, split
- **Gráfico evolución de cartera**: histórico de valor total a lo largo del tiempo
- **Distribución**: por tipo (acción/ETF/crypto), por sector (si disponible), por geografía
- **Alerta de precio**: notificación si un activo sube/baja X% en un día

### 7.7 Presupuestos (M6)

- Crear presupuesto mensual o anual por categoría
- Barra de progreso en tiempo real (gastado vs límite)
- Alerta visual y push cuando superas el umbral configurado
- Comparativa mes a mes de cumplimiento
- "Dinero disponible" por categoría (límite − gastado)

### 7.8 Informes y Análisis (M7)

- **Informe mensual**: resumen ejecutivo de ingresos, gastos, ahorro, tasa de ahorro
- **Evolución de patrimonio neto**: gráfico de línea histórico
- **Análisis por categoría**: trending mensual/anual, categorías que crecen o bajan
- **Informe fiscal simplificado**: rendimientos de capital, dividendos cobrados (para IRPF)
- **Exportación**: PDF del informe del período, Excel con todas las transacciones del período
- **Comparativa de períodos**: este mes vs mes anterior, este año vs año anterior

### 7.9 Configuración y Perfil (M8)

- Datos personales, moneda, zona horaria, idioma
- Gestión de cuentas bancarias (CRUD)
- Gestión de categorías (crear, editar, reordenar, desactivar)
- Reglas de auto-categorización (CRUD)
- Configuración de 2FA
- Notificaciones (qué alertas recibir y por qué canal)
- Importación / Exportación de todos los datos (RGPD)
- Eliminación de cuenta (con confirmación doble y TOTP si activo)
- **Sesiones activas**: ver dispositivos conectados, revocar sesiones individuales

---

### 7.10 Suscripciones (M9)

**Objetivo:** Detectar cobros de suscripciones canceladas o no autorizadas.

**Funcionalidades:**

- CRUD de suscripciones vinculadas a `recurring_commitments` (`commitment_type = 'subscription'`)
- Campo `service_name`: texto que aparece en el extracto bancario (p.ej. "NETFLIX", "SPOTIFY") — usado para matching en importación
- Campo `cancelled_at`: fecha en que el usuario canceló el servicio. Si se importa un cargo posterior → alerta `subscription_unexpected_charge` con botón "Reclamar"
- **Panel de suscripciones**: lista con estado (activa / cancelada / alerta de cobro inesperado), importe mensual total, próxima renovación
- **Detector en importación**: matching por descripción contra `service_name` (contains, case-insensitive). Si `cancelled_at < fecha_cargo` → marcado en rojo en el preview de importación y notificación tras confirmar
- **Comparativa vs año anterior**: gasto total en suscripciones mes a mes

**DB:** Usa `recurring_commitments` con `commitment_type = 'subscription'`. No requiere tabla nueva.

---

### 7.11 Avisos Personalizados (M10)

**Objetivo:** Recordatorios configurables para obligaciones fiscales, seguros y pagos periódicos no recurrentes en el flujo de caja habitual.

**Funcionalidades:**

- CRUD de avisos sobre tabla `custom_alerts`
- **Alertas predefinidas del sistema** (editables): IBI, IRPF, Impuesto Circulación, Seguro Coche, Seguro Hogar, Tasa de Basura
- Campos configurables por aviso: fecha límite · importe máximo esperado · días de antelación del aviso · recurrencia (anual / única vez / personalizado)
- **Snooze**: posponer el aviso hasta una fecha concreta (`dismissed_until`)
- **Vinculación a categoría**: al crear el aviso, el usuario puede asociarlo a una categoría de gasto para que el dashboard detecte si ya se registró el pago y desactive el aviso automáticamente
- **Widget en Dashboard**: sección "Próximos vencimientos" con avisos de los siguientes 60 días ordenados por urgencia
- **Email digest semanal** (opcional): resumen de avisos activos enviado por Resend

**Edge Function `check-alerts` (cron diario):**

1. Consulta `custom_alerts` donde `due_date - advance_notice_days <= TODAY` y `last_notified_at IS NULL OR last_notified_at < hoy`
2. Consulta `recurring_commitments (income)` donde fecha esperada ha pasado más de `tolerance_days` y no existe transacción coincidente
3. Genera notificaciones en tabla `notifications` + envía email si el canal está activado

---

## 7.X CORRECCIONES Y MEJORAS (2026-04)

### 7.X.1 Storage e Importes (Phase 1)

Bucket privado `informe` en Supabase Storage para archivos CSV de extractos bancarios. La tabla `transaction_import_batches` incluye columna `storage_path TEXT`. El helper `lib/imports/storage.ts` gestiona upload, validación de MIME y signed URLs para descarga.

### 7.X.2 Correlación de Transacciones (Phase 2)

Nueva tabla `transaction_correlation_rules` con ENUM `correlation_match_type` (exact_amount | amount_range | concept_contains | concept_regex). Columna `commitment_id UUID` añadida a `transactions`. Edge Function `check-commitment-expirations` (cron diario) detecta compromisos expirados. Motor en `lib/imports/correlation.ts`.

### 7.X.3 Categorías y Quick Actions (Phase 3)

Tres categorías del sistema: Nómina (income), Bizum recibido (income), Bizum enviado (expense). Endpoint `POST /api/transactions`. Componente `QuickActionButtons` con 9 botones y modal compacto.

### 7.X.4 Dashboard Dinámico (Phase 4)

Trigger `trg_transactions_sync_account_balance` mantiene `accounts.current_balance_cents` sincronizado. GRANTs de EXECUTE añadidos a `get_net_worth(UUID)` y `refresh_dashboard_views()` para el rol `authenticated`. Back-fill recalcula balances existentes al aplicar la migración.

### 7.X.5 Assets y Logo (Phase 5)

Componente `components/ui/Logo.tsx` con variantes `header` (h-8), `login` (h-16) y `default` (h-12). Reemplaza el icono placeholder en el header de la app y en el layout de auth.

### 7.X.6 Selector de Iconos (Phase 6)

`IconPickerModal`: lista virtualizada con `@tanstack/react-virtual` (6 columnas × 48 px, overscan 5), búsqueda con debounce 300 ms. `IconPicker`: lazy-loaded con `next/dynamic({ ssr: false })`, precarga al hover/focus. Hook genérico `useDebouncedValue<T>` reutilizable.

### 7.X.7 Footer y Márgenes (Phase 7)

Tabla `feedback` (bug | mejora | duda) con RLS. Componente `Footer` con créditos y diálogo `ReportProblemDialog`. Padding inferior del layout principal: `pb-24 md:pb-32`.

### 7.X.8 Animaciones Framer Motion (Phase 8)

`AnimatedList` + `AnimatedItem` para stagger fade-up de listas de tarjetas. `MotionCard` con hover lift (`whileHover={{ y: -2 }}`). Las summary cards del dashboard usan animación de entrada staggered.

### 7.X.9 Accesibilidad WCAG 2.2 (Phase 9)

`aria-label` + `aria-pressed` en el botón ToggleWidget del dashboard. Skip-link internacionalizado via clave `appShell.skipToMain`. Los formularios de auth ya contaban con `role="alert"`, `htmlFor` y `aria-label` completos.

---

## 8. INTEGRACIONES EXTERNAS

### 8.1 APIs de Cotizaciones Financieras

| API                            | Plan Gratuito       | Límite                 | Uso                                |
| ------------------------------ | ------------------- | ---------------------- | ---------------------------------- |
| **Yahoo Finance** (no oficial) | Sí                  | Sin límite documentado | Cotizaciones primarias             |
| **Alpha Vantage**              | Sí (clave gratuita) | 25 req/día             | Backup + datos fundamentales       |
| **Financial Modeling Prep**    | Sí                  | 250 req/día            | Búsqueda de tickers, datos empresa |
| **Open Exchange Rates**        | Sí                  | 1.000 req/mes          | Tipos de cambio para multi-moneda  |
| **CoinGecko**                  | Sí                  | 30 req/min             | Cotizaciones de criptomonedas      |

**Estrategia de caché:**

- Edge Function en cron cada 15 minutos actualiza `market_cache` para todos los tickers en uso
- El cliente lee de `market_cache` (Supabase Realtime) — no hace llamadas directas a APIs externas
- Si `last_updated` > 30 min, se muestra indicador de datos desactualizados
- Fallback: si todas las APIs fallan, se muestra precio del último snapshot disponible

### 8.2 Servicio de Email (Resend)

- Verificación de email en registro
- Recuperación de contraseña
- Notificación de nuevo login desde dispositivo desconocido
- Alertas de presupuesto (semanal digest opcional)
- Alerta de vencimiento de compromiso
- **Alerta de cobro inesperado de suscripción cancelada**
- **Alerta de ingreso esperado no recibido (impago)**
- **Avisos personalizados (IBI, IRPF, seguros, etc.)** — puede incluirse en digest semanal
- Informe mensual automático (opcional, toggle del usuario)

### 8.3 Sentry (Error Monitoring)

- Tracking de errores en cliente y Edge Functions
- Performance monitoring (LCP, FID, CLS)
- Alertas de error rate elevado
- Session replay (anonimizado, sin datos financieros)

---

## 9. PWA E EXPERIENCIA MOBILE (iOS/SAFARI)

### 9.1 Configuración PWA

**manifest.json:**

```json
{
  "name": "Patrimio",
  "short_name": "Patrimio",
  "description": "Tu gestor de patrimonio personal",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0A0A0A",
  "background_color": "#0A0A0A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Meta tags específicos para iOS/Safari:**

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Patrimio" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 9.2 Service Worker (Estrategias de Caché)

```text
Cache-First: assets estáticos (JS, CSS, fonts, imágenes)
Network-First: datos financieros (transacciones, cotizaciones)
Stale-While-Revalidate: dashboard (muestra cached, actualiza en bg)
Network-Only: operaciones de escritura (crear/editar transacciones)
```

**Funcionalidad offline:**

- Lectura del dashboard y transacciones de los últimos 30 días (desde caché)
- Cola de escritura: si hay transacción pendiente de subir, se sincroniza al volver a tener red
- Indicador visual de modo offline

### 9.3 Optimizaciones iOS/Safari Específicas

- **Safe Area Insets**: padding env(safe-area-inset-\*) en toda la layout
- **Teclado numérico**: `inputMode="decimal"` en campos de importe
- **Touch targets**: mínimo 44×44px (Human Interface Guidelines de Apple)
- **Scroll momentum**: `-webkit-overflow-scrolling: touch` donde aplique
- **Zoom prevention**: `user-scalable=no` solo en formularios de importe
- **Tap highlight**: `-webkit-tap-highlight-color: transparent` para look nativo
- **Rubber band scroll prevention** en modales: `overscroll-behavior: contain`
- **Web Share API**: compartir transacciones o informes usando el share sheet nativo de iOS
- **Vibration API** (si disponible): feedback háptico en acciones críticas
- **Dark mode**: `@media (prefers-color-scheme: dark)` + `color-scheme: dark`

---

## 11. TESTING Y CALIDAD

### 11.1 Pirámide de Testing

```text
        ┌─────┐
        │ E2E │  5% — Playwright, Safari/iOS simulado
       ┌┴─────┴┐
       │Integration│  20% — API routes, DB functions, auth flows
      ┌┴───────────┴┐
      │  Unit Tests  │  75% — Componentes, utilities, agentes, skills
     └──────────────┘
```

### 11.2 Unit Tests (Vitest)

- Todos los componentes React (React Testing Library)
- Todas las utilities financieras (cálculo precio medio, proyecciones, P&L)
- Todos los Zod schemas de validación
- Detección de anomalías estadísticas y lógica de reglas de auto-categorización

### 11.3 Integration Tests

- Flujos de autenticación completos (registro, login, 2FA, recuperación)
- Importación de extractos con archivos de muestra reales
- CRUD de transacciones verificando RLS
- Cálculos de portfolio con datos reales

### 11.4 E2E Tests (Playwright)

**Escenarios críticos:**

- Happy path: registro → onboarding → añadir transacción → ver dashboard
- Importación: subir extracto → mapear → confirmar → verificar transacciones
- 2FA: activar → logout → login con TOTP → acceder
- Cartera: añadir posición → ver cotización → registrar dividendo
- PWA: instalar en Safari simulado → usar offline → sincronizar

**Configuración iOS/Safari:**

```typescript
// playwright.config.ts
projects: [
  { name: "safari-iphone", use: devices["iPhone 14"] },
  { name: "safari-ipad", use: devices["iPad Pro 11"] },
  { name: "chromium", use: { channel: "chrome" } },
];
```

### 11.5 Security Testing

- **OWASP ZAP**: escaneo automatizado en CI/CD
- **npm audit**: en cada push
- **Snyk**: análisis de dependencias en GitHub Actions
- **Lighthouse Security Audit**: en cada deploy
- Revisión manual de políticas RLS con tests específicos (intentar acceder a datos de otro user_id simulado)

---

## 12. CI/CD Y DEVOPS

### 12.1 GitHub Actions Workflows

**`ci.yml`** (en cada push a cualquier rama):

```text
1. Install dependencies
2. Type check (tsc --noEmit)
3. Lint (ESLint)
4. Format check (Prettier)
5. Unit tests (Vitest)
6. Build (next build)
7. Security scan (npm audit + Snyk)
```

**`preview.yml`** (en cada PR):

```text
1. Todo lo de ci.yml
2. Deploy preview en Vercel
3. E2E tests contra preview (Playwright)
4. Lighthouse audit
5. Comentar en PR con resultados y URL de preview
```

**`production.yml`** (merge a main):

```text
1. Todo lo anterior
2. Supabase migrations apply (producción)
3. Deploy producción en Vercel
4. Smoke tests post-deploy
5. Notificación a Sentry de nuevo release
```

### 12.2 Gestión de Migraciones de Base de Datos

- **Supabase CLI**: `supabase db diff` para generar migraciones
- Las migraciones se versionan en `/supabase/migrations/`
- Nunca se edita una migración ya aplicada, siempre se crea una nueva
- Las migraciones incluyen RLS policies, triggers, y datos de seed para categorías del sistema
- Rollback: cada migración tiene su counterpart de rollback documentado

### 12.3 Feature Flags

- Feature flags almacenados en tabla `app_settings` de Supabase, gestionables desde la UI de configuración sin redeploy
- Permiten activar/desactivar módulos de forma controlada
- Ejemplos: `investment_module_enabled`, `import_module_enabled`, `push_notifications_enabled`

---

## 13. OBSERVABILIDAD Y MONITOREO

### 13.1 Métricas de Performance (Web Vitals)

Objetivo para cada página:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time To First Byte): < 600ms

### 13.2 Sentry Configuration

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% de transacciones
  replaysSessionSampleRate: 0, // Sin replay en producción (datos financieros)
  replaysOnErrorSampleRate: 0, // Nunca en producción
  beforeSend(event) {
    // Scrubbing de datos financieros sensibles
    delete event.user?.email;
    // No enviar importes o descripciones de transacciones
    return scrubFinancialData(event);
  },
});
```

### 13.3 Alertas Operacionales

- Error rate > 1%: alerta inmediata
- Latencia P99 > 3s: alerta
- Disponibilidad < 99.5%: alerta crítica
- Fallo de Edge Function de cotizaciones: alerta (datos de inversión desactualizados)
- Fallo de envío de emails: alerta

### 13.4 Uptime Monitoring

- **Better Uptime** (plan gratuito): ping cada 3 minutos a endpoints críticos
- Status page pública opcional: status.patrimio.app

---

## 14. RGPD Y COMPLIANCE

### 14.1 Base Legal

- Tratamiento basado en **consentimiento explícito** (checkbox durante registro)
- Finalidad: gestión personal de finanzas por el propio titular
- No cesión de datos a terceros (salvo proveedores técnicos listados en política de privacidad)
- No hay publicidad, no hay análisis de comportamiento para terceros

### 14.2 Derechos del Usuario (Implementados en la app)

| Derecho           | Implementación                                                   |
| ----------------- | ---------------------------------------------------------------- |
| **Acceso**        | Perfil → Exportar mis datos → ZIP con JSON de todos los datos    |
| **Rectificación** | Edición directa de cualquier dato                                |
| **Supresión**     | Perfil → Eliminar cuenta → Borrado en cascada de todos los datos |
| **Portabilidad**  | Exportación en JSON estándar y CSV                               |
| **Oposición**     | Toggle para desactivar cada funcionalidad de IA                  |
| **Limitación**    | Posibilidad de pausar procesamiento de IA                        |

### 14.3 Política de Retención de Datos

- Datos financieros: se conservan mientras la cuenta esté activa
- Tras eliminación de cuenta: borrado físico en 30 días
- Logs de acceso (Supabase Auth): 90 días
- Backups cifrados: 30 días, luego eliminados

### 14.4 Subencargados de Tratamiento

Listados en política de privacidad con DPA firmado:

- Supabase Inc. (base de datos, auth, storage) — DPA disponible
- Vercel Inc. (hosting, edge network) — DPA disponible
- Resend Inc. (email transaccional) — DPA disponible
- Sentry Inc. (error tracking — configurado sin datos personales ni financieros)

---

## 15. ROADMAP DE FASES

> **Leyenda:** ✅ Completado · 🔄 En progreso · ⬜ Pendiente

### ✅ Fase 0: Setup y Fundaciones — COMPLETADA (2026-04-05)

- [x] Repositorio GitHub (`CarlosGosalbez/Patrimio`) con estructura Next.js 15 + TypeScript 5 + Tailwind + shadcn/ui
- [x] Supabase project `febokmcgjatrfdfuaeyk` (eu-west-1): DB, Auth, Storage configurados
- [x] RLS activado en todas las tablas
- [x] 19 migraciones aplicadas al remoto (`supabase db push` vía pooler `aws-0-eu-west-1:6543`)
  - ENUMs · profiles · categories · accounts · transactions · recurring_commitments
  - budgets · auto_categorization_rules · custom_alerts · investments · investment_operations
  - investment_snapshots · market_cache · notifications · materialized_views · rpc_functions
  - `moddatetime` extension + wrapper function (`120001_setup_extensions`)
- [x] Seed de 25+ categorías del sistema aplicado
- [x] Seed de alertas fiscales predefinidas (IBI, IRPF, IVTM, seguros)
- [x] `types/database.ts` generado desde schema real (1065 líneas)
- [x] `lib/supabase/client.ts` + `server.ts` + `middleware.ts`
- [x] `lib/financial/formatters.ts` (`formatCurrency`, `formatDate`, `decToCents`, `centsToDec`, `parseInputToCents`)
- [x] GitHub Actions CI (`ci.yml`): type-check → lint → unit tests → build
- [x] Sentry configurado: `sentry.client/server/edge.config.ts` + `instrumentation.ts` + `global-error.tsx` + `withSentryConfig` en `next.config.mjs`
- [x] `vercel.json` configurado con headers de seguridad, región `fra1`, env references
- [x] Unit tests Vitest: 9/9 pasan (`tests/unit/formatters.test.ts`)
- [x] `npm run build` ✅ · `npm run type-check` ✅ · CI green
- [x] Skill `supabase-migration` actualizado con patrón de push remoto (sin Docker)

**Notas de implementación:**

- La extensión `moddatetime` requiere una migración explícita (`120001`) antes de crear tablas con triggers `updated_at`. No se habilita automáticamente en Supabase Cloud.
- `supabase link` no funciona con tokens `sb_` (nuevo formato). Usar siempre `--db-url` con `DATABASE_URL_POOLER` (puerto 6543).
- Vercel env vars y GitHub Actions secrets pendientes de configurar manualmente en sus respectivos dashboards.

### ⬜ Fase 1: Autenticación Completa (Semana 3-4)

- [ ] Login / Register con validación robusta
- [ ] Verificación de email
- [ ] 2FA TOTP (setup + challenge + códigos de recuperación)
- [ ] Forgot/reset password
- [ ] Sesiones y revocación
- [ ] Onboarding: crear primera cuenta + configurar moneda
- [ ] RLS verificado con tests de acceso cruzado

### ⬜ Fase 2: Transacciones Core (Semana 5-7)

- [ ] CRUD completo de transacciones
- [ ] Entrada rápida mobile-optimizada
- [ ] Filtros y búsqueda
- [ ] Categorías (sistema + custom)
- [ ] Reglas de auto-categorización (motor determinista)
- [ ] Dashboard básico (saldo del mes, últimas transacciones)

### ⬜ Fase 3: Compromisos Futuros + Suscripciones + Avisos (Semana 8-10)

- [ ] CRUD de compromisos recurrentes con `commitment_type`
- [ ] Timeline visual 24 meses
- [ ] Proyección de flujo de caja
- [ ] Alertas de vencimiento
- [ ] Auto-generación de transacciones recurrentes (Edge Function cron)
- [ ] Módulo Suscripciones (M9): panel, `cancelled_at`, detector de cobros inesperados
- [ ] Módulo Avisos Personalizados (M10): CRUD, seed alertas fiscales, Edge Function `check-alerts`
- [ ] Lógica de impago para ingresos esperados no recibidos

### ⬜ Fase 4: Importación de Extractos (Semana 11-12)

- [ ] Parser SheetJS para Excel/CSV
- [ ] Detección automática de columnas
- [ ] Preview interactivo y deduplicación
- [ ] Formatos bancarios españoles específicos
- [ ] Bulk categorización post-import (motor de reglas)
- [ ] Detección de cobros de suscripciones canceladas en import pipeline
- [ ] Verificación de ingresos esperados no recibidos post-import

### ⬜ Fase 5: Dashboard y Análisis (Semana 12-13)

- [ ] Dashboard completo con todos los widgets
- [ ] Vistas de análisis por período
- [ ] Presupuestos con alertas y detección estadística de anomalías
- [ ] Informes exportables (PDF/Excel)

### ⬜ Fase 6: Inversiones (Semana 14-16)

- [ ] CRUD de posiciones de inversión
- [ ] Integración API de cotizaciones con caché
- [ ] Cálculo P&L en tiempo real
- [ ] Gestión de dividendos (editable)
- [ ] Historial de operaciones con precio medio automático
- [ ] Gráfico evolución cartera histórico

### ⬜ Fase 7: Polish y PWA (Semana 17-18)

- [ ] PWA completa (manifest, service worker, offline mode)
- [ ] Optimizaciones iOS/Safari (safe area, touch targets, teclado)
- [ ] Dark mode completo
- [ ] Animaciones y microinteracciones (Framer Motion)
- [ ] Notificaciones push (si compatible con Safari iOS 16.4+)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (LCP < 2.5s)

### ⬜ Fase 8: Seguridad y Compliance (Semana 19)

- [ ] Security audit completo (OWASP checklist)
- [ ] Penetration testing básico
- [ ] Página de política de privacidad y términos
- [ ] Implementación RGPD (exportar/eliminar datos)
- [ ] Cookie consent (si aplica — no cookies de terceros previstas)

### ⬜ Fase 9: Lanzamiento (Semana 20)

- [ ] Dominio definitivo (patrimio.app o similar)
- [ ] Certificado SSL, HSTS preload
- [ ] Status page
- [ ] Uptime monitoring
- [ ] Sentry configurado en producción
- [ ] Beta testing con usuarios reales (tú + familiares/amigos)
- [ ] Corrección de bugs post-beta
- [ ] Launch

---

## 16. ESTIMACIÓN DE COSTES

### 16.1 Costes de Infraestructura

| Servicio          | Plan  | Coste Mensual  | Notas                               |
| ----------------- | ----- | -------------- | ----------------------------------- |
| **Vercel**        | Hobby | $0             | Límites generosos para uso personal |
| **Supabase**      | Free  | $0             | 500MB DB, 1GB Storage, 50k MAU      |
| **Resend**        | Free  | $0             | 3.000 emails/mes                    |
| **Sentry**        | Free  | $0             | 5k errores/mes                      |
| **Alpha Vantage** | Free  | $0             | 25 req/día (suficiente con caché)   |
| **Dominio .app**  | —     | ~$1.50/mes     | Namecheap o Cloudflare              |
| **TOTAL Fase 1**  |       | **~$1.50/mes** |                                     |

### 16.2 Costes a Escala (si crece)

| Servicio          | Plan Pro | Cuándo activar                                        |
| ----------------- | -------- | ----------------------------------------------------- |
| **Vercel Pro**    | $20/mes  | Si hay > 100 usuarios activos                         |
| **Supabase Pro**  | $25/mes  | Si se superan límites del free tier                   |
| **Financial API** | $50/mes  | Si se necesitan cotizaciones en tiempo real sin caché |

### 16.3 Coste de Desarrollo (horas estimadas)

| Fase                      | Horas Estimadas | Complejidad |
| ------------------------- | --------------- | ----------- |
| Setup + Auth + DB         | 30-40h          | Alta        |
| Transacciones + Dashboard | 40-50h          | Alta        |
| Importación + Agentes     | 30-40h          | Muy alta    |
| Inversiones               | 40-50h          | Muy alta    |
| PWA + Polish              | 20-30h          | Media       |
| Testing + Security        | 20-30h          | Alta        |
| **TOTAL**                 | **~180-240h**   |             |

---

## 17. REFERENCIAS TÉCNICAS

### Documentación Oficial

- [Next.js 15 App Router](https://nextjs.org/docs/app) — Routing, layouts, server components
- [Supabase Auth](https://supabase.com/docs/guides/auth) — JWT, TOTP, RLS
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel Edge Middleware](https://vercel.com/docs/functions/edge-middleware)

### Seguridad

- [OWASP Top 10 2021](https://owasp.org/Top10/) — Lista de vulnerabilidades principales
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — Estándar de verificación de seguridad
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) — Políticas de contraseñas

### RGPD

- [AEPD — Agencia Española de Protección de Datos](https://www.aepd.es) — Normativa española
- [GDPR.eu](https://gdpr.eu) — Guías prácticas RGPD

### PWA / iOS

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — UX para iOS
- [web.dev PWA](https://web.dev/progressive-web-apps/) — Guías Google para PWA
- [Safari Web Extensions](https://developer.apple.com/documentation/safariservices)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

### Finanzas / APIs

- [Alpha Vantage Docs](https://www.alphavantage.co/documentation/)
- [Financial Modeling Prep API](https://financialmodelingprep.com/developer/docs)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)
- [Open Exchange Rates](https://openexchangerates.org/api)
- [ISO 4217 Currency Codes](https://www.iso.org/iso-4217-currency-codes.html)

### Patrones y Arquitectura

- [12 Factor App](https://12factor.net) — Metodología para apps modernas
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) — Martin Fowler
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — Documentación oficial

---

## APÉNDICE A: Estructura de Directorios del Proyecto

```text
patrimio/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group sin layout principal
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── setup-2fa/
│   ├── (app)/                    # Route group CON layout principal (autenticado)
│   │   ├── layout.tsx            # Layout con sidebar, header
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── commitments/
│   │   ├── investments/
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/
│   │   ├── market/
│   │   │   └── quotes/           # Proxy a APIs externas con caché
│   │   └── webhooks/
│   │       └── market-update/    # Recibe updates de Edge Function
│   ├── manifest.ts
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── charts/                   # Recharts wrappers
│   ├── forms/                    # Formularios con React Hook Form
│   ├── dashboard/
│   ├── transactions/
│   └── investments/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser
│   │   ├── server.ts             # Cliente server (SSR)
│   │   └── middleware.ts         # Auth en Edge Middleware
│   ├── market/
│   │   └── fetcher.ts            # Market data con fallback
│   ├── financial/
│   │   ├── calculations.ts       # Cálculos financieros core
│   │   ├── formatters.ts         # Formateo de moneda/fechas
│   │   └── projections.ts        # Proyecciones de flujo de caja
│   └── utils/
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
├── types/                        # TypeScript types globales
│   ├── database.ts               # Types generados por Supabase CLI
│   └── financial.ts              # Types financieros de dominio
├── supabase/
│   ├── migrations/               # Migraciones SQL versionadas
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── market-updater/       # Cron: actualiza cotizaciones
│   │   ├── generate-recurring/   # Cron: genera transacciones recurrentes
│   │   └── send-alerts/          # Cron: envía alertas de presupuesto
│   └── seed.sql                  # Datos iniciales (categorías del sistema)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                      # Playwright tests
├── public/
│   ├── icons/                    # PWA icons
│   └── screenshots/              # Para el manifest PWA
├── .github/
│   └── workflows/
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## APÉNDICE B: ENUMs de Base de Datos

```sql
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'investment', 'cash', 'credit', 'pension');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE category_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual', 'custom');
CREATE TYPE investment_type AS ENUM ('stock', 'etf', 'crypto', 'fund', 'bond', 'reit', 'commodity', 'other');
CREATE TYPE operation_type AS ENUM ('buy', 'sell', 'dividend', 'split', 'bonus', 'transfer_in', 'transfer_out');
CREATE TYPE import_source_type AS ENUM ('manual', 'excel', 'csv', 'ofx', 'qif', 'api');
CREATE TYPE budget_period AS ENUM ('monthly', 'annual');
CREATE TYPE match_field_type AS ENUM ('description', 'amount', 'both');
CREATE TYPE match_type_enum AS ENUM ('contains', 'starts_with', 'ends_with', 'exact', 'regex');
CREATE TYPE notification_type AS ENUM ('budget_alert', 'commitment_due', 'price_alert', 'import_complete', 'security_alert', 'monthly_report', 'dividend_received');
```

---

_Especificación técnica de Patrimio — web app de gestión de patrimonio personal. Ver `docs/PHASES.md` para el plan de implementación por fases._
