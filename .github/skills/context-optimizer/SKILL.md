---
name: context-optimizer
description: "Estrategias para mantener las sesiones de GitHub Copilot eficientes en Patrimio: routing de agentes, preload de skills, patrones de contexto óptimo para tareas de desarrollo financiero."
user-invocable: true
---

# Context Optimizer — Patrimio

Guía de uso eficiente del contexto para sesiones de desarrollo de Patrimio.

## Reglas anti-desperdicio (resumen ejecutivo)

| Acción                             | Regla                                    |
| ---------------------------------- | ---------------------------------------- |
| Saludos / adulación                | NUNCA                                    |
| Narrar intención                   | NUNCA — hacer directamente               |
| Reescribir archivos enteros        | NUNCA si el cambio es < 20 líneas        |
| Re-analizar lo ya analizado        | NUNCA — referenciar análisis previo      |
| Afirmar hechos sin verificar       | NUNCA — buscar o indicar "no verificado" |
| Alternativas cuando hay 1 correcta | NUNCA — dar la respuesta directa         |
| "¿Necesitas algo más?"             | NUNCA                                    |

## Routing de agentes

Usa siempre `@project-orchestrator` como punto de entrada para tareas multi-capa.

| Síntoma                          | Agente directo          |
| -------------------------------- | ----------------------- |
| "Categoriza estas transacciones" | `@auto-categorizer`     |
| "¿Cuánto gasté en X?"            | `@financial-insights`   |
| "Importa este CSV de Santander"  | `@import-assistant`     |
| "¿Conviene comprar $TICKER?"     | `@investment-research`  |
| "Optimiza mi presupuesto"        | `@budget-optimizer`     |
| Cualquier otra cosa              | `@project-orchestrator` |

## Preload de skills por tipo de tarea

| Tarea                    | Skills a cargar                                 |
| ------------------------ | ----------------------------------------------- |
| Nueva feature con DB     | `supabase-migration` + `transaction-formatter`  |
| Categorización import    | `spanish-finance-categorizer`                   |
| Análisis de portfolio    | `market-data-fetcher` + `transaction-formatter` |
| Generación de informes   | `report-generator` + `transaction-formatter`    |
| Sistema de alertas       | `anomaly-detector`                              |
| Lectura de datos para IA | `financial-data-reader`                         |

## Patrones de contexto óptimo

### Para features nuevas

1. Primero leer la spec en `docs/patrimio-technical-spec.md` sección relevante
2. Verificar tabla existente en `types/database.ts` antes de proponer schema
3. Comprobar `hooks/` antes de crear hooks nuevos — puede ya existir

### Para bugs

1. Leer el archivo con el bug completo antes de editar
2. Verificar que el tipo de error no es de tipos Supabase (ejecutar `npx supabase gen types`)
3. Comprobar si el bug es en RLS antes de buscar en código Next.js

### Para revisiones de seguridad

Siempre invocar `@security-reviewer` después de:

- Cualquier nuevo API route
- Cualquier nueva migración con tabla que recibe input del usuario
- Cualquier cambio en auth flow

## Señales de contexto degradado

Si el agente empieza a:

- Proponer soluciones que ya se descartaron en la sesión
- Usar patrones de código que contradicen las convenciones del proyecto
- Perder track de archivos ya modificados

→ Refrescar contexto con: "Resume el estado actual de [feature] incluyendo qué archivos se han modificado."
