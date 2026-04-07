# PATRIMIO — Estrategia de Monetización y Hoja de Ruta Comercial

**Versión:** 1.1.0  
**Fecha:** Abril 2026  
**Clasificación:** Documento de Producto y Negocio

---

## ÍNDICE

1. [Estado actual del producto](#1-estado-actual-del-producto)
2. [Análisis competitivo](#2-análisis-competitivo)
3. [Modelos de monetización evaluados](#3-modelos-de-monetización-evaluados)
4. [Estrategia recomendada: Freemium SaaS + Afiliación](#4-estrategia-recomendada-freemium-saas--afiliación)
5. [Mejoras de producto necesarias para monetizar](#5-mejoras-de-producto-necesarias-para-monetizar)
6. [Infraestructura técnica de billing](#6-infraestructura-técnica-de-billing)
7. [Límites Free vs Premium (Feature Matrix)](#7-límites-free-vs-premium-feature-matrix)
8. [Plan de afiliación — España](#8-plan-de-afiliación--españa)
9. [Modelo B2B / White-label](#9-modelo-b2b--white-label)
10. [Estimación de ingresos](#10-estimación-de-ingresos)
11. [Roadmap comercial de fases](#11-roadmap-comercial-de-fases)
12. [Riesgos y compliance regulatorio](#12-riesgos-y-compliance-regulatorio)

---

## 1. ESTADO ACTUAL DEL PRODUCTO

Patrimio está prácticamente terminado como producto técnico. Estado real a Abril 2026:

| Módulo                                    | Estado          | Valor para monetización |
| ----------------------------------------- | --------------- | ----------------------- |
| M0 — Autenticación (2FA, TOTP, WebAuthn)  | ✅ Completo     | Alto — diferenciador    |
| M1 — Dashboard con patrimonio neto        | ✅ Completo     | Alto — gancho principal |
| M2 — Transacciones (entrada rápida móvil) | 🔄 En progreso  | Crítico — core loop     |
| M3 — Importación extractos bancos ES      | ✅ Completo     | Alto — reduce fricción  |
| M4 — Compromisos futuros (timeline 24m)   | ✅ Completo     | Alto — diferenciador    |
| M5 — Inversiones con cotizaciones reales  | ✅ Completo     | Alto — premium trigger  |
| M6 — Presupuestos con alertas             | ✅ Completo     | Medio                   |
| M7 — Informes PDF/Excel + IRPF            | ✅ Completo     | Alto — premium trigger  |
| M8 — Configuración y perfil               | 🔄 Parcial      | Medio                   |
| M9 — Suscripciones y detección anomalías  | ✅ Completo     | Alto — diferenciador    |
| M10 — Alertas fiscales (IBI, IRPF, etc.)  | ✅ Completo     | Alto — único en mercado |
| PWA (offline, Service Worker, dark mode)  | ✅ Completo     | Alto — experiencia UX   |
| AI Agents (5 agentes Claude)              | ✅ Infraestruc. | Muy alto — premium tier |
| M-NEW-10 — AI Chatbot / Asistente         | 🔲 Pendiente    | Muy alto — retención    |
| M-NEW-11 — Optimizador Factura de Luz     | 🔲 Pendiente    | Alto — diferenciador ES |

**Conclusión:** El producto está a 2-3 semanas de producción (Fases 9 y 10 pendientes). El nivel de funcionalidades supera a varios competidores de pago en el mercado español. Hay base real para monetizar.

---

## 2. ANÁLISIS COMPETITIVO

### 2.1 Competidores directos en España y Europa

| Producto                | Precio        | Modelo                        | Diferencial vs Patrimio                                     |
| ----------------------- | ------------- | ----------------------------- | ----------------------------------------------------------- |
| **Fintonic**            | Gratis        | Afiliación (crédito, seguros) | Conexión bancaria automática (PSD2); mayor base de usuarios |
| **YNAB**                | €14.99/mes    | Suscripción pura              | Metodología zero-based; no inversiones; US-first            |
| **Wallet BudgetBakers** | €4.99/mes     | Freemium                      | Multi-usuario; sync bancario Europa                         |
| **Spendee**             | €2.99/mes     | Freemium                      | Sync bancario; diseño más simple                            |
| **Copilot Money**       | €14.99/mes    | Suscripción pura              | Solo iOS/US; muy pulido; sin inversiones                    |
| **Money Dashboard**     | £4.99/mes     | Freemium                      | Solo UK; conexión bancaria                                  |
| **Monefy**              | $9.99 (único) | Compra única                  | Solo móvil; sin web; sin inversiones                        |
| **Excel/Sheets**        | Gratis        | —                             | Máxima flexibilidad; nula UX                                |

### 2.2 Gaps del mercado que Patrimio puede explotar

1. **Nadie en España ofrece tracking de inversiones integrado con gastos** en una app de finanzas personales bien diseñada y en español.
2. **Las alertas fiscales automatizadas** (IBI, IRPF, circulación) son exclusivas de Patrimio — no hay competidor directo.
3. **El timeline de compromisos futuros a 24 meses** con proyección de flujo de caja no existe en ninguna app española.
4. **La detección de cargos de suscripciones canceladas** es un diferenciador claro (M9).
5. **La integración con bancos españoles** (Santander, BBVA, CaixaBank, ING, Sabadell) via importación de extractos es un moat fuerte mientras no hay API bancaria.

### 2.3 Debilidades que hay que reconocer

- **Sin conexión bancaria automática** (Fintonic, Wallet la tienen): reduce fricción de onboarding. Es el mayor gap.
- **App para un único usuario** (v1): bloquea segmento familiar.
- **Sin app nativa iOS/Android**: aunque la PWA es excelente en Safari, algunos usuarios siguen prefiriendo App Store.

---

## 3. MODELOS DE MONETIZACIÓN EVALUADOS

### 3.1 Suscripción mensual/anual (Freemium SaaS)

**Descripción:** Capa gratuita con límites + capa de pago sin límites.

**Ventajas:**

- Ingresos recurrentes predecibles (MRR)
- Modelo bien entendido por el usuario
- Permite crecer la base de usuarios gratuitos → conversión orgánica

**Desventajas:**

- Requiere masa crítica de usuarios para generar MRR significativo
- Churn alto en finanzas personales si no hay sync bancario (fricción de entrada manual)

**Valoración: ✅ Recomendado como pilar principal**

---

### 3.2 Compra única / Lifetime Access

**Descripción:** Pago único (€49–€149) para acceso de por vida.

**Ventajas:**

- Conversión alta en producto técnicamente sólido
- Sin churn
- Ideal para lanzar con AppSumo / Product Hunt / IndieHackers

**Desventajas:**

- Sin ingresos recurrentes → requiere reinversión constante en adquisición
- Difícil mantener sostenibilidad a largo plazo con costes de Supabase/Vercel/Claude API
- Precio lifetime debe financiar costes de API de IA por usuario indefinidamente

**Valoración: ✅ Útil como oferta de lanzamiento puntual (AppSumo deal), no como modelo principal**

---

### 3.3 Afiliación / Referidos a productos financieros

**Descripción:** Patrimio recomienda productos financieros (brokers, cuentas, seguros) y cobra comisión por apertura o contratación.

**Ventajas:**

- Ingresos sin coste marginal por usuario
- Muy escalable
- Sinérgico: el usuario ya tiene su patrimonio en la app

**Desventajas:**

- Requiere volumen de usuarios activos para ser rentable
- Compliance regulatorio: no puede constituir "asesoramiento financiero" (requiere CNMV)
- Riesgo de erosionar la confianza del usuario si se percibe conflicto de interés

**Valoración: ✅ Recomendado como segundo pilar, con disclosure claro**

---

### 3.4 Uso de datos anonimizados / Inteligencia de mercado

**Descripción:** Vender insights agregados y anonimizados sobre patrones de gasto a empresas.

**Ventajas:**

- Ingresos pasivos a escala

**Desventajas:**

- ❌ **Incompatible con RGPD/LOPDGDD en la práctica**: los datos financieros son categoría especial bajo el artículo 9 RGPD. Aunque se anonimicen, el consentimiento debe ser explícito e informado para este uso, lo que rompe la confianza.
- ❌ El volumen de usuarios necesario para que sea rentable es muy alto.

**Valoración: ❌ Descartar — riesgo regulatorio y reputacional inaceptable**

---

### 3.5 B2B / White-label para asesorías financieras

**Descripción:** Vender Patrimio como herramienta white-label a gestorías, asesores patrimoniales y family offices, quienes lo ofrecen a sus clientes.

**Ventajas:**

- Ticket mucho mayor (€200–€800/mes por asesoría)
- Pocos clientes para ingresos significativos
- Canal de distribución ya establecido (el asesor vende a sus clientes)

**Desventajas:**

- Requiere multi-tenancy real (una asesoría gestiona múltiples clientes)
- Desarrollo adicional significativo (dashboard de asesor, gestión de permisos)
- Ciclos de venta B2B más lentos

**Valoración: ✅ Válido como fase 3 (12+ meses), tras masa crítica de usuarios individuales**

---

### 3.6 Open Source + Hosted Service

**Descripción:** Publicar el código fuente bajo licencia permisiva y cobrar por la versión hosted (modelo Plausible/Umami/Cal.com).

**Ventajas:**

- Comunidad de contribuidores reduce coste de desarrollo
- Credibilidad técnica y transparencia (muy valorada en fintech)
- Diferenciador: "Self-hosteable si no confiás en nadie con tus datos financieros"

**Desventajas:**

- Cualquiera puede hacer fork y ofrecer el servicio sin pagar
- La inversión realizada en desarrollo se expone

**Valoración: ⚠️ Considerar a largo plazo con licencia BSL/SSPL (código visible, no libre para uso comercial)**

---

## 4. ESTRATEGIA RECOMENDADA: Freemium SaaS + Afiliación

### 4.1 Modelo de dos pilares

```
PILAR 1: Freemium SaaS                    PILAR 2: Afiliación
─────────────────────                     ──────────────────
Free tier → adquisición                   Brokers: DeGiro, eToro, MyInvestor
Premium: €7.99/mes · €69/año              Seguros: Mutua Madrileña, Mapfre
                                          Cuentas remuneradas: Revolut, N26
     ↕ sinergia                           Fondos: Indexa, inbestMe
Más usuarios → más afiliación
Inversiones detectadas → broker CTA
```

### 4.2 Propuesta de valor por tier

**Free (siempre gratis):**

- Control total de gastos e ingresos diarios
- 1 cuenta bancaria, historial 12 meses, hasta 500 transacciones
- Dashboard básico (sin widgets de inversiones)
- Importación de extractos (1 importación/mes, máx. 100 transacciones)
- Compromisos futuros (máx. 5 activos)
- Presupuestos (máx. 3 categorías)

**Premium (€7.99/mes — €69/año):**

- Todo el Free sin límites
- Cuentas bancarias ilimitadas, historial completo
- Módulo de inversiones completo (cotizaciones reales, P&L, dividendos)
- AI Agents habilitados (Financial Insights, Budget Optimizer, etc.)
- Informes PDF y Excel con exportación IRPF
- Alertas fiscales avanzadas con recordatorios por email
- Sincronización offline y Web Push Notifications prioritarias
- Importación ilimitada de extractos de todos los bancos

**Lifetime Deal (oferta de lanzamiento, €149 — limitado a primeros 200 usuarios):**

- Acceso Premium de por vida
- Badge "Early Supporter" en perfil
- Voto prioritario en roadmap

---

## 5. MEJORAS DE PRODUCTO NECESARIAS PARA MONETIZAR

### 5.1 Mejoras críticas (bloqueantes para lanzar el plan de monetización)

#### M-NEW-01: Conexión bancaria via Open Banking (PSD2)

**Story:** Como usuario free, quiero que mis transacciones lleguen solas, para reducir la fricción de entrada manual.

**Análisis:**

- **Proveedor recomendado:** GoCardless (ex-Nordigen) — cobertura total de bancos españoles, precio razonable, RGPD-compliant, no requiere licencia bancaria al ser solo "Account Information Service"
- **Alternativa:** Salt Edge (más caro), Plaid (US-first, Spain limitado)
- **Arquitectura:** Edge Function Supabase invoca GoCardless API → parsea transacciones → aplica motor de auto-categorización existente → crea `transactions` con `import_source = 'open_banking'`
- **Coste:** ~€0.10-0.20 por conexión bancaria/mes (GoCardless) → absorber en premium
- **Compliance:** El usuario da consentimiento explícito (OAuth con su banco). Patrimio solo lee, nunca mueve fondos. Encaja en RGPD como "servicio de información de cuentas".

**RICE:** R:5 × I:3 × C:60% / E:3 semanas = **3.0 — Alta**

**DB:** nueva tabla `bank_connections` + columna `sync_source` en `transactions`

#### M-NEW-02: Multi-usuario / Cuentas familiares

**Story:** Como usuario premium, quiero compartir mi espacio financiero con mi pareja, para gestionar las finanzas del hogar juntos.

**RICE:** R:4 × I:2 × C:70% / E:4 semanas = **1.4 — Media**

**Arquitectura:** añadir concepto de `household_id` en `profiles`, policies RLS que permitan `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = ...)`, invitación por email.

#### M-NEW-03: Sistema de billing con Stripe

**Story:** Como administrador del producto, necesito cobrar suscripciones y gestionar trials, para generar ingresos.

**Implementación técnica completa:** ver sección 6.

**RICE:** R:5 × I:3 × C:95% / E:1 semana = **~14 — Crítica**

---

### 5.2 Mejoras de alto impacto en retención (aumentan LTV)

#### M-NEW-04: Coach financiero AI (premium only)

**Story:** Como usuario premium, quiero que Patrimio analice mis patrones y me dé recomendaciones personalizadas mensuales, para mejorar mis finanzas activamente.

**Implementación:** nuevo agente `financial-coach` — ejecuta al cierre del mes:

1. Lee transacciones del mes via `financial-data-reader` skill
2. Compara con 3 meses anteriores
3. Detects patrones con `anomaly-detector` skill
4. Genera informe en lenguaje natural: "Este mes gastaste un 34% más en restaurantes que tu media. Tu tasa de ahorro bajó al 8%. Con tu hipoteca actual podrías amortizar anticipadamente en X años si ahorras €Y/mes."
5. Se muestra como "Informe mensual de tu coach" en dashboard

**Diferenciador clave:** Patrimio ya tiene el contexto completo (inversiones + gastos + compromisos + alertas fiscales) que ningún competidor tiene. Claude puede hacer análisis mucho más rico que YNAB o Fintonic.

**RICE:** R:4 × I:3 × C:80% / E:2 semanas = **4.8 — Alta**

#### M-NEW-05: Goal tracking (Objetivos financieros)

**Story:** Como usuario, quiero definir objetivos (fondo de emergencia, coche nuevo, entrada piso) con fecha y progreso automático, para mantenerme motivado.

**DB:** nueva tabla `financial_goals`:

```sql
id, user_id, name, target_cents, current_cents, target_date,
linked_account_id, color, icon, created_at, deleted_at
```

**RICE:** R:3 × I:2 × C:75% / E:1 semana = **4.5 — Alta**

#### M-NEW-06: Tracking de inmuebles (Patrimonio Real)

**Story:** Como usuario con hipoteca, quiero registrar el valor de mi vivienda y vélo evolucionar en mi patrimonio neto, para tener una visión completa.

**Valor:** El activo más grande de la mayoría de españoles es su vivienda. Sin ella, el "patrimonio neto" calculado está incompleto y subestimado.

**DB:** nueva tabla `real_estate_assets`:

```sql
id, user_id, name, address, purchase_price_cents, current_value_cents,
purchase_date, linked_commitment_id (hipoteca), notes, deleted_at
```

**RICE:** R:4 × I:3 × C:85% / E:1 semana = **8.6 — Alta**

#### M-NEW-07: Comparativa 50/30/20 y guías de ahorro

La Phase 6 ya incluye análisis 50/30/20. Hay que expandirlo en:

- Una página dedicada `/dashboard/financial-health` con score de salud financiera (0-100)
- Recomendaciones concretas basadas en las desviaciones detectadas
- Gamificación ligera: badges por meses consecutivos con tasa de ahorro > X%

**RICE:** R:3 × I:2 × C:80% / E:4 días = **6.0 — Alta**

#### M-NEW-10: Asistente financiero conversacional (AI Chatbot)

**Story:** Como usuario, quiero preguntarle a Patrimio en lenguaje natural sobre mis finanzas, para obtener respuestas inmediatas sin navegar por menús.

**Análisis de mercado:**
Copilot Money (US, $7.92/mes) confirma en 2026 que la IA integrada es su principal diferenciador competitivo. Sus usuarios valoran especialmente que "el app hace el trabajo por ti" y que el asistente entiende el contexto completo de su dinero. YNAB Forum y r/personalfinance muestran demanda constante de respuestas contextuales: "¿cuánto gasté en restaurantes este trimestre?", "¿cuándo fue la última vez que pagué el seguro?", "¿en qué puedo ahorrar el mes que viene?".

Patrimio tiene una ventaja única: Claude ya tiene acceso a **todos los datos** (gastos, inversiones, compromisos, alertas, inmuebles) — ningún competidor español tiene esto integrado.

**Implementación:** Nuevo agente `patrimio-chat` en `app/api/ai/chat/route.ts`:

```typescript
// Consultas en lenguaje natural respondidas con contexto real del usuario
// Ejemplos de queries resueltas:
// "¿Cuánto gasté en supermercado este mes?" → query transactions por categoría
// "¿Cuándo es mi próximo recibo de la hipoteca?" → query commitments
// "¿Cómo va mi cartera hoy?" → query investments + market_cache
// "¿Tengo presupuesto para una cena?" → query budgets
// "¿Qué alertas fiscales tengo pendientes?" → query custom_alerts

// Herramientas del agente (tools del Vercel AI SDK):
// getTransactionSummary, getBudgetStatus, getCommitmentsOverview,
// getInvestmentSnapshot, getCustomAlerts, getMonthlyComparison
```

**UX:** Botón flotante "✦ Pregúntame" en dashboard → bottom sheet con input conversacional → respuesta en texto natural con datos reales. Historial de conversación en sesión (no persiste — privacidad).

**Límites:** Free = 5 consultas/día · Premium = ilimitado. Esto también sirve como motivador de upgrade.

**RICE:** R:5 × I:3 × C:85% / E:2 semanas = **6.4 — Alta**

---

### 5.3 Mejoras de adquisición (reducen CAC)

#### M-NEW-08: Onboarding guiado de alta conversión

El onboarding actual es mínimo (crear cuenta bancaria + moneda). Para maximizar activación:

**Flujo propuesto (5 pasos, < 3 minutos):**

1. **Bienvenida + propuesta de valor**: "Tu patrimonio completo, en 3 minutos"
2. **Importa tu primer extracto**: selector de banco español → importa 3 meses de historia inmediatamente
3. **Añade tus inversiones**: si tiene alguna cartera (opcional, skip)
4. **Configura compromisos clave**: hipoteca, alquiler, suscripciones principales (3 sugeridos)
5. **Activa alertas fiscales**: checklist IBI/IRPF/seguros personalizable

**Impacto:** la activación en el primer día es el predictor #1 de retención en 30 días.

#### M-NEW-09: Página de destino (landing page) optimizada para SEO

Patrimio necesita una landing pública antes de `/login`. Rutas SEO de alto volumen en España:

- "control gastos personales app" — 1.2K búsquedas/mes
- "app inversiones y gastos" — 800 búsquedas/mes
- "app alertas IBI IRPF" — 400 búsquedas/mes
- "importar extracto BBVA CaixaBank app" — 600 búsquedas/mes

**Implementación:** `app/(marketing)/` route group con RSC, sin `"use client"`, metadata OpenGraph, Schema.org `SoftwareApplication`, sitemap.xml.

---

### 5.4 Mejoras disruptivas — Exclusivas España

#### M-NEW-11: Optimizador de Factura de Luz con IA

**Story:** Como usuario, quiero introducir mis datos de consumo eléctrico y mis electrodomésticos, para que Patrimio me diga qué tarifa me conviene más y cómo puedo reducir mi factura de la luz.

**Contexto y oportunidad de mercado:**

España tiene un mercado eléctrico con dos grandes opciones:

- **PVPC** (Precio Voluntario al Pequeño Consumidor): tarifa regulada cuyo precio varía hora a hora según el mercado mayorista (pool). En tarifa discriminación horaria 3 periodos: **Valle** (00:00-08:00 · máx ahorro), **Llano** (08:00-10:00 y 14:00-18:00 y 22:00-00:00), **Punta** (10:00-14:00 y 18:00-22:00).
- **Mercado libre**: precio fijo pactado con comercializadora (Endesa, Iberdrola, Holaluz, Repsol, Factor Energía, etc.)

No hay ninguna app de finanzas personales española que integre el análisis de la factura eléctrica en el flujo de control patrimonial. Es un gasto del hogar que ocurre mensualmente, aparece en el extracto bancario como cargo automatizado, y nadie lo optimiza proactivamente.

**API disponible y gratuita:** Red Eléctrica Española publica precios PVPC en tiempo real via la API pública `api.esios.ree.es` (Indicator 1001 = PVPC €/MWh por hora). No requiere API key para consultas básicas. La CNMC ofrece también el comparador oficial en `comparador.cnmc.gob.es`.

**Funcionalidades del módulo:**

**a) Perfil de hogar energético** (onboarding del módulo):

```
¿Cuántas personas vivís en casa?   [ 1 / 2 / 3 / 4+ ]
Tipo de horno:                     [ Eléctrico / Gas / No tengo ]
Calefacción principal:             [ Bomba de calor / Gas / Radiadores eléctricos / No tengo ]
Coche eléctrico:                   [ Sí, cargo en casa / No ]
Potencia contratada (kW):          [ 2.3 / 3.45 / 4.6 / 5.75 / 6.9 / otro ]
Horario habitual en casa:          [ Mañanas / Tardes / Noches / Todo el día / Solo fines de semana ]
Tarifa actual:                     [ PVPC sin discriminación / PVPC 3 periodos / Precio fijo — con quién ]
Coste último mes (€):              [ campo €.cc ]
```

**b) Análisis con datos del extracto bancario:**
Al importar extractos (M3), Patrimio ya detecta cargos de suministros eléctricos ("ENDESA", "IBERDROLA", "NATURGY", etc.) como transacciones. El módulo puede:

- Rastrear automáticamente el histórico de facturas de luz ya importadas
- Calcular tendencia mensual y variación estacional
- Detectar meses anómalos (verano con aire acondicionado, invierno con calefacción)

**c) Recomendación tarifaria con IA:**

El agente `energy-optimizer` recibe:

1. Perfil de hogar (electrodomésticos + horario en casa)
2. Histórico de importes de facturas de luz (de transacciones importadas)
3. Precios PVPC hora a hora del último mes (API REE e·sios)
4. Precios de mercado libre vigentes de las principales comercializadoras

Y genera:

```
"Con tu perfil (2 personas, trabajo desde casa, bomba de calor, sin coche eléctrico),
el PVPC con discriminación horaria 3 periodos probablemente no te conviene porque
consumes principalmente de 10:00-14:00 (hora Punta — precio más caro).

Con precio fijo de Holaluz Siempre Verde (0.149 €/kWh) habrías pagado
~€18 menos el mes pasado comparado con tu factura actual de €87.

→ Recomendación: Cambia a precio fijo. Te ahorro el trámite: [Comparar en CNMC]"
```

**d) Tips de ahorro por electrodoméstico:**
Basado en el perfil del hogar, el agente da recomendaciones contextuales:

- "Tu lavavajillas consume ~1.3 kWh/ciclo. Programa para las 02:00 (Valle) y ahorras ~€0.08/ciclo = ~€2.40/mes."
- "La bomba de calor en modo 'eco' consume un 30% menos. Con tu uso estimado, el ahorro es ~€12/mes en invierno."
- "Detecté que pagas la factura de Iberdrola cada mes (~€95). ¿Quieres que analice si podrías pagar menos?"

**e) Widget en dashboard:** número de meses analizados + ahorro potencial estimado + CTA "Revisar mi tarifa"

**DB:** nueva tabla `energy_profiles`:

```sql
CREATE TABLE energy_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_size        SMALLINT NOT NULL DEFAULT 2,
  has_electric_oven     BOOLEAN NOT NULL DEFAULT FALSE,
  has_heat_pump         BOOLEAN NOT NULL DEFAULT FALSE,
  has_electric_heating  BOOLEAN NOT NULL DEFAULT FALSE,
  has_ev_charger        BOOLEAN NOT NULL DEFAULT FALSE,
  contracted_power_kw   DECIMAL(5,2),
  home_schedule         VARCHAR(30), -- 'mornings' | 'afternoons' | 'nights' | 'all_day' | 'weekends'
  current_tariff_type   VARCHAR(30), -- 'pvpc_flat' | 'pvpc_3periods' | 'fixed_market'
  current_supplier      VARCHAR(100),
  estimated_monthly_kwh INTEGER,     -- kWh/mes estimados
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE energy_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_energy_profile" ON energy_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**API de datos eléctricos:** Edge Function `energy-prices` consumiendo:

```
https://api.esios.ree.es/indicators/1001   -- PVPC precio por hora
https://api.esios.ree.es/indicators/10211  -- Discriminatoria 3 periodos
https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?...
```

**Potencial de afiliación:** CTA contextual → comparador CNMC (neutral) + comparador Selectra/Kelisto (afiliación CPA ~€15-25 por cambio de compañía). El usuario que sigue la recomendación y cambia de comercializadora genera comisión.

**RICE:** R:5 × I:3 × C:75% / E:3 semanas = **3.75 — Alta**

> **Fuente de datos:** API pública e·sios de Red Eléctrica Española (`api.esios.ree.es`) — precio PVPC hora a hora sin coste. Comparador oficial CNMC (`comparador.cnmc.gob.es`) para precios de mercado libre.

---

## 6. INFRAESTRUCTURA TÉCNICA DE BILLING

### 6.1 Stack de billing recomendado

| Componente         | Solución               | Alternativa         |
| ------------------ | ---------------------- | ------------------- |
| Payment processor  | **Stripe**             | Paddle (más simple) |
| Subscription logic | **Stripe Billing**     | —                   |
| Webhooks           | Stripe → Edge Function | —                   |
| Customer portal    | **Stripe Portal**      | Construir propio    |
| Invoices           | Stripe (automático)    | —                   |
| Tax compliance ES  | Stripe Tax             | Manual              |

### 6.2 Esquema de base de datos adicional

```sql
-- Nueva tabla: subscriptions
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100),
  plan                  VARCHAR(20) NOT NULL DEFAULT 'free',  -- 'free' | 'premium' | 'lifetime'
  status                VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Columna en profiles para cache local del plan
-- (evitar consultas a subscriptions en cada request)
ALTER TABLE profiles ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN plan_expires_at TIMESTAMPTZ;
```

### 6.3 API Routes de billing

```
POST /api/billing/create-checkout     → Stripe Checkout Session
POST /api/billing/create-portal       → Stripe Customer Portal
POST /api/billing/webhook             → Stripe webhooks (HMAC verificado)
GET  /api/billing/status              → Plan actual del usuario autenticado
```

### 6.4 Edge Function: stripe-webhooks

```typescript
// supabase/functions/stripe-webhooks/index.ts
// Maneja: customer.subscription.updated, customer.subscription.deleted,
//         checkout.session.completed, invoice.payment_failed
// Actualiza subscriptions + profiles.plan
// Envía email via Resend en payment_failed
```

### 6.5 Middleware de control de features (Feature Flags)

```typescript
// lib/billing/features.ts
export const PLAN_FEATURES = {
  free: {
    max_accounts: 1,
    max_transactions_per_month: 500,
    max_history_months: 12,
    max_commitments: 5,
    max_budgets: 3,
    max_imports_per_month: 1,
    investments: false,
    ai_agents: false,
    pdf_reports: false,
    excel_reports: false,
    fiscal_report: false,
    push_notifications: false,
    open_banking: false,
  },
  premium: {
    max_accounts: Infinity,
    max_transactions_per_month: Infinity,
    max_history_months: Infinity,
    max_commitments: Infinity,
    max_budgets: Infinity,
    max_imports_per_month: Infinity,
    investments: true,
    ai_agents: true,
    pdf_reports: true,
    excel_reports: true,
    fiscal_report: true,
    push_notifications: true,
    open_banking: true,
  },
  lifetime: {
    // idéntico a premium
  },
} as const;

export type Plan = keyof typeof PLAN_FEATURES;
export type FeatureKey = keyof typeof PLAN_FEATURES.premium;

export function canUseFeature(plan: Plan, feature: FeatureKey): boolean {
  return !!PLAN_FEATURES[plan][feature];
}
```

### 6.6 Hook de paywalls en componentes

```typescript
// hooks/useSubscription.ts
export function useSubscription() {
  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => fetch('/api/billing/status').then(r => r.json()),
    staleTime: 300_000,
  });

  return {
    plan: data?.plan ?? 'free',
    isPremium: data?.plan === 'premium' || data?.plan === 'lifetime',
    canUse: (feature: FeatureKey) => canUseFeature(data?.plan ?? 'free', feature),
  };
}

// Uso en componente:
const { canUse } = useSubscription();
if (!canUse('investments')) return <UpgradePrompt feature="investments" />;
```

---

## 7. LÍMITES FREE VS PREMIUM (FEATURE MATRIX)

| Característica                              | Free                 | Premium (€7.99/mes)   |
| ------------------------------------------- | -------------------- | --------------------- |
| Cuentas bancarias                           | 1                    | Ilimitadas            |
| Transacciones/mes                           | 500                  | Ilimitadas            |
| Historial de datos                          | 12 meses             | Completo              |
| Compromisos activos (hipoteca, alquiler…)   | 5                    | Ilimitados            |
| Presupuestos por categoría                  | 3                    | Ilimitados            |
| Importación de extractos bancarios          | 1 vez/mes, 100 filas | Ilimitada             |
| Módulo de inversiones                       | ❌                   | ✅                    |
| Cotizaciones en tiempo real                 | ❌                   | ✅                    |
| Agentes AI (Financial Coach, Budget AI)     | ❌                   | ✅                    |
| Asistente conversacional (AI Chatbot)       | 5 consultas/día      | Ilimitado             |
| Exportación PDF informes                    | ❌                   | ✅                    |
| Exportación Excel                           | CSV básico           | Excel completo        |
| Informe IRPF simplificado                   | ❌                   | ✅                    |
| Alertas fiscales avanzadas (email)          | Solo en-app          | Email + Push          |
| Conexión bancaria automática (Open Banking) | ❌                   | ✅                    |
| Gestión de inmuebles                        | ❌                   | ✅                    |
| Objetivos financieros                       | 1                    | Ilimitados            |
| Optimizador factura de luz (perfil básico)  | ✅ solo análisis     | ✅ + recomendación IA |
| Cuentas familiares (multi-usuario)          | ❌                   | ✅ (hasta 2 usuarios) |
| Soporte prioritario                         | ❌                   | ✅ Email < 24h        |

---

## 8. PLAN DE AFILIACIÓN — ESPAÑA

### 8.1 Principios de compliance

- Toda recomendación debe aparecer con el label **"Contenido publicitario / Afiliado"** prominente
- Patrimio **no constituye asesoramiento financiero** (MiFID II, LOPDGDD) — añadir disclaimer en cada CTA
- Las comisiones de afiliación no afectan al análisis objetivo en la app
- El usuario puede desactivar CTAs de afiliación en Configuración → Privacidad

### 8.2 Partners objetivo por categoría

#### Brokers de inversión (alineación máxima con M5)

| Partner            | Programa           | Comisión est.       | CTA natural en Patrimio                      |
| ------------------ | ------------------ | ------------------- | -------------------------------------------- |
| **DeGiro**         | Afiliados DeGiro   | €20-40 por cuenta   | Al añadir posición sin cuenta broker         |
| **eToro**          | eToro Partners     | €100-200 por CDF    | Dashboard inversiones → "Compra desde eToro" |
| **MyInvestor**     | Programa referidos | €50-100             | Al añadir fondos de inversión                |
| **XTB**            | XTB Affiliates     | €20-50 por depósito | Cartera con posiciones en acciones           |
| **inbestMe**       | Afiliados inbestMe | €25-75              | Análisis 50/30/20 → gestión delegada         |
| **Indexa Capital** | Programa referidos | 1 año gratis        | Cartera con fondos indexados                 |

#### Seguros (alineación con M10 — alertas seguros)

| Partner         | Programa | CTA natural                                           |
| --------------- | -------- | ----------------------------------------------------- |
| **Acierto.com** | CPA      | Alerta seguro del coche → "Comparar antes de renovar" |
| **Rastreator**  | CPA      | Alerta seguro hogar → "¿Pagas demasiado?"             |
| **ClicSeguro**  | CPA      | Alert seguro vida/salud                               |

#### Cuentas bancarias y fintech (alineación con M0 onboarding)

| Partner      | Comisión | CTA natural                                        |
| ------------ | -------- | -------------------------------------------------- |
| **Revolut**  | €20-40   | Detecta cuenta sin remuneración → CTA Revolut      |
| **N26**      | €20-30   | Onboarding → "Empieza a importar extractos"        |
| **Raisin**   | €25-50   | Usuarios con exceso de liquidez → cuentas depósito |
| **Sabadell** | Variable | Contactar equipo comercial                         |

#### IRPF y asesoría fiscal (alineación con M7 — informe IRPF)

| Partner            | Modelo     | CTA natural                                                 |
| ------------------ | ---------- | ----------------------------------------------------------- |
| **TaxDown**        | CPA €15-30 | Informe IRPF → "¿Quieres hacer la declaración con TaxDown?" |
| **Declarando**     | CPA €10-20 | Idem                                                        |
| **Gestoría local** | Lead gen   | Negociar directamente por zona geográfica                   |

#### Energía eléctrica (alineación con M-NEW-11 — Optimizador Factura de Luz)

| Partner             | Programa               | Comisión est.     | CTA natural en Patrimio                                       |
| ------------------- | ---------------------- | ----------------- | ------------------------------------------------------------- |
| **Selectra**        | Afiliados CPA          | €15-25 por cambio | Recomendación tarifaria → "Cambia con Selectra en 5 minutos"  |
| **Kelisto**         | Afiliados CPA          | €15-20 por cambio | Comparador tarifa integrado en módulo luz                     |
| **Holaluz**         | Afiliados directos     | €20-30 por alta   | Recomendación precio fijo verde → CTA Holaluz                 |
| **Factor Energía**  | Programa referidos     | €15 por alta      | Perfil con coche eléctrico → tarifa "Supervalle"              |
| **CNMC Comparador** | Sin comisión (oficial) | —                 | CTA neutral obligatorio antes de cualquier enlace de afiliado |

> **Nota CNMC:** Por transparencia y compliance, el primero CTA siempre debe ser al comparador oficial de la CNMC (`comparador.cnmc.gob.es`). Los comparadores de afiliación se muestran como alternativa "más rápida" con el label de afiliado.

### 8.3 Implementación técnica de afiliación

```typescript
// lib/affiliates/tracking.ts
// UTM + click tracking anónimo (no PII)
// Almacenar en affiliate_clicks (tabla sin user_id, solo hash anónimo)
// Conversiones verificadas por postback del partner

// Componente genérico
<AffiliateCard
  partner="degiro"
  title="Invierte con DeGiro"
  description="Sin comisiones de custodia para ETFs"
  ctaText="Abrir cuenta gratis"
  ctaUrl="https://www.degiro.es/?ref=PATRIMIO_XXX"
  disclosure="Enlace de afiliado — Patrimio puede recibir comisión"
  // Solo visible si canUse('investments') o como CTA de upgrade
/>
```

---

## 9. MODELO B2B / WHITE-LABEL

### 9.1 Perfil del cliente B2B

- **Asesorías financieras independientes** (EAFIs) — ~2,000 en España, sin herramienta propia de reporting para clientes
- **Family offices** — ~200 en España, necesitan reporting patrimonial
- **Gestorías con servicio de patrimonio** — extender servicio sin desarrollo propio
- **Asociaciones de ahorro/inversión** (cooperativas de crédito, etc.)

### 9.2 Propuesta de valor B2B

"Ofrece a tus clientes un seguimiento patrimonial integral bajo tu marca, sin desarrollo propio"

**Features adicionales necesarias para B2B:**

- Dashboard de asesor: ver todos sus clientes con alertas prioritarias
- Branded: logo y colores del asesor en la app del cliente
- Multi-tenant: cada cliente con su espacio aislado (RLS por `household_id`)
- Reporting financiero: el asesor exporta informes de todos sus clientes
- API de integración: conectar con herramientas de CRM del asesor

### 9.3 Pricing B2B

| Plan         | Precio      | Incluye                                 |
| ------------ | ----------- | --------------------------------------- |
| Starter EAFI | €199/mes    | Hasta 20 clientes activos + branding    |
| Professional | €499/mes    | Hasta 100 clientes + dashboard asesor   |
| Enterprise   | Negociación | Ilimitado + API + SLA + integración CRM |

**LTV estimado B2B:** €2,400 - €6,000/año por cliente vs €83 - €96/año B2C

---

## 10. ESTIMACIÓN DE INGRESOS

### 10.1 Escenario conservador (año 1 post-lanzamiento)

**Asunciones:**

- Lanzamiento orgánico + Product Hunt + comunidades (r/spain, Forocoches economía)
- Sin paid marketing en año 1
- Conversión free→premium: 5% (referencia sector: 2-8%)

| Mes | Usuarios Free | Usuarios Premium | MRR (€) | Afiliación (€) | Total (€) |
| --- | ------------- | ---------------- | ------- | -------------- | --------- |
| 3   | 200           | 10               | 80      | 50             | 130       |
| 6   | 800           | 40               | 320     | 200            | 520       |
| 9   | 2.000         | 100              | 800     | 600            | 1.400     |
| 12  | 5.000         | 250              | 2.000   | 1.500          | 3.500     |

### 10.2 Escenario optimista (año 1)

| Mes | Usuarios Free | Usuarios Premium | MRR (€) | Afiliación (€) | Total (€) |
| --- | ------------- | ---------------- | ------- | -------------- | --------- |
| 3   | 500           | 35               | 280     | 150            | 430       |
| 6   | 2.500         | 175              | 1.400   | 800            | 2.200     |
| 9   | 8.000         | 560              | 4.480   | 2.500          | 6.980     |
| 12  | 20.000        | 1.400            | 11.200  | 7.000          | 18.200    |

### 10.3 Costes operativos estimados (a 5.000 usuarios)

| Servicio                | Coste/mes                    |
| ----------------------- | ---------------------------- |
| Vercel Pro              | €20                          |
| Supabase Pro            | €25                          |
| Claude API (AI)         | ~€50-150 (según uso premium) |
| GoCardless Open Banking | ~€50-100                     |
| Stripe fees             | 1.4% + €0.25 por transacción |
| Resend (emails)         | €20                          |
| Market data APIs        | €0-30                        |
| **Total**               | **~€200-350/mes**            |

**Break-even:** ~45-50 usuarios premium cubrirían los costes fijos.

---

## 11. ROADMAP COMERCIAL DE FASES

### Fase C0 — Preparación (2 semanas, paralelo a Fase 9/10)

- [ ] Integrar Stripe Billing (billing routes + webhook Edge Function)
- [ ] Migración `subscriptions` table + `profiles.plan` column
- [ ] `canUseFeature()` helper + `useSubscription()` hook
- [ ] `UpgradePrompt` componente reutilizable para paywalls
- [ ] Página `/pricing` pública con tabla de comparación
- [ ] Políticas de privacidad y TOS actualizadas con modelo de afiliación

### Fase C1 — Lanzamiento Cerrado (mes 1)

El lanzamiento es cerrado y controlado — sin marketing masivo. El objetivo es validar la retención con un grupo pequeño de usuarios de confianza antes de escalar.

- [ ] Onboarding guiado (M-NEW-08) live
- [ ] Landing page privada `/beta` con acceso por invitación (token en URL)
- [ ] Invitaciones enviadas manualmente a ~20-50 usuarios conocidos (red personal, profesionales financieros)
- [ ] Feedback loop directo: formulario en-app + canal privado (email/chat) para reportar bugs
- [ ] Primera iteración de afiliación activada en modo silencioso: DeGiro + TaxDown (sin CTAs agresivos)
- [ ] Monitorización activa: Sentry, Vercel Analytics, alertas de errores en tiempo real
- [ ] Criterios de salida del período cerrado: < 5 bugs críticos/semana · NPS interno > 7 · retención día 7 > 50%

### Fase C2 — Open Banking + Retención (mes 2-4)

- [ ] GoCardless integration (M-NEW-01) lanzado como feature premium
- [ ] Objetivo tracking (M-NEW-05)
- [ ] Tracking de inmuebles (M-NEW-06)
- [ ] Financial Coach AI mensual (M-NEW-04) como "newsletter inteligente"
- [ ] **Asistente conversacional AI Chatbot** (M-NEW-10) — botón flotante en dashboard
- [ ] **Optimizador Factura de Luz** (M-NEW-11) — módulo completo + afiliación energía
- [ ] Dashboard de salud financiera con score (M-NEW-07)
- [ ] Email marketing: drip sequence de activación (7 emails en 14 días post-registro)

### Fase C3 — Multi-usuario + B2B (mes 5-8)

- [ ] Multi-usuario / cuentas familiares (M-NEW-02)
- [ ] Primer piloto B2B con 2-3 EAFIs contactadas directamente
- [ ] API pública (read-only) para integraciones — plan developer €19/mes
- [ ] Programa de referidos: usuario premium invita → ambos obtienen 1 mes gratis

### Fase C4 — Escala (mes 9-12)

- [ ] Paid acquisition: Google Ads keywords "app finanzas personales España" (CPC ~€0.80)
- [ ] SEO blog: artículos sobre IBI, IRPF, brókeres, ahorro en España
- [ ] Comparador de brokers integrado en M5 (content + afiliación)
- [ ] Partnerships con medios financieros españoles (Finect, El Inversor)

---

## 12. RIESGOS Y COMPLIANCE REGULATORIO

### 12.1 Riesgos regulatorios

| Riesgo                                    | Severidad | Mitigación                                                                                                       |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| Recomendar inversiones sin licencia CNMV  | 🔴 Alta   | Disclaimer explícito en cada CTA de afiliación: "No es asesoramiento financiero"                                 |
| Open Banking sin autorización como AISP   | 🔴 Alta   | Usar proveedor autorizado (GoCardless tiene licencia PSD2 EU) — Patrimio no procesa datos bancarios directamente |
| RGPD — datos de seguimiento de afiliación | 🟡 Media  | Tracking anónimo (sin PII) + consentimiento en cookie policy                                                     |
| Ingresos de afiliación = "publicidad"     | 🟡 Media  | Declarar en TOS + label "Contenido patrocinado" en UI                                                            |
| IVA en suscripciones digitales España     | 🟡 Media  | Stripe Tax gestiona IVA 21% automáticamente                                                                      |

### 12.2 Disclaimers obligatorios a implementar

**En módulo de inversiones (M5):**

> "Patrimio es una herramienta de seguimiento personal. La información mostrada no constituye asesoramiento financiero ni de inversión. Consulta a un asesor financiero autorizado antes de tomar decisiones de inversión."

**En informe IRPF (M7):**

> "Este informe es orientativo y no sustituye a la declaración oficial de la AEAT. Consulta a un gestor o asesor fiscal para validar tu situación tributaria."

**En módulo de optimizador de luz (M-NEW-11):**

> "El análisis es orientativo y se basa en los datos de perfil que tú introduces y en precios históricos de la API de Red Eléctrica Española. Patrimio no es comparador de energía autorizado. Para un análisis oficial, usa el comparador de la CNMC (comparador.cnmc.gob.es). Los enlaces a comercializadoras pueden ser de afiliación."

**En respuestas del Asistente AI (M-NEW-10):**

> "Las respuestas del asistente se generan con IA y se basan en tus datos personales. No constituyen asesoramiento financiero, fiscal ni legal."

**En CTAs de afiliación:**

> "Enlace de afiliado — si contratas a través de este enlace, Patrimio puede recibir una compensación del partner. Esto no afecta a nuestra valoración objetiva."

### 12.3 Seguridad adicional para billing

- Nunca almacenar datos de tarjeta — Stripe los gestiona (PCI-DSS Level 1)
- Webhooks de Stripe verificados con `stripe.webhooks.constructEvent()` (HMAC)
- El `stripe_customer_id` y `stripe_subscription_id` solo son accesibles server-side
- RLS en `subscriptions`: el usuario solo puede leer su propia suscripción, nunca escribir

---

## RESUMEN EJECUTIVO

Patrimio tiene base técnica para monetizar **inmediatamente** al completar las Fases 9 y 10. El lanzamiento será **cerrado y controlado** — primero validar retención con usuarios de confianza, luego escalar.

**Modelo recomendado:**

1. **Freemium SaaS a €7.99/mes** como pilar de ingresos recurrentes
2. **Afiliación en inversiones + seguros + energía + IRPF** como segundo pilar escalable
3. **B2B white-label para EAFIs** como expansión natural en fase 3 (12+ meses)

**Mejoras técnicas prioritarias, en orden:**

| #   | Mejora                     | Esfuerzo  | Impacto                                  |
| --- | -------------------------- | --------- | ---------------------------------------- |
| 1   | Sistema de billing Stripe  | 1 semana  | Crítico — habilita todo                  |
| 2   | AI Chatbot conversacional  | 2 semanas | Diferenciador · driver de upgrade        |
| 3   | Onboarding guiado 5 pasos  | 4 días    | Reduce churn día 1                       |
| 4   | Optimizador Factura de Luz | 3 semanas | Exclusivo en España · afiliación energía |
| 5   | Financial Coach AI mensual | 2 semanas | Mayor driver de retención a 30 días      |
| 6   | Tracking de inmuebles      | 1 semana  | Completa el concepto de "patrimonio"     |
| 7   | Open Banking (GoCardless)  | 3 semanas | Elimina fricción de entrada              |

**Break-even:** ~45-50 usuarios premium cubren los costes fijos de infraestructura (~€300/mes). El optimizador de luz + afiliación energía puede generar ingresos desde el primer cambio de comercializadora que facilite la app (~€15-25 por conversión).

**Diferenciadores únicos vs competidores españoles:**

- Inversiones + gastos + compromisos + alertas fiscales integrados (nadie en España)
- Optimizador de factura de luz con IA (nadie en ningún mercado)
- Asistente conversacional con contexto patrimonial completo (solo Copilot Money en US, sin datos españoles)
- Timeline de compromisos futuros 24 meses + proyección cash flow

---

_Documento de producto interno — Confidencial. No distribuir._
