# TypeScript - Estándares del Proyecto

## tsconfig.json Obligatorio

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,

    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Type Safety Rules

### Nunca usar 'any'

```typescript
// ❌ BAD
function process(data: any) {
  return data.value;
}

// ✅ GOOD
function process<T extends { value: string }>(data: T): string {
  return data.value;
}

// ✅ GOOD - Unknown si el tipo es verdaderamente desconocido
function process(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: string }).value;
  }
  throw new Error("Invalid data");
}
```

### Preferir interfaces sobre types (cuando sea posible)

```typescript
// ✅ GOOD
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ OK - Type para unions/intersections
type Status = "pending" | "active" | "inactive";
type UserWithStatus = User & { status: Status };
```

### Props siempre tipadas

```typescript
// ❌ BAD
export const UserCard = ({ user, onEdit }) => {
  // ...
};

// ✅ GOOD
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onEdit }) => {
  // ...
};
```

### Return types explícitos en funciones públicas

```typescript
// ❌ BAD
export const calculateBalance = (transactions) => {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
};

// ✅ GOOD
export const calculateBalance = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
};
```

## Generics

### Cuando usar Generics

```typescript
// ✅ GOOD - Reutilizable y type-safe
function first<T>(array: T[]): T | undefined {
  return array[0];
}

const num = first([1, 2, 3]); // number | undefined
const str = first(["a", "b"]); // string | undefined
```

### Constraints en Generics

```typescript
// ✅ GOOD
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}
```

## Utility Types

### Usar utility types built-in

```typescript
// ✅ GOOD
type UserUpdate = Partial<User>;
type UserCreate = Omit<User, "id" | "created_at">;
type UserReadOnly = Readonly<User>;
type UserId = Pick<User, "id">;
```

### Custom utility types

```typescript
// ✅ GOOD - Cuando built-ins no son suficientes
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type Nullable<T> = T | null;
type Optional<T> = T | undefined;
```

## Type Guards

### Siempre usar type guards

```typescript
// ✅ GOOD
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

// Uso
if (isUser(data)) {
  console.log(data.id); // TypeScript knows it's a User
}
```

## Enums vs Union Types

### Preferir union types para strings

```typescript
// ✅ GOOD
type TransactionType = "income" | "expense";

// ❌ AVOID (a menos que necesites reverse mapping)
enum TransactionType {
  Income = "income",
  Expense = "expense",
}
```

### Usar const enum solo si realmente necesitas

```typescript
// ✅ OK
const enum Status {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}
```

## Null vs Undefined

### Consistencia

```typescript
// ✅ GOOD - Usar null para "vacío intencionado"
interface User {
  name: string;
  middleName: string | null; // Puede no existir
  email: string;
}

// ✅ GOOD - Usar undefined para "opcional"
interface Options {
  debug?: boolean; // undefined si no se pasa
  timeout?: number;
}
```

## Async/Await Types

### Siempre tipar Promises

```typescript
// ❌ BAD
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ✅ GOOD
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return UserSchema.parse(data); // Runtime validation
}
```

## Error Handling

### Tipar errores cuando sea posible

```typescript
// ✅ GOOD
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

try {
  await fetchUser("123");
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error ${error.statusCode}:`, error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Index Signatures

### Evitar cuando sea posible

```typescript
// ❌ AVOID
interface Config {
  [key: string]: string;
}

// ✅ BETTER
interface Config {
  apiUrl: string;
  apiKey: string;
  timeout: number;
}

// ✅ OK - Cuando realmente es dinámico
type Dictionary<T> = Record<string, T>;
```

## Template Literal Types

### Usar para strings con patrones

```typescript
// ✅ GOOD
type EventName = `on${Capitalize<string>}`;
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
type Endpoint = `/${string}`;
```

## Conditional Types

### Para tipos avanzados

```typescript
// ✅ GOOD
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

type ExtractPromise<T> = T extends Promise<infer U> ? U : never;
```

## JSDoc Comments

### Documentar tipos públicos

```typescript
/**
 * Calcula el balance total de un usuario
 * @param transactions - Array de transacciones del usuario
 * @returns Balance total (sum de amounts)
 * @throws {Error} Si transactions está vacío
 */
export function calculateBalance(transactions: Transaction[]): number {
  if (transactions.length === 0) {
    throw new Error("Cannot calculate balance of empty transactions");
  }
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}
```

## Import/Export

### Named exports sobre default

```typescript
// ✅ GOOD
export const UserCard: FC<UserCardProps> = ({ user }) => {
  // ...
};

// ❌ AVOID
export default function UserCard({ user }) {
  // ...
}
```

### Barrel exports

```typescript
// ✅ GOOD - index.ts
export { UserCard } from "./UserCard";
export { UserList } from "./UserList";
export type { User, UserCardProps } from "./types";
```

---

**Cumplimiento:** Obligatorio  
**Verificación:** ESLint + TypeScript compiler  
**CI/CD:** Build falla si hay errores TypeScript
