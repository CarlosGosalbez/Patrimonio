import type { FrequencyType } from "@/lib/investments/types";

export interface ExchangeRateRowLike {
  base_currency: string;
  quote_currency: string;
  rate_value: number;
}

export interface LedgerOperationInput {
  created_at: string;
  id: string;
  operation_date: string;
  operation_type: "buy" | "dividend" | "fee" | "sell" | "split" | "transfer_in" | "transfer_out";
  quantity: number;
  total_cents: number;
}

export interface LedgerSaleResult {
  cost_basis_cents: number;
  operation_date: string;
  operation_id: string;
  proceeds_cents: number;
  quantity: number;
  realized_pl_cents: number;
}

export interface PositionLedgerResult {
  avg_purchase_price_cents: number;
  dividend_income_cents: number;
  quantity: number;
  realized_pl_cents: number;
  sales: LedgerSaleResult[];
  total_invested_cents: number;
}

function normalizeNumberInput(input: string) {
  const trimmed = input.trim().replace(/\s/g, "");

  if (!trimmed) {
    throw new Error("Invalid number format");
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex === -1) {
    if (!/^\d+$/.test(trimmed)) {
      throw new Error("Invalid number format");
    }

    return trimmed;
  }

  const integerPart = trimmed.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimalPart = trimmed.slice(decimalIndex + 1);

  if (!/^\d+$/.test(integerPart) || !/^\d{1,8}$/.test(decimalPart)) {
    throw new Error("Invalid number format");
  }

  return `${integerPart}.${decimalPart}`;
}

export function parseQuantityInput(input: string) {
  const normalized = normalizeNumberInput(input);
  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid quantity");
  }

  return roundQuantity(value);
}

export function roundQuantity(value: number) {
  return Math.round(value * 100_000_000) / 100_000_000;
}

export function calculateOperationTotalCents({
  feeCents,
  operationType,
  priceCents,
  quantity,
}: {
  feeCents: number;
  operationType: LedgerOperationInput["operation_type"];
  priceCents: number;
  quantity: number;
}) {
  if (operationType === "split") {
    return 0;
  }

  const grossAmount = Math.round(quantity * priceCents);

  switch (operationType) {
    case "buy":
    case "transfer_in":
      return grossAmount + feeCents;
    case "dividend":
    case "sell":
    case "transfer_out":
      return Math.max(grossAmount - feeCents, 0);
    case "fee":
      return feeCents;
  }
}

export function buildExchangeRateMap(rows: ExchangeRateRowLike[]) {
  const map = new Map<string, number>();

  for (const row of rows) {
    map.set(
      `${row.base_currency.toUpperCase()}:${row.quote_currency.toUpperCase()}`,
      row.rate_value,
    );
  }

  return map;
}

export function convertCents({
  amountCents,
  fromCurrency,
  rates,
  toCurrency,
}: {
  amountCents: number;
  fromCurrency: string;
  rates: Map<string, number>;
  toCurrency: string;
}) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return amountCents;
  }

  const direct = rates.get(`${from}:${to}`);
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.round(amountCents * direct);
  }

  const inverse = rates.get(`${to}:${from}`);
  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse !== 0) {
    return Math.round(amountCents / inverse);
  }

  return amountCents;
}

export function buildPositionLedger(operations: LedgerOperationInput[]): PositionLedgerResult {
  const ordered = [...operations].sort((left, right) => {
    if (left.operation_date !== right.operation_date) {
      return left.operation_date.localeCompare(right.operation_date);
    }

    if (left.created_at !== right.created_at) {
      return left.created_at.localeCompare(right.created_at);
    }

    return left.id.localeCompare(right.id);
  });

  let quantity = 0;
  let totalInvestedCents = 0;
  let realizedPlCents = 0;
  let dividendIncomeCents = 0;
  const sales: LedgerSaleResult[] = [];

  for (const operation of ordered) {
    switch (operation.operation_type) {
      case "buy":
      case "transfer_in":
        quantity = roundQuantity(quantity + operation.quantity);
        totalInvestedCents += operation.total_cents;
        break;
      case "sell":
      case "transfer_out": {
        if (quantity <= 0) {
          break;
        }

        const averageCostPerUnit = totalInvestedCents / quantity;
        const costBasisCents = Math.round(averageCostPerUnit * operation.quantity);
        const safeQuantity = Math.min(operation.quantity, quantity);

        quantity = roundQuantity(Math.max(quantity - safeQuantity, 0));
        totalInvestedCents = Math.max(totalInvestedCents - costBasisCents, 0);

        const realized = operation.total_cents - costBasisCents;
        realizedPlCents += realized;

        if (operation.operation_type === "sell") {
          sales.push({
            cost_basis_cents: costBasisCents,
            operation_date: operation.operation_date,
            operation_id: operation.id,
            proceeds_cents: operation.total_cents,
            quantity: safeQuantity,
            realized_pl_cents: realized,
          });
        }
        break;
      }
      case "split":
        if (operation.quantity > 0 && quantity > 0) {
          quantity = roundQuantity(quantity * operation.quantity);
        }
        break;
      case "dividend":
        dividendIncomeCents += operation.total_cents;
        break;
      case "fee":
        realizedPlCents -= operation.total_cents;
        break;
    }
  }

  return {
    avg_purchase_price_cents: quantity > 0 ? Math.round(totalInvestedCents / quantity) : 0,
    dividend_income_cents: dividendIncomeCents,
    quantity,
    realized_pl_cents: realizedPlCents,
    sales,
    total_invested_cents: totalInvestedCents,
  };
}

export function calculateUnrealizedPlPercent(
  currentValueCentsOrInput:
    | number
    | {
        currentValueCents: number;
        totalInvestedCents: number;
      },
  totalInvestedCents?: number,
) {
  const currentValueCents =
    typeof currentValueCentsOrInput === "number"
      ? currentValueCentsOrInput
      : currentValueCentsOrInput.currentValueCents;
  const investedCents =
    typeof currentValueCentsOrInput === "number"
      ? (totalInvestedCents ?? 0)
      : currentValueCentsOrInput.totalInvestedCents;

  if (investedCents <= 0) {
    return null;
  }

  return Math.round(((currentValueCents - investedCents) / investedCents) * 1000) / 10;
}

export function calculateAnnualDividendIncomeCents(
  quantity: number,
  annualDividendPerShareCents: number,
) {
  if (quantity <= 0 || annualDividendPerShareCents <= 0) {
    return 0;
  }

  return Math.round(quantity * annualDividendPerShareCents);
}

export function estimateDividendPaymentCents({
  annualDividendPerShareCents,
  frequency,
  quantity,
}: {
  annualDividendPerShareCents: number;
  frequency: FrequencyType;
  quantity: number;
}) {
  if (quantity <= 0 || annualDividendPerShareCents <= 0) {
    return 0;
  }

  const paymentsPerYear =
    frequency === "monthly"
      ? 12
      : frequency === "quarterly"
        ? 4
        : frequency === "semiannual"
          ? 2
          : 1;

  return Math.round((quantity * annualDividendPerShareCents) / paymentsPerYear);
}

export function isQuoteStale(updatedAt: string | null, thresholdMinutes = 30) {
  if (!updatedAt) {
    return true;
  }

  const diffMs = Date.now() - new Date(updatedAt).getTime();
  return diffMs / 60_000 > thresholdMinutes;
}

export function resolveFxRate({
  fromCurrency,
  fxMap,
  toCurrency,
}: {
  fromCurrency: string;
  fxMap: Map<string, number>;
  toCurrency: string;
}) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return 1;
  }

  const direct = fxMap.get(`${from}:${to}`);
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return direct;
  }

  const inverse = fxMap.get(`${to}:${from}`);
  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse !== 0) {
    return 1 / inverse;
  }

  return 1;
}

export function convertCentsWithFx({
  amountCents,
  fxRate,
}: {
  amountCents: number;
  fxRate: number;
}) {
  return Math.round(amountCents * fxRate);
}

export const parseUnitsInput = parseQuantityInput;
export const buildOperationTotalCents = calculateOperationTotalCents;
export const estimateDividendAmountCents = estimateDividendPaymentCents;

export function buildFxRateMap(
  rows: Array<ExchangeRateRowLike | (Omit<ExchangeRateRowLike, "rate_value"> & { rate: number })>,
) {
  return buildExchangeRateMap(
    rows.map((row) => ({
      base_currency: row.base_currency,
      quote_currency: row.quote_currency,
      rate_value: "rate_value" in row ? row.rate_value : row.rate,
    })),
  );
}
