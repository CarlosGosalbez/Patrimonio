# Output Styles - Formato de Respuestas

## Estilos Disponibles

### 1. Professional (Default)

Respuestas estructuradas, técnicas y concisas.

**Uso:**

```
@patrimonio-orchestrator --style=professional
```

**Formato:**

- Headers claros con emojis técnicos (⚙️ 🔧 ✅)
- Código con syntax highlighting
- Listas numeradas para pasos
- Sección de "Next Steps" al final
- Referencias a archivos con links

**Ejemplo:**

```markdown
## ⚙️ Implementación Completada

He creado el componente `TransactionForm` con las siguientes características:

1. ✅ Validación con Zod schema
2. ✅ React Hook Form integration
3. ✅ Accessible ARIA labels
4. ✅ Error handling con Sentry

**Archivos creados:**

- `src/features/transactions/components/TransactionForm.tsx`
- `src/features/transactions/schemas/transaction.schema.ts`

**Next Steps:**

1. Agregar tests unitarios
2. Implementar E2E test para flujo completo
```

---

### 2. Detailed

Respuestas exhaustivas con explicaciones profundas.

**Uso:**

```
@patrimonio-orchestrator --style=detailed
```

**Formato:**

- Explicaciones paso a paso
- Múltiples ejemplos de código
- Pros/Cons de decisiones
- Contexto técnico detallado
- Best practices inline

---

### 3. Quick

Respuestas concisas, solo lo esencial.

**Uso:**

```
@patrimonio-orchestrator --style=quick
```

**Formato:**

- Sin explicaciones extensas
- Solo código/comandos
- Máximo 10 líneas de texto
- Ideal para cambios simples

**Ejemplo:**

```markdown
✅ Creado `UserCard.tsx`

**Cambios:**

- Component con TypeScript strict
- Props tipadas con interface
- Accessible con ARIA

**Listo para usar.**
```

---

### 3.5. Efficient (Máxima Optimización)

Respuestas optimizadas para tokens.

**Uso:**

```
@patrimonio-orchestrator --style=efficient
```

**Formato:**

- Sin saludos/despedidas
- Sin anuncios de acciones
- Código directo
- Tabla resultado (≤5 filas)
- Sin "¿algo más?"

**Protocolo:**

| ❌ No                   | ✅ Sí                |
| ----------------------- | -------------------- |
| "Perfecto!", "Voy a..." | Actuar directo       |
| Repetir pregunta        | Solución             |
| Reescribir archivo      | Edit ±5 líneas       |
| Re-analizar código      | Usar memoria         |
| Ofrecer opciones        | Implementar correcta |

**Ejemplo:**

```markdown
## ✅ UserCard

[código]

| File         | Status |
| ------------ | ------ |
| UserCard.tsx | ✅     |
| types.ts     | ✅     |
```

---

### 4. Tutorial

Respuestas educativas con explicaciones pedagógicas.

**Uso:**

```
@patrimonio-orchestrator --style=tutorial
```

**Formato:**

- Introducción al concepto
- Código comentado línea por línea
- Diagramas ASCII cuando aplica
- "¿Por qué?" para cada decisión
- Referencias a docs oficiales
- Ejercicios/sugerencias

---

### 5. Audit

Formato de reporte de auditoría.

**Uso:**

```
@patrimonio-orchestrator --style=audit
```

**Formato:**

- Executive summary
- Findings categorizados (Critical, High, Medium, Low)
- Evidencia con snippets
- Recomendaciones priorizadas
- Action items

**Ejemplo:**

```markdown
# 🔍 Security Audit Report

## Executive Summary

Revisión de seguridad en módulo de autenticación. Encontrados 2 issues críticos.

## Critical Findings

### 1. Hardcoded API Key

**Location:** `src/lib/api.ts:15`
**Risk:** Secret exposure
**Recommendation:** Mover a environment variable

### 2. Missing RLS Policy

**Location:** `supabase/migrations/001_transactions.sql`
**Risk:** Unauthorized data access
**Recommendation:** Implementar policy user-scoped

## Action Items

1. [ ] Fix critical issues (Priority 1)
2. [ ] Review all API keys
3. [ ] Audit RLS policies
```

---

## Configuración

### En settings.json

```json
{
  "ai": {
    "outputStyle": "professional"
  }
}
```

### Per-Command Override

```bash
@patrimonio-orchestrator create component Button --style=detailed
```

---

**Default:** Professional  
**Recomendado:** Professional para producción, Tutorial para learning
