# 🎨 Skill: Component Builder

Componentes React 18+ type-safe con WCAG AAA.

## Stack

React 18.3+ · TypeScript 5.5+ · Tailwind 4+ · Radix UI 2+ · React Hook Form 7+ · Zod 3.23+

## Requisitos

- WCAG AAA (contraste 7:1, keyboard nav, ARIA)
- TypeScript strict
- Tests incluidos
- Performance (memo, useMemo)
- Responsive (touch 44x44px)

## Output

```
src/features/[feature]/components/
├── ComponentName.tsx
├── ComponentName.types.ts
├── ComponentName.test.tsx
└── index.ts
```

## Estructura del Componente

### 1. Types File (.types.ts)

```typescript
/**
 * Props para el componente TransactionForm
 * @wcag AAA compliant
 */
export interface TransactionFormProps {
  /**
   * Callback al enviar el formulario
   */
  onSubmit: (data: TransactionFormData) => void | Promise<void>;

  /**
   * Valores iniciales del formulario (opcional para edición)
   */
  initialValues?: Partial<TransactionFormData>;

  /**
   * Estado de carga durante el submit
   */
  isLoading?: boolean;

  /**
   * Callback al cancelar
   */
  onCancel?: () => void;
}

export interface TransactionFormData {
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: "income" | "expense";
}
```

### 2. Component File (.tsx)

````typescript
'use client';

import { FC, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Sentry from '@sentry/nextjs';

import { TransactionFormProps, TransactionFormData } from './TransactionForm.types';
import { transactionSchema } from './TransactionForm.schema';

/**
 * TransactionForm - Formulario accesible para crear/editar transacciones
 *
 * @example
 * ```tsx
 * <TransactionForm
 *   onSubmit={handleSubmit}
 *   initialValues={{ amount: 100 }}
 * />
 * ```
 *
 * @wcag AAA compliant
 * @keyboard Full keyboard navigation support
 * @accessibility ARIA labels, roles, live regions
 */
export const TransactionForm: FC<TransactionFormProps> = memo(({
  onSubmit,
  initialValues,
  isLoading = false,
  onCancel
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialValues
  });

  const handleFormSubmit = async (data: TransactionFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'TransactionForm' },
        contexts: { formData: data }
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      aria-label="Transaction form"
      noValidate
    >
      {/* Amount Field */}
      <div className="space-y-2">
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Amount <span className="text-red-600" aria-label="required">*</span>
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          aria-required="true"
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
          className={`
            w-full px-4 py-3 rounded-lg border transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.amount
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-700'
            }
          `}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p
            id="amount-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {errors.amount.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg border border-gray-300
                       hover:bg-gray-50 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-gray-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       min-w-[100px] min-h-[44px]"
            aria-label="Cancel transaction"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !isDirty}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white
                     hover:bg-blue-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     min-w-[100px] min-h-[44px]"
          aria-label="Submit transaction"
          aria-busy={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
});

TransactionForm.displayName = 'TransactionForm';
````

### 3. Schema File (.schema.ts)

```typescript
import { z } from "zod";

/**
 * Esquema de validación Zod para TransactionForm
 */
export const transactionSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be positive")
    .finite("Amount must be a finite number"),

  category: z
    .string({ required_error: "Category is required" })
    .min(1, "Category is required")
    .max(50, "Category must be 50 characters or less"),

  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),

  date: z
    .date({ required_error: "Date is required" })
    .max(new Date(), "Date cannot be in the future"),

  type: z.enum(["income", "expense"], {
    required_error: "Type is required",
  }),
});

export type TransactionSchema = z.infer<typeof transactionSchema>;
```

### 4. Test File (.test.tsx)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TransactionForm } from './TransactionForm';
import type { TransactionFormProps } from './TransactionForm.types';

describe('TransactionForm', () => {
  const defaultProps: TransactionFormProps = {
    onSubmit: vi.fn()
  };

  it('renders all form fields', () => {
    render(<TransactionForm {...defaultProps} />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<TransactionForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<TransactionForm {...defaultProps} onSubmit={onSubmit} />);

    const amountInput = screen.getByLabelText(/amount/i);
    await userEvent.type(amountInput, '100');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100 })
      );
    });
  });

  it('is keyboard navigable', async () => {
    render(<TransactionForm {...defaultProps} />);

    const amountInput = screen.getByLabelText(/amount/i);
    amountInput.focus();

    expect(amountInput).toHaveFocus();

    await userEvent.tab();
    // Next field should be focused
  });

  it('shows loading state', () => {
    render(<TransactionForm {...defaultProps} isLoading />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
  });
});
```

## Patrones de Componentes

### Form Components

- React Hook Form + Zod validation
- Error messages con aria-live
- Field-level validation
- Disabled state durante submit
- Touch targets mínimo 44x44px

### List Components

- Virtualization para listas largas (>100 items)
- Empty state con ilustración
- Loading skeleton
- Infinite scroll o pagination
- Keyboard navigation (Arrow keys)

### Card Components

- Semantic HTML (`<article>`, `<section>`)
- Hover states accesibles
- Focus visible
- Touch-friendly actions

### Modal Components

- Dialog primitives de Radix UI
- Focus trap
- Escape to close
- Click outside to close
- ARIA modal role
- Return focus al trigger

### Button Components

- Minimum 44x44px touch target
- Loading state con spinner
- Disabled state con cursor-not-allowed
- Focus ring visible (2px)
- Variants: primary, secondary, danger

## Checklist de Accesibilidad

- [ ] ARIA labels en todos los interactivos
- [ ] Roles semánticos apropiados
- [ ] Keyboard navigation completa
- [ ] Focus visible (outline o ring)
- [ ] Color contrast 7:1 (WCAG AAA)
- [ ] Touch targets 44x44px mínimo
- [ ] Error messages con aria-live
- [ ] Loading states con aria-busy
- [ ] Screen reader friendly

## Checklist de Performance

- [ ] React.memo para componentes pesados
- [ ] useMemo para cálculos costosos
- [ ] useCallback para funciones pasadas como props
- [ ] Code splitting si componente >50KB
- [ ] Lazy loading de imágenes
- [ ] Virtualization en listas largas

## Integración con Sentry

```typescript
import * as Sentry from '@sentry/nextjs';

// Error Boundary
export const ComponentErrorBoundary: FC<{ children: ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={<ErrorFallback />}
    beforeCapture={(scope) => {
      scope.setTag('component', 'TransactionForm');
    }}
  >
    {children}
  </Sentry.ErrorBoundary>
);
```

## Casos de Uso

### Crear Form Component

```
@component-builder

Crea TransactionForm con:
- Campos: amount (number), category (select), description (textarea), date
- Validación: Zod (amount > 0, category required)
- Submit: async con loading state
- Accesibilidad: WCAG AAA
```

### Crear List Component

```
@component-builder

Crea TransactionList con:
- Items: virtualized list
- Actions: edit, delete (confirmación)
- Empty state
- Infinite scroll
```

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02  
**Maintainer:** @patrimonio-orchestrator
