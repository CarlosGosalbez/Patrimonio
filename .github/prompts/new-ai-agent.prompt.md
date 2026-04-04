---
description: "Create a new AI agent API route for Patrimio following the streaming pattern with authentication, Zod validation, and Supabase tool calls filtered by the authenticated user."
name: "New AI Agent Route"
agent: agent
tools: [read, edit, search]
argument-hint: "Describe the agent purpose and what tool calls it needs (e.g., 'spending trend analyzer that reads 6 months of transactions and detects patterns')"
---

Create a new AI agent API route for Patrimio.

## Agent description

$input

## Files to create

1. `app/api/ai/[agent-name]/route.ts` — The Next.js API route
2. `lib/ai/agents/[agent-name].ts` — System prompt and tool definitions

## Implementation requirements

### Security (mandatory)

- Authentication MUST come from JWT: `const { data: { user } } = await supabase.auth.getUser()`
- Never read `user_id` from the request body
- All tool calls filter by `user.id` from the outer scope (not passed as parameter)
- Input validated with Zod `.strict()` schema

### Agent structure

Use this exact pattern:

```typescript
// app/api/ai/[name]/route.ts
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const InputSchema = z
  .object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
    // Add agent-specific params here
  })
  .strict();

export async function POST(req: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const input = InputSchema.parse(await req.json());

  const result = await streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: input.messages,
    maxSteps: 5,
    tools: {
      // Tool calls go here
    },
  });

  return result.toDataStreamResponse();
}
```

### System prompt (in Spanish)

- Purpose-focused, concise
- Include output format instructions
- Include any disclaimers required (especially for investment-related agents)

### Tests

Create `tests/unit/agents/[name].test.ts` with:

- Tests for auth rejection (no token)
- Tests for Zod validation rejection (unknown fields)
- Mocked Anthropic API response test

## Reference

Check existing agents in `app/api/ai/` for patterns to follow.
