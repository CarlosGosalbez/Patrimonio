---
description: "Create a new React component for Patrimio app following shadcn/ui patterns, mobile-first design, TypeScript strict typing, and financial data display conventions."
name: "New Component"
agent: agent
tools: [read, edit, search]
argument-hint: "Describe the component (e.g., 'TransactionCard showing amount, category icon, description and date with swipe-to-delete on mobile')"
---

Create a new React component for Patrimio.

## Component description

$input

## Requirements

### TypeScript

- Use `interface` for component props contract
- Use types from `@/types/financial` for domain data
- No implicit `any`

### Styling

- Tailwind CSS utility classes
- Mobile-first: design for 390px width (iPhone 14) first
- Dark mode support: `dark:` variants for all color classes
- Safe area: use `pb-safe`, `pt-safe` if component appears near screen edges
- Touch targets: interactive elements minimum `h-11` (44px) per Apple HIG

### Financial display

- Monetary amounts via `formatCurrency` from `@/lib/financial/formatters`
- Dates via `formatDate` or `formatRelativeDate` from the same module
- Percent changes via `formatPercentChange`
- Color classes via `getAmountColorClass` (green for income, red for expense)

### shadcn/ui

- Use existing shadcn components from `@/components/ui/` as building blocks
- Don't reinvent Card, Button, Badge, Separator, etc.

### Accessibility

- Interactive elements have `aria-label` when icon-only
- Avoid removing focus outlines
- Color is not the only way to convey information (icon + color)

## File location

Place in the appropriate feature subfolder:

- `components/transactions/` for transaction-related
- `components/investments/` for portfolio-related
- `components/dashboard/` for dashboard widgets
- `components/forms/` for form components
- `components/ui/` only for truly generic/reusable base components

## Also generate

- Storybook story (if Storybook is configured) OR
- A basic Vitest render test using React Testing Library
