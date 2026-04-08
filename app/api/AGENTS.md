# app/api/ — Reglas de API Routes

> Estas reglas amplían el root AGENTS.md para trabajo en endpoints Next.js.

## Antes de crear una API route

1. Verificar que no existe ya un endpoint para la misma operación
2. Determinar si es mejor una **Server Action** (mutación simple) o **API route** (streaming, webhooks, cron)
3. Toda route nueva → invocar `@security-reviewer` al terminar

## Estructura obligatoria de toda route

```typescript
// PASO 1: Auth del JWT — SIEMPRE PRIMERO, antes de cualquier lógica
const supabase = createServerClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) return new Response("Unauthorized", { status: 401 });

// PASO 2: Validar input con Zod .strict()
const parsed = InputSchema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

// PASO 3: DB queries con user.id del JWT — nunca del body
const { data } = await supabase.from("X").select().eq("user_id", user.id);
```

## Rate limiting (rutas IA)

Todas las rutas en `app/api/ai/` DEBEN tener rate limiting:

```typescript
// Configurar en middleware.ts con @upstash/ratelimit
// 10 requests/minuto por usuario para endpoints de IA
```

## Manejo de errores

```typescript
// No filtrar detalles de BD al cliente
if (dbError) {
  console.error("DB error:", dbError); // Log interno
  return NextResponse.json({ error: "Internal server error" }, { status: 500 }); // Cliente ve solo status
}

// Excepciones de Zod — siempre devolver 400 con los issues
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
}
```

## CORS

- Nunca `Access-Control-Allow-Origin: *` en producción
- Next.js API routes son same-origin por defecto — no tocar salvo necesidad explícita

## Convención de archivos

```
app/api/
├── transactions/route.ts         # GET (list), POST (create)
├── transactions/[id]/route.ts    # GET, PATCH, DELETE (soft)
├── ai/
│   ├── insights/route.ts         # Streaming — Financial Insights agent
│   ├── categorize/route.ts       # Streaming — Auto Categorizer agent
│   ├── import-assist/route.ts    # Streaming — Import Assistant agent
│   ├── investment-research/route.ts
│   └── budget-optimizer/route.ts
```
