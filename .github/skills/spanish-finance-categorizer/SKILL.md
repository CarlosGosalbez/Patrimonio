---
name: spanish-finance-categorizer
description: "Knowledge base for categorizing Spanish banking transactions, merchant names, and service descriptions. Use when implementing auto-categorization logic, building merchant-to-category mappings, or improving categorization accuracy for Spanish bank statement imports."
---

# Spanish Finance Categorizer

Domain knowledge for categorizing Spanish banking transactions.
Used by the Auto-Categorizer agent and as fallback for Import Assistant.

## Merchant Category Mappings

```typescript
// lib/ai/skills/spanish-finance-categorizer.ts

export const SPANISH_MERCHANT_CATEGORIES: Record<string, string> = {
  // Supermercados / Alimentación
  MERCADONA: "Alimentación",
  CARREFOUR: "Alimentación",
  LIDL: "Alimentación",
  ALDI: "Alimentación",
  ALCAMPO: "Alimentación",
  "EL CORTE INGLES ALIM": "Alimentación",
  CONSUM: "Alimentación",
  AHORRAMAS: "Alimentación",
  "DIA ": "Alimentación", // Note: trailing space to avoid false matches
  FROIZ: "Alimentación",
  EROSKI: "Alimentación",

  // Restaurantes
  MCDONALDS: "Restaurantes",
  KFC: "Restaurantes",
  "BURGER KING": "Restaurantes",
  TELEPIZZA: "Restaurantes",
  DOMINOS: "Restaurantes",
  "JUST EAT": "Restaurantes",
  DELIVEROO: "Restaurantes",
  GLOVO: "Restaurantes",

  // Transporte
  RENFE: "Transporte",
  "METRO MADRID": "Transporte",
  TMB: "Transporte", // Metro Barcelona
  EMT: "Transporte", // Bus Madrid
  REPSOL: "Transporte", // Gasolineras
  CEPSA: "Transporte",
  "BP ": "Transporte",
  UBER: "Transporte",
  CABIFY: "Transporte",
  BLABLACAR: "Transporte",

  // Suscripciones
  "NETFLIX.COM": "Suscripciones",
  SPOTIFY: "Suscripciones",
  "AMAZON PRIME": "Suscripciones",
  "DISNEY PLUS": "Suscripciones",
  "HBO MAX": "Suscripciones",
  "APPLE.COM/BILL": "Suscripciones",
  "GOOGLE *": "Suscripciones",
  MICROSOFT: "Tecnología",
  ADOBE: "Suscripciones",
  CHATGPT: "Suscripciones",

  // Telecomunicaciones
  MOVISTAR: "Suscripciones",
  VODAFONE: "Suscripciones",
  ORANGE: "Suscripciones",
  MASMOVIL: "Suscripciones",
  "O2 TELEFONICA": "Suscripciones",
  "DIGI SPAIN": "Suscripciones",

  // Salud
  FARMACIA: "Salud",
  CLINICA: "Salud",
  HOSPITAL: "Salud",
  SANITAS: "Salud",
  ADESLAS: "Salud",
  ASISA: "Salud",

  // Educación
  UDEMY: "Educación",
  COURSERA: "Educación",

  // Entretenimiento / Ocio
  STEAM: "Ocio",
  PLAYSTATION: "Ocio",
  XBOX: "Ocio",
  NINTENDO: "Ocio",
  TICKETMASTER: "Ocio",

  // Seguros
  MAPFRE: "Seguros",
  "MUTUA MADRILENA": "Seguros",
  AXA: "Seguros",
  GENERALI: "Seguros",
  ALLIANZ: "Seguros",

  // Bancos / Financiero (comisiones, etc.)
  COMISION: "Otros gastos",
  "MANTENIMIENTO CUENTA": "Otros gastos",
  "SEGURO DE VIDA": "Seguros",
};
```

## Income Pattern Matching

```typescript
export const INCOME_PATTERNS = [
  { pattern: /nomina|nómina|NOMINA/i, category: "Nómina" },
  { pattern: /pension|pensión/i, category: "Nómina" },
  { pattern: /devolucion|devolución|DEVOLUCION/i, category: "Otros ingresos" },
  { pattern: /hacienda|AEAT/i, category: "Otros ingresos" },
  { pattern: /dividendo|DIVIDENDO/i, category: "Dividendos" },
  { pattern: /alquiler|ALQUILER/i, category: "Alquiler cobrado" },
  { pattern: /freelance|autonomo|autónomo/i, category: "Freelance" },
];
```

## Bank Format Detection Heuristics

```typescript
// Detect which Spanish bank the CSV/Excel came from
export function detectBankFormat(headers: string[], sampleRows: string[][]): BankFormat | null {
  if (headers.includes("Fecha Valor") && headers.includes("Movimiento")) return "santander";
  if (headers.includes("Fecha") && headers.includes("Concepto") && headers.includes("Importe (€)"))
    return "bbva";
  if (headers.includes("Data") && headers.includes("Concepte")) return "caixabank"; // Catalan headers
  if (headers.includes("Fecha/Hora") && headers.includes("Categoría ING")) return "ing";
  return null;
}
```

## Confidence Scoring

```typescript
export function scoreCategorizationConfidence(
  description: string,
  candidates: CategoryMatch[],
): number {
  // Exact match → 0.95
  // contains match → 0.80
  // starts_with match → 0.85
  // regex match → 0.75
  // history-based (same description before) → 0.90
  // fallback/heuristic → 0.55
}
```
