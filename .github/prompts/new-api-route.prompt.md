---
description: "Create a new Next.js API route for Patrimio (non-AI) with authentication, Zod input validation, Supabase query, and proper error handling following project security conventions."
name: "New API Route"
agent: agent
tools: [read, edit, search]
argument-hint: "Describe the API route (e.g., 'POST /api/transactions to create a new transaction with category, account, amount, and description')"
---

Create a new Next.js App Router API route for Patrimio.

## Route description

$input

## Implementation checklist

### File location

`app/api/[resource]/route.ts` or `app/api/[resource]/[id]/route.ts`

### Security (non-negotiable)

1. Authenticate with: `const { data: { user }, error } = await supabase.auth.getUser()`
2. Return `401` if no user
3. Validate body with Zod `.strict()` schema — reject unknown fields
4. Never use `user_id` from request body (always from JWT)
5. Supabase queries always include `.eq('user_id', user.id)` even with RLS

### Pattern to follow

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const RequestSchema = z
  .object({
    // Resource fields here
  })
  .strict();

export async function POST(req: Request) {
  // 1. Auth
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 3. Business logic with user.id from JWT
  const { data, error } = await supabase
    .from("resource_table")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

### Error responses

- `401 Unauthorized` — no valid session
- `400 Bad Request` — Zod validation failure (include field errors)
- `404 Not Found` — resource doesn't exist or belongs to another user
- `409 Conflict` — duplicate resource
- `500 Internal Server Error` — unexpected DB error (don't expose details)

### Tests to generate

- Unit test: auth rejection (no token → 401)
- Unit test: Zod validation rejection (invalid body → 400)
- Unit test: unknown fields rejection (.strict() → 400)
- Integration test: successful create/read/update
