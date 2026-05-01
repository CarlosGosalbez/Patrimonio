---
paths:
  - "app/api/ai/**"
  - "lib/ai/**"
---

# AI Agents Rules — Patrimio

## Mandatory API route pattern (Vercel AI SDK 4.x)

```typescript
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  // 1. Auth from JWT — NEVER from body
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Validate input with Zod strict
  const InputSchema = z.object({ messages: z.array(z.any()) }).strict();
  const { messages } = InputSchema.parse(await req.json());

  // 3. Stream with tool calls
  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 8, // Prevent infinite tool loops
    abortSignal: req.signal, // Client navigation cancels request
    tools: {
      getTransactions: tool({
        description: "Get user transactions",
        parameters: z.object({ month: z.number(), year: z.number() }),
        execute: async ({ month, year }) => {
          // ALWAYS filter by user.id from JWT
          const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id) // ← NEVER from request body
            .gte("date", `${year}-${month}-01`)
            .is("deleted_at", null);
          return data ?? [];
        },
      }),
    },
  });
  return result.toDataStreamResponse();
}
```

## 5 Agents — endpoints and limits

| Agent               | Endpoint                      | maxSteps | Model  |
| ------------------- | ----------------------------- | -------- | ------ |
| Auto-Categorizer    | `/api/ai/categorize`          | 5        | haiku  |
| Financial Insights  | `/api/ai/insights`            | 8        | sonnet |
| Import Assistant    | `/api/ai/import-assist`       | 6        | sonnet |
| Investment Research | `/api/ai/investment-research` | 10       | sonnet |
| Budget Optimizer    | `/api/ai/budget-optimizer`    | 8        | sonnet |

## Tool call rules

- Filter EVERY query by `user.id`: `.eq('user_id', user.id)`
- Never return raw DB rows — pick only fields the agent needs
- Never accept `user_id` from request body — always from JWT
- Soft delete filter: `.is('deleted_at', null)` on every SELECT

## Client-side streaming hook

```typescript
// hooks/useAIAgent.ts
export function useAIAgent(endpoint: string) {
  const abortRef = useRef<AbortController>();
  return useChat({
    api: endpoint,
    onError: (e) => console.error("Agent error", e),
    fetch: (url, init) => {
      abortRef.current = new AbortController();
      return fetch(url, { ...init, signal: abortRef.current.signal });
    },
  });
}
// Call abortRef.current?.abort() on component unmount or navigation
```

## Cost control

- Cache category/budget data with TanStack Query: `staleTime: 5 * 60 * 1000`
- Rate limit AI endpoints: 10 req/min per user
- `maxSteps` must be set — never omit (prevent infinite loops)
- Use `haiku` for categorization (high-volume, low-complexity)
- Use `sonnet` for analysis (balance cost vs quality)
