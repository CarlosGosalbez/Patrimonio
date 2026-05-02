# ⚡ Protocolo de Eficiencia de Tokens

## 🎯 Objetivo

Maximizar eficiencia de tokens manteniendo calidad del código. Este protocolo es **OBLIGATORIO** para todos los agentes.

## 📋 Reglas Absolutas

| ❌ NUNCA                                          | ✅ SIEMPRE                                   |
| ------------------------------------------------- | -------------------------------------------- |
| Saludos ("Hola", "¡Perfecto!", "Genial")          | Ir directo al grano                          |
| Repetir/parafrasear la pregunta del usuario       | Proceder con la solución inmediata           |
| Anunciar acciones ("Voy a...", "Primero haré...") | Ejecutar directamente                        |
| Reescribir archivo entero por <20 líneas          | Edit quirúrgico con ±5 líneas contexto       |
| Re-analizar código ya leído en sesión             | Referenciar análisis previo (session memory) |
| Afirmar sin verificar estado actual               | Read → luego Edit                            |
| Ofrecer opciones cuando hay 1 respuesta correcta  | Implementar la respuesta correcta            |
| Resúmenes/recaps extensos al final                | Tabla de resultados ≤5 filas                 |
| Preguntas de cierre ("¿Necesitas algo más?")      | Omitir completamente                         |
| Explicar qué tool invocarás                       | Invocarlo sin anunciar                       |

## 🔧 Estrategia de Edición

### Regla de Oro: **Read First, Edit Precise**

```
┌─────────────────────────────────────────────────┐
│ SIEMPRE leer el archivo ANTES de editarlo      │
│ NUNCA asumir contenido o estructura            │
└─────────────────────────────────────────────────┘
```

### Matriz de Decisión

| Situación                      | Tool                                   | Contexto                 |
| ------------------------------ | -------------------------------------- | ------------------------ |
| Cambio <20 líneas en 1 archivo | `replace_string_in_file`               | ±5 líneas antes/después  |
| Cambios en múltiples archivos  | `multi_replace_string_in_file`         | Batch en 1 llamada       |
| Archivo nuevo                  | `create_file`                          | Contenido completo       |
| Archivo existente desconocido  | `read_file` → `replace_string_in_file` | Verificar primero        |
| ¿Reescribir archivo completo?  | **NUNCA**                              | Siempre edit incremental |

### Ejemplo Correcto

```typescript
// ❌ MAL - Reescribir archivo de 200 líneas por cambiar 3
create_file("component.tsx", [todo el contenido con cambio mínimo])

// ✅ BIEN - Edit quirúrgico
replace_string_in_file(
  filePath: "component.tsx",
  oldString: `
    const [state, setState] = useState();

    useEffect(() => {
      fetchData();
    }, []);
  `,
  newString: `
    const [state, setState] = useState<Data[]>([]);

    useEffect(() => {
      fetchData();
    }, [state]);
  `
)
```

## 📝 Formato de Respuesta Eficiente

### Estructura Óptima

```markdown
## [Emoji] Título de Acción

[Código o cambios directamente - SIN explicación previa]

| Archivo/Item | Status |
| ------------ | ------ |
| file1.tsx    | ✅     |
| file2.ts     | ✅     |
```

### ❌ Respuesta Ineficiente (NO HACER)

```markdown
¡Hola! Perfecto, voy a ayudarte con esto.

Primero, necesito analizar tu código. Voy a leer el archivo
component.tsx y luego haré los cambios que necesitas.

Después de analizar, veo que necesitas:

1. Agregar TypeScript types
2. Mejorar el useEffect
3. Agregar error handling

Voy a implementar estos cambios ahora...

[código]

¿Hay algo más en lo que pueda ayudarte?
```

**Tokens desperdiciados:** ~150

### ✅ Respuesta Eficiente (HACER)

```markdown
## ⚡ TypeScript types + useEffect fix

[código]

| File          | Status |
| ------------- | ------ |
| component.tsx | ✅     |
```

**Tokens usados:** ~30

**Ahorro:** 80%

## 🧠 Gestión de Memoria de Sesión

### Estrategia de Context Compression

```
Primera mención:
├─ Analizar completamente
├─ Documentar en session memory
└─ Usar para siguientes referencias

Referencias posteriores:
├─ NO re-analizar
├─ Referenciar session memory
└─ Actualizar solo si cambió
```

### Ejemplo

```markdown
// ❌ MAL - Re-analizar en cada pregunta
User: "Mejora el UserCard"
AI: "Analizando UserCard.tsx... [200 líneas de análisis]"

User: "Ahora agrega tests"
AI: "Analizando UserCard.tsx de nuevo... [200 líneas repetidas]"

// ✅ BIEN - Usar memoria de sesión
User: "Mejora el UserCard"
AI: [Analiza, documenta en memory]

User: "Ahora agrega tests"
AI: "Basado en UserCard.tsx (ya analizado):" [genera tests directo]
```

## 🎯 Casos de Uso Comunes

### 1. Crear Componente

**Ineficiente (500 tokens):**

> "¡Perfecto! Voy a crear un componente React para ti. Primero, voy a analizar qué necesitas..."

**Eficiente (50 tokens):**

```markdown
## ⚡ UserCard component

[código]

| File         | Status |
| ------------ | ------ |
| UserCard.tsx | ✅     |
| types.ts     | ✅     |
```

### 2. Fix de Bug

**Ineficiente (400 tokens):**

> "Hola, entiendo tu problema. Voy a analizar el error... El problema está en..."

**Eficiente (100 tokens):**

```markdown
## 🐛 Fix useEffect dependency

[código corregido]

| Issue              | Fixed |
| ------------------ | ----- |
| Missing dependency | ✅    |
```

### 3. Refactor

**Ineficiente (600 tokens):**

> "Claro, te ayudo con el refactor. Primero voy a revisar... luego voy a..."

**Eficiente (150 tokens):**

```markdown
## ♻️ Extract custom hook

[código]

| Change         | Done |
| -------------- | ---- |
| useUserData.ts | ✅   |
| UserCard.tsx   | ✅   |
```

## 📊 Métricas de Éxito

### Objetivos

- **Reducción de tokens:** >60% vs baseline
- **Tiempo de respuesta:** <50% del tiempo
- **Precisión mantenida:** 100%
- **Satisfacción usuario:** ≥95%

### Indicadores

```
✅ Buena eficiencia:  <200 tokens por respuesta simple
⚠️  Media eficiencia:  200-400 tokens
❌ Baja eficiencia:   >400 tokens (revisar protocolo)
```

## 🚫 Patrones Anti-Eficiencia

### 1. El Charlatán

```markdown
❌ "¡Hola! ¡Excelente pregunta! Voy a ayudarte..."
```

**Ahorro potencial:** 20-50 tokens

### 2. El Repetidor

```markdown
❌ "Entiendo que necesitas crear un componente de usuario..."
```

**Ahorro potencial:** 30-80 tokens

### 3. El Explicador

```markdown
❌ "Primero voy a leer el archivo, luego voy a hacer los cambios..."
```

**Ahorro potencial:** 40-100 tokens

### 4. El Reescritor

```markdown
❌ [Reescribe 300 líneas para cambiar 5]
```

**Ahorro potencial:** 200-500 tokens

### 5. El Cerrador Social

```markdown
❌ "¿Hay algo más en lo que pueda ayudarte hoy?"
```

**Ahorro potencial:** 10-30 tokens

## 🎓 Checklist de Auto-Evaluación

Antes de enviar cada respuesta, verificar:

- [ ] ¿Omití saludos/despedidas?
- [ ] ¿Actué sin anunciar acciones?
- [ ] ¿Usé edit quirúrgico en lugar de reescribir?
- [ ] ¿Referencié análisis previo en lugar de re-analizar?
- [ ] ¿Leí archivo antes de editar?
- [ ] ¿Implementé la respuesta correcta sin ofrecer opciones?
- [ ] ¿Resumen es tabla ≤5 filas?
- [ ] ¿Omití pregunta de cierre?
- [ ] ¿Invoqué tools sin explicar?
- [ ] ¿Respuesta directa al grano?

**10/10 = Excelente eficiencia** ✅  
**7-9/10 = Buena, mejorar** ⚠️  
**<7/10 = Revisar protocolo** ❌

---

**Actualizado:** 2026-05-02  
**Cumplimiento:** OBLIGATORIO  
**Enforcement:** Automático vía settings.json
