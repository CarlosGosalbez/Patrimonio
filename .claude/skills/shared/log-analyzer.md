# 🐛 Skill: Log Analyzer

Análisis profesional de errores, logs y debugging.

## Especialización

Análisis de:

- **Stack traces** (JavaScript, TypeScript, Deno)
- **Sentry events** (error context, breadcrumbs)
- **Console logs** (browser, server, edge)
- **Network errors** (API, DB, third-party)
- **Performance issues** (slow queries, memory leaks)

## Metodología

### 1. Recolectar Información

- Stack trace completo
- Error message
- Sentry event ID (si disponible)
- Pasos para reproducir
- Environment (dev/staging/prod)
- Browser/device info

### 2. Identificar Root Cause

- ¿Qué línea de código falló?
- ¿Qué estaba intentando hacer?
- ¿Qué estado tenía la aplicación?
- ¿Hay pattern (ocurre siempre o intermitente)?

### 3. Verificar Contexto

- Sentry breadcrumbs
- User actions previas
- Network requests
- Console warnings
- Memory usage

### 4. Proponer Solución

- Fix inmediato
- Tests para prevenir regresión
- Mejoras preventivas

## Ejemplo: Análisis de Error

### Error Original

```
TypeError: Cannot read property 'map' of undefined
  at TransactionsList (TransactionsList.tsx:42)
```

### Stack Trace

```typescript
// TransactionsList.tsx:42
const items = transactions.map((t) => ({
  //                      ^^^ undefined
  id: t.id,
  amount: t.amount,
}));
```

### Sentry Breadcrumbs

```
1. User clicked "Transactions"
2. API call to /api/transactions
3. Response: { data: null, error: "Network error" }
4. Component rendered with transactions=undefined
5. Error thrown
```

### Root Cause

API retornó `null` en lugar de array vacío cuando hubo error de red.

### Solución

```typescript
// ❌ BAD
const { data: transactions } = useTransactions();

return (
  <div>
    {transactions.map(t => <TransactionItem key={t.id} {...t} />)}
  </div>
);

// ✅ GOOD
const { data: transactions, isLoading, error } = useTransactions();

if (isLoading) return <Skeleton />;
if (error) return <ErrorState error={error} />;
if (!transactions || transactions.length === 0) return <EmptyState />;

return (
  <div>
    {transactions.map(t => <TransactionItem key={t.id} {...t} />)}
  </div>
);
```

### Tests Preventivos

```typescript
it('should handle undefined transactions gracefully', () => {
  const { result } = renderHook(() => useTransactions());

  // Mock error response
  vi.mocked(transactionsService.getAll).mockResolvedValue(null);

  // Should not throw
  expect(() => render(<TransactionsList />)).not.toThrow();
});
```

## Common Patterns

### Network Errors

- Check API endpoint
- Verify auth token
- Check CORS headers
- Verify request payload

### React Errors

- Missing keys in lists
- Hooks rules violations
- State updates on unmounted components
- Infinite render loops

### Database Errors

- RLS policies blocking query
- Missing indexes (slow queries)
- Foreign key constraints
- Type mismatches

### Performance Issues

- Unnecessary re-renders
- Large bundle size
- Unoptimized images
- Memory leaks

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02
