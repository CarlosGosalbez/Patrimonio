# 🔍 Skill: Sentry Monitor

Error tracking + performance monitoring.

## Stack

@sentry/nextjs 8.33+ · @sentry/deno · Sentry Performance API

## Features

- Error tracking + contexto
- Performance (transacciones + spans)
- Session Replay
- Breadcrumbs
- User feedback

## Output Generado

```
- sentry.client.config.ts        # Client-side config
- sentry.server.config.ts        # Server-side config
- sentry.edge.config.ts          # Edge Functions config
- src/lib/sentry/
  ├── errorBoundary.tsx         # React Error Boundary
  ├── performance.ts            # Performance helpers
  └── utils.ts                  # Sentry utilities
```

## 1. Client Configuration

```typescript
// sentry.client.config.ts

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Performance Monitoring
  tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% de sesiones normales
  replaysOnErrorSampleRate: 1.0, // 100% de sesiones con errores

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/patrimonio\.vercel\.app/,
      ],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors from dev
    if (ENVIRONMENT === "development") {
      console.log("Sentry event (dev):", event);
      return null;
    }

    // Filter out known errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignore network errors
      if (error.message.includes("NetworkError")) {
        return null;
      }

      // Ignore cancelled requests
      if (error.message.includes("AbortError")) {
        return null;
      }
    }

    return event;
  },

  // Enrichment
  beforeBreadcrumb(breadcrumb, hint) {
    // Add extra context to breadcrumbs
    if (breadcrumb.category === "console") {
      return null; // Don't send console logs
    }

    return breadcrumb;
  },

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  dist: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,

  // Performance
  maxBreadcrumbs: 50,
  attachStacktrace: true,

  // Privacy
  sendDefaultPii: false,
});
```

## 2. Server Configuration

```typescript
// sentry.server.config.ts

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.VERCEL_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,

  integrations: [new Sentry.Integrations.Http({ tracing: true })],

  beforeSend(event, hint) {
    // Add server context
    if (event.request) {
      // Remove sensitive headers
      delete event.request.headers?.["authorization"];
      delete event.request.headers?.["cookie"];
    }

    return event;
  },

  release: process.env.VERCEL_GIT_COMMIT_SHA,
  dist: process.env.VERCEL_GIT_COMMIT_REF,
});
```

## 3. Edge Functions Configuration

```typescript
// sentry.edge.config.ts

import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("ENVIRONMENT") || "development",

  tracesSampleRate: 1.0,

  beforeSend(event) {
    // Add Edge Function context
    event.tags = {
      ...event.tags,
      runtime: "edge",
      region: Deno.env.get("VERCEL_REGION"),
    };

    return event;
  },
});
```

## 4. Error Boundary Component

```typescript
// src/lib/sentry/errorBoundary.tsx

'use client';

import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/shared/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, eventId: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.withScope((scope) => {
      scope.setContext('react', {
        componentStack: errorInfo.componentStack
      });

      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, eventId: null });
  };

  handleReport = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({
        eventId: this.state.eventId,
        title: 'It looks like we're having issues.',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you'd like to help, tell us what happened below.'
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. Our team has been notified
                and we're working on a fix.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button variant="secondary" onClick={this.handleReport}>
                  Report Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 5. Performance Monitoring

```typescript
// src/lib/sentry/performance.ts

import * as Sentry from "@sentry/nextjs";

/**
 * Measure async function performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  options?: {
    op?: string;
    description?: string;
    tags?: Record<string, string>;
  },
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name,
    op: options?.op || "function",
    description: options?.description,
  });

  if (options?.tags) {
    Object.entries(options.tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }

  try {
    const result = await fn();
    transaction.setStatus("ok");
    return result;
  } catch (error) {
    transaction.setStatus("internal_error");
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Create child span for detailed timing
 */
export function withSpan<T>(name: string, fn: (span: Sentry.Span) => T): T {
  const span = Sentry.startSpan({ name });

  try {
    return fn(span);
  } finally {
    span.finish();
  }
}

/**
 * Track database query performance
 */
export async function trackQuery<T>(
  queryName: string,
  fn: () => Promise<T>,
): Promise<T> {
  return measurePerformance(`db.query.${queryName}`, fn, {
    op: "db.query",
    tags: { query: queryName },
  });
}

/**
 * Track API call performance
 */
export async function trackAPICall<T>(
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  return measurePerformance(`api.${endpoint}`, fn, {
    op: "http.client",
    tags: { endpoint },
  });
}
```

## 6. Utility Functions

```typescript
// src/lib/sentry/utils.ts

import * as Sentry from "@sentry/nextjs";

/**
 * Set user context
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb manually
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = "info",
  data?: Record<string, any>,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture message (non-error)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  tags?: Record<string, string>,
) {
  Sentry.captureMessage(message, {
    level,
    tags,
  });
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: { id: string; email?: string };
  },
) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      scope.setContext("extra", context.extra);
    }

    if (context?.user) {
      scope.setUser(context.user);
    }

    Sentry.captureException(error);
  });
}
```

## 7. Usage Examples

### In Components

```typescript
import { ErrorBoundary } from '@/lib/sentry/errorBoundary';
import { captureException } from '@/lib/sentry/utils';

export const TransactionsPage = () => {
  const handleError = (error: Error) => {
    captureException(error, {
      tags: { component: 'TransactionsPage', action: 'create' },
      extra: { timestamp: Date.now() }
    });
  };

  return (
    <ErrorBoundary>
      {/* Component content */}
    </ErrorBoundary>
  );
};
```

### In API Routes

```typescript
import { measurePerformance } from "@/lib/sentry/performance";
import { captureException } from "@/lib/sentry/utils";

export async function POST(request: Request) {
  try {
    return await measurePerformance(
      "api.transactions.create",
      async () => {
        // API logic
        const data = await request.json();
        const result = await createTransaction(data);
        return Response.json(result);
      },
      {
        tags: { endpoint: "/api/transactions" },
      },
    );
  } catch (error) {
    captureException(error as Error, {
      tags: { api: "transactions", method: "POST" },
    });
    throw error;
  }
}
```

### In Services

```typescript
import { trackQuery } from "@/lib/sentry/performance";
import { addBreadcrumb } from "@/lib/sentry/utils";

export const transactionsService = {
  async getAll() {
    addBreadcrumb("Fetching transactions", "service", "info");

    return trackQuery("transactions.getAll", async () => {
      const { data, error } = await supabase.from("transactions").select("*");

      if (error) throw error;
      return data;
    });
  },
};
```

## Best Practices

- ✅ Error Boundary en layout principal
- ✅ Performance tracking en operaciones críticas
- ✅ Breadcrumbs en acciones importantes
- ✅ User context después de login
- ✅ Filter sensitive data antes de enviar
- ✅ Source maps subidos en deploy

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
