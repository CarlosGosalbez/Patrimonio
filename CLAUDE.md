# 🏛️ Patrimonio - Sistema de Configuración Claude Code

## 📋 Información del Proyecto

**Nombre:** Patrimonio  
**Descripción:** Gestión profesional de patrimonio financiero  
**Stack:** React 18 + TypeScript 5.5+ + Supabase + Vercel + Sentry  
**Versión Mínima Node:** 20.0.0  
**Estado:** Setup inicial - Fase 0

## 🎯 Objetivo

Sistema profesional, enterprise-ready para gestión de:

- Gastos e ingresos (multi-cuenta)
- Cartera de bolsa (análisis avanzado)
- Patrimonio neto en tiempo real
- Monitoreo con Sentry

## 🤖 Agente Maestro

**Ubicación:** `.claude/agents/patrimonio-orchestrator.md`

Orquesta automáticamente:

- Análisis inteligente de requerimientos
- Selección dinámica de skills
- Generación de planes profesionales
- Coordinación de sub-agentes
- Optimización de tokens
- Mantenimiento de estado

## 📂 Estructura del Proyecto

```
src/
├── app/          # Next.js app router v15+
├── features/     # Feature-scoped (auth, transactions, portfolio)
├── shared/       # Componentes, hooks, utils globales
└── tests/        # Unit, integration, E2E tests
```

## 🎓 Skills Disponibles

### Patrimonio Skills

- **component-builder** → Componentes React accesibles
- **database-master** → Schema SQL profesional + RLS
- **api-service-gen** → Servicios + React Query v5+
- **test-generator** → Tests unit/integration/E2E
- **stock-data-integrator** → APIs bolsa + Edge Functions
- **sentry-monitor** → Error tracking profesional

### Shared Skills

- **code-reviewer** → Reviews de código
- **researcher** → Web research + synthesis
- **log-analyzer** → Análisis de errores

## 📋 Commands

### `/ship` - Build + Lint + Test + Deploy

Ejecuta todo el pipeline en uno

### `/setup` - Setup inicial del proyecto

Crea estructura y dependencias base

### `/deploy` - Deploy a Vercel

Automático con Sentry release tracking

## ✅ Normas del Proyecto

**Obligatorias:**

- ✅ TypeScript strict mode (tsconfig.strictNullChecks: true)
- ✅ ESLint + Prettier (auto-format)
- ✅ Zod para validación runtime
- ✅ RLS en todas las tablas sensibles
- ✅ Sentry en cada error
- ✅ WCAG AAA accesibilidad
- ✅ >80% test coverage
- ✅ No hardcoding (env + config)
- ✅ Path aliases (@/)
- ✅ Error boundaries

## ⚡ Protocolo de Eficiencia (OBLIGATORIO)

| ❌ PROHIBIDO                                | ✅ HACER                             |
| ------------------------------------------- | ------------------------------------ |
| Saludos, alabanzas, "perfecto!"             | Responder directo                    |
| Repetir la pregunta                         | Ir al grano                          |
| "Voy a...", "Primero haré..."               | Actuar, no anunciar                  |
| Reescribir archivos enteros por 3-5 líneas  | Edit quirúrgico (±5 líneas contexto) |
| Re-analizar código ya leído en sesión       | Referenciar análisis previo          |
| Afirmar sin verificar                       | Read primero                         |
| Ofrecer alternativas cuando hay 1 respuesta | La respuesta correcta                |
| Resúmenes/recaps al final                   | Tabla ≤5 filas                       |
| "Necesitas algo más?"                       | Omitir                               |
| Explicar qué tool usarás                    | Usarlo directamente                  |

**Edición de archivos:**

- Cambios <20 líneas → Edit (nunca Write completo)
- Múltiples bloques → MultiEdit (batch en 1 llamada)
- SIEMPRE Read antes de Edit — nunca asumir contenido

## 🚀 Cómo Empezar

1. Lee este fichero completamente
2. Lee `.claude/agents/patrimonio-orchestrator.md`
3. Pide tu primer feature al agente maestro

## 📞 Contactar Agente Maestro

```
@patrimonio-orchestrator

Necesito: [descripción clara]
Contexto: [si es necesario]
```

---

Actualizado: 2026-05-02  
Versión: 2.0 Enterprise Setup  
Status: ✅ Listo
