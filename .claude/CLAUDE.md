# 🏛️ Patrimonio - Configuración Claude Code

## 📋 Visión General

Sistema enterprise de gestión financiera personal con React 18, TypeScript 5.5+, Supabase, Vercel y Sentry.

## 🎯 Stack Tecnológico

### Frontend

- **React 18.3+** - UI framework
- **TypeScript 5.5+** - Type safety (strict mode)
- **Next.js 15+** - App router, RSC, Server Actions
- **Tailwind CSS 4+** - Styling system
- **Radix UI 2+** - Componentes accesibles
- **React Query 5+** - State management + caching
- **Recharts 2.12+** - Visualizaciones financieras
- **Zod 3.23+** - Runtime validation

### Backend & Database

- **Supabase** - PostgreSQL 16+ + Auth + Storage + Realtime
- **Edge Functions** - Deno runtime para APIs
- **PostgreSQL** - RLS + Triggers + Índices optimizados

### DevOps & Monitoring

- **Vercel** - Hosting + Edge Network
- **Sentry 8+** - Error tracking + Performance + Session Replay
- **Vitest 2+** - Unit + Integration tests
- **Playwright 1.40+** - E2E tests
- **ESLint 9+** - Linting
- **Prettier 3+** - Code formatting

## 🤖 Sistema de Agentes

### Agente Maestro

**Archivo:** `.claude/agents/patrimonio-orchestrator.md`

Coordina todos los sub-agentes y skills para:

- Analizar requerimientos
- Seleccionar skills apropiados
- Generar planes de implementación
- Optimizar uso de tokens
- Mantener estado de sesión

### Cómo Usar

```
@patrimonio-orchestrator

Necesito: [descripción del requerimiento]
Contexto: [información adicional si aplica]
```

## ⚡ Protocolo de Eficiencia de Tokens

### Obligatorio para Todos los Agentes

| ❌ NUNCA                                        | ✅ SIEMPRE                      |
| ----------------------------------------------- | ------------------------------- |
| Saludos, "perfecto!", alabanzas                 | Responder directo al grano      |
| Repetir/parafrasear pregunta usuario            | Proceder con la solución        |
| "Voy a hacer...", anunciar actions              | Ejecutar directamente           |
| Reescribir archivo entero por cambio <20 líneas | Edit quirúrgico con ±5 contexto |
| Re-analizar código leído en sesión              | Usar session-context.md         |
| Afirmar sin verificar estado actual             | Read → luego Edit               |
| Ofrecer opciones cuando hay respuesta correcta  | Implementar la correcta         |
| Resúmenes/recaps extensos                       | Tabla resultados ≤5 filas       |
| "¿Necesitas algo más?" al final                 | Omitir cierre                   |
| Explicar qué tool invocarás                     | Invocarlo sin anunciar          |

### Reglas de Edición

```
Cambios <20 líneas  → replace_string_in_file
Múltiples bloques   → multi_replace_string_in_file (1 llamada)
Archivo nuevo       → create_file
Leer estado         → read_file ANTES de editar
```

### Formato de Respuesta

```markdown
## [Icono] Título Conciso

[Código o cambios directamente]

| Item   | Status |
| ------ | ------ |
| Cosa 1 | ✅     |
| Cosa 2 | ✅     |
```

## 📚 Skills Especializados

### Patrimonio Skills (`.claude/skills/patrimonio/`)

| Skill                     | Responsabilidad                       | Cuándo Usar            |
| ------------------------- | ------------------------------------- | ---------------------- |
| **component-builder**     | Componentes React accesibles WCAG AAA | Crear UI components    |
| **database-master**       | Schemas SQL + RLS + Migrations        | Diseñar/modificar DB   |
| **api-service-gen**       | Servicios Supabase + React Query      | Crear APIs/servicios   |
| **test-generator**        | Tests unit/integration/E2E >80%       | Generar test suites    |
| **stock-data-integrator** | APIs bolsa + Edge Functions           | Integrar market data   |
| **sentry-monitor**        | Error tracking + Performance          | Implementar monitoring |

### Shared Skills (`.claude/skills/shared/`)

| Skill             | Responsabilidad                 | Cuándo Usar            |
| ----------------- | ------------------------------- | ---------------------- |
| **code-reviewer** | Code review + best practices    | Revisar código         |
| **researcher**    | Web research + síntesis         | Investigar tecnologías |
| **log-analyzer**  | Análisis de errores + debugging | Diagnosticar problemas |

## 📋 Comandos Disponibles

### `/ship [environment]`

Pipeline completo: type-check → lint → test → build → deploy

**Argumentos:** `development | staging | production`

### `/setup`

Setup inicial del proyecto (FASE 1):

- Instalar dependencias
- Crear estructura de carpetas
- Configurar Supabase local
- Configurar Sentry
- Primera ejecución exitosa

### `/deploy [environment]`

Deploy a Vercel con Sentry release tracking:

1. Genera Sentry release
2. Upload sourcemaps
3. Deploy a Vercel
4. Smoke tests
5. Notificación

## ✅ Estándares del Proyecto

### TypeScript

```typescript
// tsconfig.json - Strict mode obligatorio
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Validación Runtime

```typescript
// Zod para todas las validaciones
import { z } from "zod";

export const TransactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.date(),
});
```

### Base de Datos

- ✅ UUID como PK (`uuid_generate_v4()`)
- ✅ Timestamps timezone-aware (`created_at`, `updated_at`)
- ✅ Soft deletes (`deleted_at IS NULL`)
- ✅ RLS en todas las tablas user-scoped
- ✅ Índices en columnas de búsqueda frecuente
- ✅ Triggers para `updated_at` automático

### Testing

- ✅ Cobertura >80% en funcionalidad crítica
- ✅ Unit tests con Vitest 2+
- ✅ Integration tests con @testing-library
- ✅ E2E tests con Playwright 1.40+
- ✅ Mocks de Supabase client

### Accesibilidad

- ✅ WCAG AAA (contraste 7:1)
- ✅ ARIA labels en elementos interactivos
- ✅ Navegación completa por teclado
- ✅ Touch targets mínimo 44x44px
- ✅ Screen reader friendly

### Performance

- ✅ Bundle size <500KB gzipped
- ✅ Lighthouse score >90 en producción
- ✅ LCP <2.5s
- ✅ CLS <0.1
- ✅ FID <100ms
- ✅ Code splitting por rutas

### Error Handling

```typescript
// Sentry en todos los componentes críticos
import * as Sentry from "@sentry/nextjs";

try {
  await criticalOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "transactions" },
    context: { user, timestamp },
  });
  throw error;
}
```

## 🗂️ Estructura de Archivos

```
proyecto-patrimonio/
├── .claude/
│   ├── CLAUDE.md                        # Este archivo
│   ├── agents/
│   │   └── patrimonio-orchestrator.md   # Agente maestro
│   ├── commands/
│   │   ├── ship.md                      # Pipeline completo
│   │   ├── setup.md                     # Setup inicial
│   │   └── deploy.md                    # Deploy automatizado
│   ├── skills/
│   │   ├── patrimonio/                  # Skills especializados
│   │   │   ├── component-builder.md
│   │   │   ├── database-master.md
│   │   │   ├── api-service-gen.md
│   │   │   ├── test-generator.md
│   │   │   ├── stock-data-integrator.md
│   │   │   └── sentry-monitor.md
│   │   └── shared/                      # Skills auxiliares
│   │       ├── code-reviewer.md
│   │       ├── researcher.md
│   │       └── log-analyzer.md
│   ├── hooks/
│   │   ├── SessionStart.sh              # Setup al iniciar sesión
│   │   ├── PostToolUse.sh               # Validación post-tool
│   │   └── PreCompact.sh                # Optimización pre-compresión
│   ├── output-styles/
│   │   └── terse.md                     # Estilo de output conciso
│   ├── plugins/
│   │   └── vercel/
│   │       └── integration.md           # Integración Vercel
│   ├── rules/
│   │   ├── patrimonio-rules.md          # Reglas del proyecto
│   │   └── typescript-rules.md          # Estándares TypeScript
│   ├── settings.json                    # Configuración Claude
│   ├── settings.local.json              # Config local (gitignored)
│   └── statusline                       # Estado de la sesión
├── src/
│   ├── app/                             # Next.js app router
│   ├── features/                        # Features modulares
│   │   ├── auth/
│   │   ├── transactions/
│   │   ├── portfolio/
│   │   └── dashboard/
│   ├── shared/                          # Código compartido
│   │   ├── components/                  # UI components
│   │   ├── hooks/                       # React hooks
│   │   ├── utils/                       # Utilidades
│   │   └── types/                       # TypeScript types
│   └── tests/                           # Test suites
├── supabase/
│   ├── migrations/                      # SQL migrations
│   └── functions/                       # Edge Functions
└── CLAUDE.md                            # Enlace a .claude/CLAUDE.md
```

## 🚀 Flujo de Trabajo

### 1. Primera Sesión

```
@patrimonio-orchestrator

Necesito: Setup inicial del proyecto
```

### 2. Nueva Feature

```
@patrimonio-orchestrator

Necesito: CRUD completo de transacciones
- Tabla en Supabase con RLS
- Validación con Zod
- Componentes React accesibles
- Tests >80%
- Integración Sentry
```

### 3. Bug Fix

```
@patrimonio-orchestrator

Necesito: Fix error en formulario
Error: "Cannot read property 'map' of undefined"
Sentry event: events/abc123
```

### 4. Code Review

```
@patrimonio-orchestrator

Necesito: Revisar código de portfolio feature
- Verificar TypeScript strict
- Verificar accesibilidad
- Verificar performance
```

## 📖 Referencias Técnicas

### Documentación Oficial

- [React 18](https://react.dev)
- [TypeScript 5.5](https://www.typescriptlang.org)
- [Next.js 15](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [React Query 5](https://tanstack.com/query)
- [Sentry](https://docs.sentry.io)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)

### Guías de Estilo

- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [WCAG AAA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🔐 Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-dsn
SENTRY_AUTH_TOKEN=your-auth-token

# APIs Externas
FINNHUB_API_KEY=your-api-key
ALPHA_VANTAGE_API_KEY=your-api-key

# Vercel (auto-inyectadas)
VERCEL_URL=auto
VERCEL_ENV=auto
```

## 📝 Notas de Sesión

El estado de la sesión se mantiene en `.claude/CLAUDE.local.md` (gitignored) con formato JSON:

```json
{
  "session": {
    "started": "2026-05-02T10:00:00Z",
    "week": 1,
    "status": "active"
  },
  "completed": ["✅ Item completado"],
  "in_progress": ["⏳ Item en progreso"],
  "next": ["→ Próximo paso"],
  "decisions": {
    "stock_api": "Finnhub",
    "cache_strategy": "5min precios, 1day histórico"
  },
  "blockers": []
}
```

---

**Versión:** 2.0 Enterprise Setup  
**Actualizado:** 2026-05-02  
**Status:** ✅ Activo  
**Mantenedor:** @patrimonio-orchestrator
