import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildExchangeRateMap,
  buildPositionLedger,
  calculateAnnualDividendIncomeCents,
  calculateUnrealizedPlPercent,
  convertCents,
  estimateDividendPaymentCents,
  isQuoteStale,
} from "@/lib/investments/calculations";
import type {
  DividendCalendarItem,
  InvestmentAccountSummary,
  InvestmentDistributionItem,
  InvestmentListItem,
  InvestmentOperationListItem,
  InvestmentSearchResult,
  InvestmentsOverviewResponse,
  InvestmentType,
  RealizedSaleItem,
} from "@/lib/investments/types";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

type InvestmentSelectRow = Database["public"]["Tables"]["investments"]["Row"] & {
  account: InvestmentAccountSummary | null;
};

type MarketCacheSelectRow = Pick<
  Database["public"]["Tables"]["market_cache"]["Row"],
  | "change_cents"
  | "change_percent"
  | "currency"
  | "data_source"
  | "price_cents"
  | "ticker"
  | "updated_at"
>;

type ExchangeRateSelectRow = Database["public"]["Tables"]["exchange_rates_cache"]["Row"];

type OperationSelectRow = Database["public"]["Tables"]["investment_operations"]["Row"] & {
  investment: {
    id: string;
    investment_type: InvestmentType;
    name: string;
    ticker: string;
  } | null;
};

const investmentSelect = `
  id,
  user_id,
  ticker,
  name,
  investment_type,
  currency,
  market,
  quantity,
  avg_purchase_price_cents,
  total_invested_cents,
  current_price_cents,
  current_value_cents,
  last_price_update,
  notes,
  is_active,
  created_at,
  updated_at,
  deleted_at,
  account_id,
  sector,
  annual_dividend_per_share_cents,
  next_dividend_date,
  dividend_frequency,
  daily_price_alert_threshold_percent,
  account:accounts(id,name,currency,color,icon)
`;

const operationSelect = `
  id,
  user_id,
  investment_id,
  operation_type,
  operation_date,
  quantity,
  price_cents,
  currency,
  fee_cents,
  withholding_cents,
  total_cents,
  notes,
  created_at,
  updated_at,
  deleted_at,
  investment:investments(id,name,ticker,investment_type)
`;

function sortDistribution(items: Map<string, number>) {
  return Array.from(items.entries())
    .map<InvestmentDistributionItem>(([label, valueCents]) => ({
      color: null,
      label,
      value_cents: valueCents,
    }))
    .sort((left, right) => right.value_cents - left.value_cents);
}

function dedupeSearchResults(results: InvestmentSearchResult[], limit: number) {
  const seen = new Set<string>();
  const unique: InvestmentSearchResult[] = [];

  for (const result of results) {
    if (seen.has(result.ticker)) {
      continue;
    }

    seen.add(result.ticker);
    unique.push(result);

    if (unique.length >= limit) {
      break;
    }
  }

  return unique;
}

export async function listInvestmentOperationsForYear({
  supabase,
  userId,
  year,
}: {
  supabase: ServerClient;
  userId: string;
  year: number;
}) {
  const { data, error } = await supabase
    .from("investment_operations")
    .select(operationSelect)
    .eq("user_id", userId)
    .gte("operation_date", `${year}-01-01`)
    .lte("operation_date", `${year}-12-31`)
    .is("deleted_at", null)
    .order("operation_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OperationSelectRow[];
}

export async function getInvestmentsOverview({
  irpfDisclaimer,
  supabase,
  userId,
  year = new Date().getFullYear(),
}: {
  irpfDisclaimer: string;
  supabase: ServerClient;
  userId: string;
  year?: number;
}): Promise<InvestmentsOverviewResponse> {
  const [
    profileResult,
    investmentsResult,
    allOperationsResult,
    yearOperationsResult,
    exchangeRatesResult,
    snapshotsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("investments")
      .select(investmentSelect)
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("investment_operations")
      .select(operationSelect)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("operation_date", { ascending: true })
      .order("created_at", { ascending: true }),
    listInvestmentOperationsForYear({ supabase, userId, year }),
    supabase.from("exchange_rates_cache").select("*"),
    supabase
      .from("investment_snapshots")
      .select("snapshot_date,total_value_cents,total_invested_cents,unrealized_pl_cents")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(90),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (investmentsResult.error) {
    throw new Error(investmentsResult.error.message);
  }

  if (allOperationsResult.error) {
    throw new Error(allOperationsResult.error.message);
  }

  if (exchangeRatesResult.error) {
    throw new Error(exchangeRatesResult.error.message);
  }

  if (snapshotsResult.error) {
    throw new Error(snapshotsResult.error.message);
  }

  const baseCurrency = profileResult.data?.currency ?? "EUR";
  const investments = (investmentsResult.data ?? []) as InvestmentSelectRow[];
  const operations = (allOperationsResult.data ?? []) as OperationSelectRow[];
  const yearOperations = yearOperationsResult;
  const exchangeRateMap = buildExchangeRateMap(
    (exchangeRatesResult.data ?? []) as ExchangeRateSelectRow[],
  );
  const snapshots = (snapshotsResult.data ?? []).reverse();

  const tickers = [...new Set(investments.map((investment) => investment.ticker))];
  const marketRows = tickers.length
    ? await supabase
        .from("market_cache")
        .select("ticker,price_cents,currency,change_cents,change_percent,data_source,updated_at")
        .in("ticker", tickers)
    : { data: [], error: null };

  if (marketRows.error) {
    throw new Error(marketRows.error.message);
  }

  const marketMap = new Map<string, MarketCacheSelectRow>();
  for (const row of (marketRows.data ?? []) as MarketCacheSelectRow[]) {
    marketMap.set(row.ticker, row);
  }

  const operationsByInvestment = new Map<string, OperationSelectRow[]>();
  for (const operation of operations) {
    if (!operationsByInvestment.has(operation.investment_id)) {
      operationsByInvestment.set(operation.investment_id, []);
    }

    operationsByInvestment.get(operation.investment_id)!.push(operation);
  }

  const currencyDistribution = new Map<string, number>();
  const typeDistribution = new Map<string, number>();
  const sectorDistribution = new Map<string, number>();
  const realizedSales: RealizedSaleItem[] = [];
  let totalValueCents = 0;
  let totalInvestedCents = 0;
  let realizedPlCents = 0;
  let annualDividendIncomeCents = 0;
  let dayChangeCents = 0;
  let staleQuotes = 0;
  let asOf: string | null = null;

  const positions = investments
    .map<InvestmentListItem>((investment) => {
      const investmentOperations = operationsByInvestment.get(investment.id) ?? [];
      const ledger = buildPositionLedger(
        investmentOperations.map((operation) => ({
          created_at: operation.created_at,
          id: operation.id,
          operation_date: operation.operation_date,
          operation_type: operation.operation_type,
          quantity: operation.quantity,
          total_cents: operation.total_cents,
        })),
      );
      const market = marketMap.get(investment.ticker) ?? null;
      const nativeCurrentValue = investment.current_value_cents ?? investment.total_invested_cents;
      const currentValueBase = convertCents({
        amountCents: nativeCurrentValue,
        fromCurrency: investment.currency,
        rates: exchangeRateMap,
        toCurrency: baseCurrency,
      });
      const totalInvestedBase = convertCents({
        amountCents: ledger.total_invested_cents,
        fromCurrency: investment.currency,
        rates: exchangeRateMap,
        toCurrency: baseCurrency,
      });
      const annualDividend = calculateAnnualDividendIncomeCents(
        ledger.quantity,
        investment.annual_dividend_per_share_cents,
      );
      const annualDividendBase = convertCents({
        amountCents: annualDividend,
        fromCurrency: investment.currency,
        rates: exchangeRateMap,
        toCurrency: baseCurrency,
      });
      const nextDividend = estimateDividendPaymentCents({
        annualDividendPerShareCents: investment.annual_dividend_per_share_cents,
        frequency: investment.dividend_frequency,
        quantity: ledger.quantity,
      });
      const realizedBase = convertCents({
        amountCents: ledger.realized_pl_cents,
        fromCurrency: investment.currency,
        rates: exchangeRateMap,
        toCurrency: baseCurrency,
      });
      const dayChangeBase = market?.change_cents
        ? convertCents({
            amountCents: Math.round(ledger.quantity * market.change_cents),
            fromCurrency: investment.currency,
            rates: exchangeRateMap,
            toCurrency: baseCurrency,
          })
        : 0;
      const quoteUpdatedAt = market?.updated_at ?? investment.last_price_update;
      const priceStale = isQuoteStale(quoteUpdatedAt);

      totalValueCents += currentValueBase;
      totalInvestedCents += totalInvestedBase;
      realizedPlCents += realizedBase;
      annualDividendIncomeCents += annualDividendBase;
      dayChangeCents += dayChangeBase;

      if (priceStale) {
        staleQuotes += 1;
      }

      if (!asOf || (quoteUpdatedAt && quoteUpdatedAt > asOf)) {
        asOf = quoteUpdatedAt ?? asOf;
      }

      currencyDistribution.set(
        investment.currency,
        (currencyDistribution.get(investment.currency) ?? 0) + currentValueBase,
      );
      typeDistribution.set(
        investment.investment_type,
        (typeDistribution.get(investment.investment_type) ?? 0) + currentValueBase,
      );
      sectorDistribution.set(
        investment.sector ?? "unassigned",
        (sectorDistribution.get(investment.sector ?? "unassigned") ?? 0) + currentValueBase,
      );

      for (const sale of ledger.sales) {
        realizedSales.push({
          cost_basis_cents: convertCents({
            amountCents: sale.cost_basis_cents,
            fromCurrency: investment.currency,
            rates: exchangeRateMap,
            toCurrency: baseCurrency,
          }),
          investment_id: investment.id,
          investment_name: investment.name,
          operation_date: sale.operation_date,
          operation_id: sale.operation_id,
          proceeds_cents: convertCents({
            amountCents: sale.proceeds_cents,
            fromCurrency: investment.currency,
            rates: exchangeRateMap,
            toCurrency: baseCurrency,
          }),
          quantity: sale.quantity,
          realized_pl_cents: convertCents({
            amountCents: sale.realized_pl_cents,
            fromCurrency: investment.currency,
            rates: exchangeRateMap,
            toCurrency: baseCurrency,
          }),
          ticker: investment.ticker,
        });
      }

      return {
        ...investment,
        account: investment.account,
        annual_dividend_income_cents: annualDividendBase,
        avg_purchase_price_cents: ledger.avg_purchase_price_cents,
        current_change_cents: market?.change_cents ?? null,
        current_change_percent: market?.change_percent ?? null,
        current_data_source: market?.data_source ?? null,
        current_source_updated_at: quoteUpdatedAt ?? null,
        current_value_base_cents: currentValueBase,
        estimated_next_dividend_cents: convertCents({
          amountCents: nextDividend,
          fromCurrency: investment.currency,
          rates: exchangeRateMap,
          toCurrency: baseCurrency,
        }),
        is_price_stale: priceStale,
        quantity: ledger.quantity,
        realized_pl_cents: convertCents({
          amountCents: ledger.realized_pl_cents,
          fromCurrency: investment.currency,
          rates: exchangeRateMap,
          toCurrency: baseCurrency,
        }),
        total_invested_base_cents: totalInvestedBase,
        total_invested_cents: ledger.total_invested_cents,
        unrealized_pl_cents: currentValueBase - totalInvestedBase,
        unrealized_pl_percent: calculateUnrealizedPlPercent(currentValueBase, totalInvestedBase),
      };
    })
    .sort((left, right) => right.current_value_base_cents - left.current_value_base_cents);

  const operationsList = operations
    .slice()
    .sort((left, right) => {
      if (left.operation_date !== right.operation_date) {
        return right.operation_date.localeCompare(left.operation_date);
      }

      return right.created_at.localeCompare(left.created_at);
    })
    .map<InvestmentOperationListItem>((operation) => {
      const investment = investments.find((item) => item.id === operation.investment_id);
      const matchingSale = realizedSales.find((sale) => sale.operation_id === operation.id);

      return {
        ...operation,
        investment: operation.investment ?? {
          id: investment?.id ?? operation.investment_id,
          investment_type: investment?.investment_type ?? "other",
          name: investment?.name ?? "Unknown",
          ticker: investment?.ticker ?? "—",
        },
        realized_pl_cents: matchingSale?.realized_pl_cents ?? null,
        total_cents: investment
          ? convertCents({
              amountCents: operation.total_cents,
              fromCurrency: investment.currency,
              rates: exchangeRateMap,
              toCurrency: baseCurrency,
            })
          : operation.total_cents,
      };
    });

  const yearDividendRows = yearOperations
    .filter((operation) => operation.operation_type === "dividend")
    .map<InvestmentOperationListItem>((operation) => {
      const investment = investments.find((item) => item.id === operation.investment_id);

      return {
        ...operation,
        investment: operation.investment ?? {
          id: investment?.id ?? operation.investment_id,
          investment_type: investment?.investment_type ?? "other",
          name: investment?.name ?? "Unknown",
          ticker: investment?.ticker ?? "—",
        },
        realized_pl_cents: null,
        total_cents: investment
          ? convertCents({
              amountCents: operation.total_cents,
              fromCurrency: investment.currency,
              rates: exchangeRateMap,
              toCurrency: baseCurrency,
            })
          : operation.total_cents,
        withholding_cents: investment
          ? convertCents({
              amountCents: operation.withholding_cents ?? 0,
              fromCurrency: investment.currency,
              rates: exchangeRateMap,
              toCurrency: baseCurrency,
            })
          : (operation.withholding_cents ?? 0),
      };
    });

  const irpfWithholdingCents = yearDividendRows.reduce(
    (sum, operation) => sum + (operation.withholding_cents ?? 0),
    0,
  );
  const irpfGrossDividendsCents = yearDividendRows.reduce(
    (sum, operation) => sum + operation.total_cents,
    0,
  );

  const dividendCalendar = positions
    .filter((position) => position.next_dividend_date)
    .map<DividendCalendarItem>((position) => ({
      account: position.account,
      annual_income_cents: position.annual_dividend_income_cents,
      estimated_payment_cents: position.estimated_next_dividend_cents,
      investment_id: position.id,
      name: position.name,
      next_dividend_date: position.next_dividend_date!,
      ticker: position.ticker,
    }))
    .sort((left, right) => left.next_dividend_date.localeCompare(right.next_dividend_date));

  const unrealizedPlCents = totalValueCents - totalInvestedCents;
  const previousCloseTotal = totalValueCents - dayChangeCents;

  return {
    as_of: asOf,
    base_currency: baseCurrency,
    dividend_calendar: dividendCalendar,
    distribution: {
      by_currency: sortDistribution(currencyDistribution),
      by_sector: sortDistribution(sectorDistribution),
      by_type: sortDistribution(typeDistribution),
    },
    evolution: snapshots,
    irpf: {
      disclaimer: irpfDisclaimer,
      dividends_received_cents: irpfGrossDividendsCents,
      net_dividends_cents: irpfGrossDividendsCents - irpfWithholdingCents,
      rows: yearDividendRows,
      withholding_cents: irpfWithholdingCents,
      year,
    },
    operations: operationsList.slice(0, 40),
    positions,
    realized_sales: realizedSales
      .sort((left, right) => right.operation_date.localeCompare(left.operation_date))
      .slice(0, 20),
    summary: {
      active_positions: positions.length,
      annual_dividend_income_cents: annualDividendIncomeCents,
      day_change_cents: dayChangeCents,
      day_change_percent:
        previousCloseTotal > 0
          ? Math.round((dayChangeCents / previousCloseTotal) * 1000) / 10
          : null,
      realized_pl_cents: realizedPlCents,
      stale_quotes: staleQuotes,
      total_invested_cents: totalInvestedCents,
      total_value_cents: totalValueCents,
      unrealized_pl_cents: unrealizedPlCents,
      unrealized_pl_percent: calculateUnrealizedPlPercent(totalValueCents, totalInvestedCents),
    },
  };
}

async function fetchTickerMatchesFromFmp(query: string, limit: number) {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return [];
  }

  const [symbolResponse, nameResponse] = await Promise.all([
    fetch(
      `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(query)}&apikey=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" },
    ),
    fetch(
      `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(query)}&apikey=${encodeURIComponent(apiKey)}`,
      { cache: "no-store" },
    ),
  ]);

  const [symbolJson, nameJson] = await Promise.all([
    symbolResponse.ok ? symbolResponse.json() : [],
    nameResponse.ok ? nameResponse.json() : [],
  ]);

  const normalized = [
    ...(Array.isArray(symbolJson) ? symbolJson : []),
    ...(Array.isArray(nameJson) ? nameJson : []),
  ]
    .map<InvestmentSearchResult | null>((row) => {
      if (!row?.symbol || !row?.name) {
        return null;
      }

      return {
        currency: row.currency ?? "USD",
        exchange: row.exchangeShortName ?? row.exchange ?? null,
        market_cap: typeof row.marketCap === "number" ? row.marketCap : null,
        name: row.name,
        ticker: row.symbol,
        type: row.type ?? null,
      };
    })
    .filter((row): row is InvestmentSearchResult => Boolean(row));

  return dedupeSearchResults(normalized, limit);
}

export async function searchInvestmentTickers({
  limit,
  query,
  supabase,
}: {
  limit: number;
  query: string;
  supabase: ServerClient;
}): Promise<InvestmentSearchResult[]> {
  const externalResults = await fetchTickerMatchesFromFmp(query, limit);
  if (externalResults.length > 0) {
    return externalResults;
  }

  const { data, error } = await supabase
    .from("market_cache")
    .select("ticker,name,currency,market,asset_type")
    .or(`ticker.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data ?? []) as Array<{
      asset_type: string;
      currency: string;
      market: string | null;
      name: string | null;
      ticker: string;
    }>
  ).map((row) => ({
    currency: row.currency,
    exchange: row.market,
    market_cap: null,
    name: row.name ?? row.ticker,
    ticker: row.ticker,
    type: row.asset_type,
  }));
}
