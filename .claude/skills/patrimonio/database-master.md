# 🗄️ Skill: Database Master

Diseño de schemas PostgreSQL profesionales con RLS, triggers, índices y migrations.

## Especialización

Bases de datos PostgreSQL 16+ con:

- **Row Level Security (RLS)** obligatorio
- **Soft deletes** (deleted_at)
- **Timestamps automáticos** (triggers)
- **Índices optimizados** (partial, unique, GIN)
- **Type safety** (TypeScript types generados)
- **Migrations versionadas**

## Tecnologías

- PostgreSQL 16+
- Supabase (Auth + Realtime + Storage)
- Supabase CLI
- TypeScript 5.5+ (database types)
- Zod 3.23+ (runtime validation)

## Input Esperado

```typescript
{
  entity: string;            // Nombre de la entidad (snake_case)
  fields: {
    name: string;
    type: 'uuid' | 'text' | 'integer' | 'decimal' | 'boolean' | 'timestamptz' | 'jsonb';
    nullable: boolean;
    unique?: boolean;
    default?: string;
    references?: {
      table: string;
      column: string;
      onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    };
  }[];
  security: {
    userScoped: boolean;     // Si requiere RLS por usuario
    policies: string[];      // Políticas RLS (SELECT, INSERT, UPDATE, DELETE)
  };
  indexes?: {
    columns: string[];
    type?: 'btree' | 'gin' | 'gist';
    unique?: boolean;
    partial?: string;        // WHERE clause para índice parcial
  }[];
  softDelete: boolean;       // Si usa deleted_at
}
```

## Output Generado

```
supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_create_entity.sql    # Migration SQL
└── types/
    └── database.types.ts                    # TypeScript types (generado)
```

## Estructura de Migration

### 1. CREATE TABLE

```sql
-- supabase/migrations/20260502120000_create_transactions.sql

-- ============================================
-- Transactions Table
-- ============================================
-- Almacena transacciones financieras (gastos/ingresos)
-- User-scoped con RLS
-- Soft delete habilitado
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Core Fields
  amount DECIMAL(12, 2) NOT NULL CHECK (amount != 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT amount_not_zero CHECK (amount != 0),
  CONSTRAINT valid_transaction_type CHECK (type IN ('income', 'expense')),
  CONSTRAINT future_date_limit CHECK (transaction_date <= CURRENT_DATE + INTERVAL '1 day')
);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE transactions IS 'Financial transactions (income/expense)';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount (positive or negative)';
COMMENT ON COLUMN transactions.type IS 'Transaction type: income or expense';
COMMENT ON COLUMN transactions.metadata IS 'Additional flexible metadata (JSONB)';
COMMENT ON COLUMN transactions.deleted_at IS 'Soft delete timestamp (NULL = active)';
```

### 2. INDEXES

```sql
-- ============================================
-- Indexes
-- ============================================

-- Primary queries index (user + active + date)
CREATE INDEX IF NOT EXISTS idx_transactions_user_active_date
  ON transactions(user_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

-- Category analysis index
CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions(category_id, transaction_date)
  WHERE deleted_at IS NULL;

-- Type filtering index
CREATE INDEX IF NOT EXISTS idx_transactions_type
  ON transactions(user_id, type)
  WHERE deleted_at IS NULL;

-- Full-text search on description (GIN)
CREATE INDEX IF NOT EXISTS idx_transactions_description_search
  ON transactions USING gin(to_tsvector('english', description))
  WHERE deleted_at IS NULL;

-- Tags array search (GIN)
CREATE INDEX IF NOT EXISTS idx_transactions_tags
  ON transactions USING gin(tags)
  WHERE deleted_at IS NULL;

-- JSONB metadata search (GIN)
CREATE INDEX IF NOT EXISTS idx_transactions_metadata
  ON transactions USING gin(metadata)
  WHERE deleted_at IS NULL;

-- Unique constraint: prevent duplicate transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique
  ON transactions(user_id, amount, transaction_date, description)
  WHERE deleted_at IS NULL;
```

### 3. ROW LEVEL SECURITY

```sql
-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own transactions
CREATE POLICY "transactions_select_own"
  ON transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Policy: Users can insert own transactions
CREATE POLICY "transactions_insert_own"
  ON transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Users can update own transactions
CREATE POLICY "transactions_update_own"
  ON transactions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Users can soft-delete own transactions
CREATE POLICY "transactions_delete_own"
  ON transactions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );

-- Policy: Service role can do anything (for admin operations)
CREATE POLICY "transactions_service_role_all"
  ON transactions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### 4. TRIGGERS

```sql
-- ============================================
-- Triggers
-- ============================================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Prevent resurrection (deleted_at cannot be set back to NULL)
CREATE OR REPLACE FUNCTION prevent_resurrection()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot resurrect deleted record. Use INSERT instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_prevent_resurrection
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_resurrection();

-- Trigger: Validate business rules
CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Income must be positive
  IF NEW.type = 'income' AND NEW.amount < 0 THEN
    RAISE EXCEPTION 'Income amount must be positive';
  END IF;

  -- Expense must be negative (or will be converted)
  IF NEW.type = 'expense' AND NEW.amount > 0 THEN
    NEW.amount := -NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_validate
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction();
```

### 5. FUNCTIONS (RPC)

```sql
-- ============================================
-- Functions (RPC)
-- ============================================

-- Function: Get user balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_balance
  FROM transactions
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  RETURN v_balance;
END;
$$;

-- Function: Get transactions by date range
CREATE OR REPLACE FUNCTION get_transactions_by_date_range(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  amount DECIMAL(12, 2),
  type TEXT,
  description TEXT,
  transaction_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.amount,
    t.type,
    t.description,
    t.transaction_date,
    t.created_at
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.deleted_at IS NULL
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

-- Function: Soft delete transaction
CREATE OR REPLACE FUNCTION soft_delete_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NOW()
  WHERE id = p_transaction_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already deleted';
  END IF;
END;
$$;
```

## TypeScript Types

Generar types con Supabase CLI:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Resultado (.types.ts)

```typescript
export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          category_id: string | null;
          amount: number;
          type: "income" | "expense";
          description: string | null;
          transaction_date: string;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          category_id?: string | null;
          amount: number;
          type: "income" | "expense";
          description?: string | null;
          transaction_date?: string;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          amount?: number;
          type?: "income" | "expense";
          description?: string | null;
          transaction_date?: string;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Functions: {
      get_user_balance: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_transactions_by_date_range: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: {
          id: string;
          amount: number;
          type: string;
          description: string;
          transaction_date: string;
          created_at: string;
        }[];
      };
      soft_delete_transaction: {
        Args: { p_transaction_id: string };
        Returns: void;
      };
    };
  };
}
```

## Zod Schema

```typescript
import { z } from "zod";

export const TransactionSchema = z.object({
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero"),
  type: z.enum(["income", "expense"]),
  description: z.string().max(500).optional(),
  transaction_date: z.date().max(new Date()),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type Transaction = z.infer<typeof TransactionSchema>;
```

## Mejores Prácticas

### Naming Conventions

- Tablas: `plural_snake_case` (transactions, user_profiles)
- Columnas: `snake_case` (user_id, created_at)
- Índices: `idx_table_columns` (idx_transactions_user_date)
- Políticas: `table_action_description` (transactions_select_own)
- Funciones: `verb_noun` (get_user_balance, soft_delete_transaction)

### Security

- ✅ RLS habilitado en TODAS las tablas user-scoped
- ✅ Políticas específicas por operación (SELECT, INSERT, UPDATE, DELETE)
- ✅ Service role policy para operaciones admin
- ✅ SECURITY DEFINER en funciones que necesitan escalación
- ✅ SET search_path en funciones para prevenir SQL injection

### Performance

- ✅ Índices parciales con `WHERE deleted_at IS NULL`
- ✅ Índices compuestos para queries frecuentes
- ✅ GIN índices para arrays/JSONB
- ✅ Unique índices para prevenir duplicados
- ✅ ANALYZE después de crear índices

### Data Integrity

- ✅ CHECK constraints para validaciones
- ✅ Foreign keys con ON DELETE apropiado
- ✅ NOT NULL en campos requeridos
- ✅ DEFAULT values razonables
- ✅ Triggers para reglas de negocio

## Testing

```sql
-- Test RLS policies
SELECT auth.login_as('user-uuid');
SELECT * FROM transactions; -- Solo debe ver sus propias transacciones

-- Test triggers
INSERT INTO transactions (user_id, amount, type) VALUES (auth.uid(), -100, 'income');
-- Debería convertir amount a positivo

-- Test functions
SELECT get_user_balance(auth.uid());
-- Debe retornar balance correcto
```

## Casos de Uso

### Crear Tabla con RLS

```
@database-master

Crea tabla transactions con:
- user_id (FK a auth.users)
- amount (decimal, not zero)
- type (enum: income/expense)
- transaction_date
- RLS user-scoped
- Soft delete
- Índices optimizados
```

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
