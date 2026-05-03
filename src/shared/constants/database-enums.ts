/**
 * Database Enums - Constants from database schema
 * These values come from the database and should NOT be hardcoded
 */

import { Constants } from "@/types/database";

// Account Types
export const ACCOUNT_TYPES = Constants.public.Enums.account_type.map((value) => ({
  value,
  label: value === "bank" ? "Cuenta bancaria" : "Inversión",
}));

// Import Status
export const IMPORT_STATUS = Constants.public.Enums.import_status.map((value) => ({
  value,
  label: {
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    failed: "Error",
  }[value],
}));

// Mortgage Status
export const MORTGAGE_STATUS = Constants.public.Enums.mortgage_status.map((value) => ({
  value,
  label: {
    active: "Activa",
    paid_off: "Pagada",
    refinanced: "Refinanciada",
  }[value],
}));

// Transaction Categories with Spanish labels
export const TRANSACTION_CATEGORIES = Constants.public.Enums.transaction_category.map((value) => ({
  value,
  label: {
    // Income
    salary: "Salario",
    freelance: "Freelance",
    investment_return: "Retorno inversión",
    other_income: "Otros ingresos",
    // Expenses
    groceries: "Alimentación",
    restaurants: "Restaurantes",
    transport: "Transporte",
    utilities: "Servicios",
    rent: "Alquiler",
    mortgage: "Hipoteca",
    insurance: "Seguros",
    healthcare: "Salud",
    entertainment: "Ocio",
    shopping: "Compras",
    education: "Educación",
    travel: "Viajes",
    savings: "Ahorros",
    investments: "Inversiones",
    taxes: "Impuestos",
    fees: "Comisiones",
    other_expense: "Otros gastos",
  }[value],
}));

// Transaction Categories by Type (for better UX)
export const INCOME_CATEGORIES = TRANSACTION_CATEGORIES.filter((cat) =>
  ["salary", "freelance", "investment_return", "other_income"].includes(cat.value)
);

export const EXPENSE_CATEGORIES = TRANSACTION_CATEGORIES.filter(
  (cat) => !["salary", "freelance", "investment_return", "other_income"].includes(cat.value)
);

// Transaction Types
export const TRANSACTION_TYPES = Constants.public.Enums.transaction_type.map((value) => ({
  value,
  label: {
    income: "Ingreso",
    expense: "Gasto",
    transfer: "Transferencia",
  }[value],
}));

// Helper functions
export function getCategoryLabel(value: string): string {
  return TRANSACTION_CATEGORIES.find((cat) => cat.value === value)?.label || value;
}

export function getMortgageStatusLabel(value: string): string {
  return MORTGAGE_STATUS.find((status) => status.value === value)?.label || value;
}

export function getAccountTypeLabel(value: string): string {
  return ACCOUNT_TYPES.find((type) => type.value === value)?.label || value;
}

export function getTransactionTypeLabel(value: string): string {
  return TRANSACTION_TYPES.find((type) => type.value === value)?.label || value;
}
