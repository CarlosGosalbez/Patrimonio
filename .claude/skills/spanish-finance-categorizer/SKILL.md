---
name: spanish-finance-categorizer
description: "Categorize Spanish banking transactions using merchant name patterns. Use when implementing auto-categorization, building category rules, or improving import accuracy for Spanish bank statements (Santander, BBVA, CaixaBank, ING, Bankinter, Sabadell)."
user-invocable: false
paths:
  - "app/api/ai/categorize/**"
  - "lib/ai/**"
---

# Spanish Finance Categorizer

Pattern-based classification for Spanish banking transactions.

## Category Taxonomy (Patrimio standard)

| ID              | Category       | Examples                                                                         |
| --------------- | -------------- | -------------------------------------------------------------------------------- |
| `food`          | Alimentación   | Mercadona, Carrefour, Lidl, Aldi, Alcampo, Consum, Ahorramas, Dia, Eroski, Froiz |
| `restaurants`   | Restaurantes   | McDonald's, KFC, Burger King, Telepizza, Domino's, Just Eat, Deliveroo, Glovo    |
| `transport`     | Transporte     | Renfe, Metro Madrid, TMB, EMT, Repsol, Cepsa, BP, Uber, Cabify, BlaBlaCar        |
| `subscriptions` | Suscripciones  | Netflix, Spotify, Amazon Prime, Disney+, HBO Max, Apple, Google                  |
| `utilities`     | Suministros    | Iberdrola, Endesa, Naturgy, Gas Natural, Canal Isabel II, Aqualia                |
| `health`        | Salud          | Farmacia, Sanitas, MAPFRE Salud, Adeslas, bupa                                   |
| `shopping`      | Compras        | El Corte Inglés, Zara, H&M, Amazon, Primark, Mango, MediaMarkt                   |
| `housing`       | Vivienda       | Comunidad propietarios, alquiler, hipoteca, seguro hogar                         |
| `leisure`       | Ocio           | Entradas, cine, teatro, deporte, viajes                                          |
| `transfers`     | Transferencias | Bizum, transferencia, ingreso nómina                                             |
| `taxes`         | Impuestos      | AEAT, Agencia Tributaria, Seguridad Social, ayuntamiento                         |
| `tech`          | Tecnología     | AWS, GitHub, Microsoft 365, Adobe                                                |
| `other`         | Otros          | Fallback                                                                         |

## Merchant Detection Patterns

```typescript
// Pattern priority: exact match → prefix → keyword → fallback
const PATTERNS: Array<{
  pattern: RegExp;
  category: string;
  confidence: number;
}> = [
  // Supermercados
  { pattern: /MERCADONA/i, category: "food", confidence: 0.99 },
  { pattern: /CARREFOUR/i, category: "food", confidence: 0.99 },
  { pattern: /\bLIDL\b/i, category: "food", confidence: 0.99 },
  { pattern: /\bALDI\b/i, category: "food", confidence: 0.99 },
  { pattern: /ALCAMPO/i, category: "food", confidence: 0.99 },
  { pattern: /CONSUM/i, category: "food", confidence: 0.95 },
  { pattern: /EROSKI/i, category: "food", confidence: 0.95 },
  { pattern: /\bDIA\s/i, category: "food", confidence: 0.95 },

  // Restaurantes / Delivery
  {
    pattern: /MCDONALDS|MC DONALDS/i,
    category: "restaurants",
    confidence: 0.99,
  },
  { pattern: /JUST\s?EAT/i, category: "restaurants", confidence: 0.99 },
  { pattern: /DELIVEROO/i, category: "restaurants", confidence: 0.99 },
  { pattern: /\bGLOVO\b/i, category: "restaurants", confidence: 0.99 },
  { pattern: /UBER\s?EATS/i, category: "restaurants", confidence: 0.99 },

  // Transporte
  { pattern: /RENFE/i, category: "transport", confidence: 0.99 },
  {
    pattern: /METRO\s(MADRID|BARCELONA)/i,
    category: "transport",
    confidence: 0.99,
  },
  { pattern: /\bUBER\b(?!\s?EATS)/i, category: "transport", confidence: 0.95 },
  { pattern: /CABIFY/i, category: "transport", confidence: 0.99 },
  { pattern: /REPSOL|CEPSA|\bBP\b/i, category: "transport", confidence: 0.9 },

  // Suscripciones
  { pattern: /NETFLIX/i, category: "subscriptions", confidence: 0.99 },
  { pattern: /SPOTIFY/i, category: "subscriptions", confidence: 0.99 },
  { pattern: /AMAZON\s?PRIME/i, category: "subscriptions", confidence: 0.99 },
  {
    pattern: /DISNEY\s?\+|DISNEY\s?PLUS/i,
    category: "subscriptions",
    confidence: 0.99,
  },
  { pattern: /APPLE\.COM\/BILL/i, category: "subscriptions", confidence: 0.99 },
  { pattern: /GOOGLE\s?\*/i, category: "subscriptions", confidence: 0.9 },

  // Suministros
  { pattern: /IBERDROLA/i, category: "utilities", confidence: 0.99 },
  { pattern: /ENDESA/i, category: "utilities", confidence: 0.99 },
  {
    pattern: /NATURGY|GAS\s?NATURAL/i,
    category: "utilities",
    confidence: 0.99,
  },
  { pattern: /CANAL\s?ISABEL/i, category: "utilities", confidence: 0.99 },

  // Nomina / Ingreso
  { pattern: /N[ÓO]MINA|NOMINA/i, category: "transfers", confidence: 0.85 },
  { pattern: /\bBIZUM\b/i, category: "transfers", confidence: 0.99 },
];
```

## Confidence Thresholds

- `≥ 0.90` → Auto-apply category (no confirmation needed)
- `0.70–0.89` → Suggest with confirmation badge in UI
- `< 0.70` → Send to AI model for classification + learning

## Unknown Transaction Prompt (for Auto-Categorizer agent)

> Classify this Spanish bank transaction into one of these exact categories: alimentación, restaurantes, transporte, suscripciones, suministros, salud, compras, vivienda, ocio, transferencias, impuestos, tecnología, otros.
> Transaction: "{description}" · Amount: {amount} · Date: {date}
> Reply with ONLY: `{ "category": "<id>", "confidence": <0-1>, "merchant": "<clean name>" }`
