---
description: "Use when implementing AI agents, adding tool calls to agents, building agent API routes, creating Claude prompts, or working with Vercel AI SDK streaming. Covers all 5 Patrimio agents."
name: "AI Agents Guidelines"
applyTo: ["app/api/ai/**", "lib/ai/**"]
---

# AI Agents Guidelines — Patrimio

All AI features use **Claude claude-sonnet-4** via Anthropic API with **Vercel AI SDK** for streaming responses.

## The 5 Patrimio Agents

| Agent               | Endpoint                           | Tool Calls                                                                                                                                            | Trigger                      |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Auto-Categorizer    | `POST /api/ai/categorize`          | `get_user_categories`, `get_categorization_history`, `apply_category`, `create_rule`                                                                  | Import or manual transaction |
| Financial Insights  | `POST /api/ai/insights`            | `get_monthly_summary`, `get_spending_trends`, `get_budget_status`, `get_upcoming_commitments`, `get_investment_performance`, `get_category_anomalies` | Dashboard open, month close  |
| Import Assistant    | `POST /api/ai/import-assist`       | `analyze_file_structure`, `suggest_column_mapping`, `detect_bank_format`, `validate_imported_data`                                                    | Complex file import          |
| Investment Research | `POST /api/ai/investment-research` | `get_position_details`, `web_search`, `get_market_data`, `get_dividend_history`, `get_fundamentals`                                                   | "Ver análisis" on position   |
| Budget Optimizer    | `POST /api/ai/budget-optimizer`    | `get_spending_by_category`, `get_income_history`, `get_existing_budgets`, `get_financial_goals`                                                       | First use or manual trigger  |

## Base Route Pattern

```typescript
// app/api/ai/[agent-name]/route.ts
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

// Input schema — always .strict()
const AgentInputSchema = z
  .object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
    // agent-specific params
  })
  .strict();

export async function POST(req: Request) {
  // 1. Auth from JWT — NEVER from body
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. Validate input
  const body = await req.json();
  const input = AgentInputSchema.parse(body);

  // 3. Stream with tool calls
  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: input.messages,
    maxSteps: 5, // Limit agentic loops
    tools: {
      toolName: tool({
        description: "What this tool does",
        parameters: z.object({ param: z.string() }).strict(),
        execute: async ({ param }) => {
          // ALL DB queries filter by user.id from JWT
          const { data } = await supabase
            .from("table")
            .select("*")
            .eq("user_id", user.id) // ← CRITICAL: always filter by authenticated user
            .limit(100);
          return data;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

## System Prompts Design

```typescript
// Prompts are in Spanish (user-facing app is in Spanish)
const AUTO_CATEGORIZER_PROMPT = `
Eres un experto en finanzas personales españolas. Tu tarea es categorizar
transacciones bancarias basándote en su descripción y el historial del usuario.
Responde SOLO con JSON: {"category_id": "...", "confidence": 0.0-1.0, "reasoning": "..."}
No inventes categorías. Solo usa las proporcionadas en el contexto.
`;

// Confidence thresholds for Auto-Categorizer:
// > 0.85 → apply automatically
// 0.60-0.85 → show suggestion, user confirms with 1 tap
// < 0.60 → ask user (show suggestion as hint)
```

## Tool Call Security Rules

1. **All DB queries in tool executes use `user.id` from outer closure** (never passed as parameter)
2. **Limit query results** to avoid excessive data in Claude context (max 100 rows per tool call)
3. **Never pass raw financial data** (account numbers, full transaction history) unnecessarily
4. **Web search tool** (Investment Research agent only) — results are summarized, not stored

## Skills (Shared Logic Between Agents)

Skills are in `lib/ai/skills/` and imported by agents:

```typescript
// lib/ai/skills/financial-data-reader.ts
export async function getMonthlyTransactions(
  supabase: SupabaseClient,
  userId: string,  // Pass explicitly, not from global
  month: number,
  year: number
) { ... }

// lib/ai/skills/market-data-fetcher.ts
export async function getMarketPrice(ticker: string): Promise<MarketPrice> {
  // Priority: Yahoo Finance → Alpha Vantage → FMP
  // Returns null gracefully if all sources fail
}

// lib/ai/skills/transaction-formatter.ts
export function formatTransactionForAgent(tx: Transaction): string {
  // Returns structured text for Claude context
  // Includes: date, description, amount in EUR, category name
}

// lib/ai/skills/spanish-finance-categorizer.ts
export const MERCHANT_MAPPINGS: Record<string, string> = {
  'MERCADONA': 'Alimentación',
  'CARREFOUR': 'Alimentación',
  'NETFLIX.COM': 'Suscripciones',
  // ... extensive list
};
```

## Testing AI Agents

Always mock the Anthropic API in tests:

```typescript
// tests/unit/agents/auto-categorizer.test.ts
import { vi } from "vitest";
import { streamText } from "ai";

vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () =>
      new Response(
        JSON.stringify({
          category_id: "uuid",
          confidence: 0.92,
          reasoning: "test",
        }),
      ),
  }),
}));
```

## Feature Flags

AI agents can be toggled without deploy:

```typescript
// .env.local
NEXT_PUBLIC_FF_AI_INSIGHTS = true;
NEXT_PUBLIC_FF_AI_CATEGORIZER = true;
NEXT_PUBLIC_FF_INVESTMENT_RESEARCH = true;
```

Check at route level before streaming:

```typescript
if (process.env.NEXT_PUBLIC_FF_AI_INSIGHTS !== "true") {
  return new Response("Feature disabled", { status: 503 });
}
```

## Investment Research Disclaimer

The Investment Research agent MUST always include a disclaimer:

```typescript
const INVESTMENT_RESEARCH_DISCLAIMER = `
IMPORTANTE: Este análisis es puramente informativo y no constituye asesoramiento 
financiero regulado. Consult a un profesional antes de tomar decisiones de inversión.
`;
// Append to every Investment Research response
```


## abortSignal — Cancelación de streaming

Siempre pasar `abortSignal: req.signal` a `streamText` para cancelar cuando el cliente desconecta:

```typescript
const result = await streamText({
  model: anthropic("claude-sonnet-4-5"),
  system: SYSTEM_PROMPT,
  messages: input.messages,
  maxSteps: 8,
  abortSignal: req.signal, // REQUERIDO — evita compute desperdiciado
  tools: { ... },
});
return result.toDataStreamResponse();
```

## Client-side hook para agentes

```typescript
// hooks/use-agent-chat.ts
import { useChat } from 'ai/react';

export function useAgentChat(agent: 'insights' | 'budget-optimizer' | 'investment-research') {
  return useChat({
    api: `/api/ai/${agent}`,
    maxSteps: 8,
    onError: (error) => {
      // Handle AbortError silently (user navigation)
      if (error.name === 'AbortError') return;
      console.error('Agent error:', error);
    },
  });
}
```
