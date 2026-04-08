# lib/financial/ — Reglas de Lógica Financiera

> Estas reglas amplían el root AGENTS.md para trabajo en cálculos y formaters financieros.

## Regla absoluta: centavos siempre

```typescript
// ENTRADA del usuario (input)
const amountCents = decToCents(parseFloat(userInput)); // 850.75 → 85075

// ALMACENAMIENTO (DB)
amount_cents: INTEGER; // 85075

// PRESENTACIÓN al usuario
formatCurrency(amount_cents, currency); // 85075 → "850,75 €"

// NUNCA en cálculos intermedios
const total = itemA.amount_cents + itemB.amount_cents; // ✅ suma entera
const avg = total / count; // ✅ división entera
const pct = (partial * 100) / total; // ✅ porcentaje entero
```

## Funciones disponibles (usar siempre, no reimplementar)

```typescript
import {
  formatCurrency, // (cents: number, currency: string) → "850,75 €"
  formatCents, // (cents: number) → "850,75" (sin símbolo)
  decToCents, // (euros: number) → centavos INTEGER
  centsToDec, // (cents: number) → decimal (solo para display, no para cálculos)
  formatDate, // (date: string | Date) → "5 abr 2026" (locale es-ES)
  formatDateShort, // (date: string | Date) → "05/04/26"
  formatPercent, // (ratio: number) → "+12,5 %" con signo
} from "@/lib/financial/formatters";
```

## Proyecciones y cálculos

```typescript
// lib/financial/calculations.ts — funciones de dominio
// lib/financial/projections.ts — proyecciones de cash flow

// Los cálculos intermedios en centavos — redondear solo al final
const monthly_avg = Math.round(annual_cents / 12); // ✅
const monthly_avg = (annual_cents / 12).toFixed(2); // ❌ convierte a string
```

## Inversiones

- P&L: `(current_value_cents - cost_basis_cents)` — ambos INTEGER
- Precio medio de compra: `total_invested_cents / shares` — resultado puede ser float (solo para display)
- Dividendos: almacenar en centavos, mostrar con `formatCurrency`

## Locale

- Siempre `es-ES` para fechas y moneda
- `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` — usar via `formatCurrency`
- Nunca hardcodear `€` — usar el formatter que respeta la moneda configurada

## Tests para funciones financieras

```typescript
// Siempre incluir tests de redondeo y edge cases
describe("decToCents", () => {
  it("handles 850.75", () => expect(decToCents(850.75)).toBe(85075));
  it("handles 0.01", () => expect(decToCents(0.01)).toBe(1));
  it("handles float precision (0.1 + 0.2)", () => expect(decToCents(0.1 + 0.2)).toBe(30)); // no 29 o 31
});
```
