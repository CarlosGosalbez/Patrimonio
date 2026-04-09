/**
 * Financial Interest Calculations for Patrimio
 * All amounts in integer cents (850.75€ = 85075)
 */

export type CapitalizationPeriod = "monthly" | "quarterly" | "annual";

export interface CompoundInterestResult {
  finalBalanceCents: number;
  interestEarnedCents: number;
  monthlyBreakdown: Array<{
    month: number;
    startBalanceCents: number;
    interestCents: number;
    endBalanceCents: number;
  }>;
}

/**
 * Calculate compound interest using the formula: A = P * (1 + r/n)^(n*t)
 *
 * @param principalCents Initial balance in cents
 * @param annualRate Annual interest rate as decimal (0.05 = 5%)
 * @param periodMonths Total period in months
 * @param capitalization 'monthly' | 'quarterly' | 'annual'
 * @returns Object with finalBalanceCents, interestEarnedCents, and monthlyBreakdown
 *
 * @example
 * // Calculate 5% annual interest on 1000€ over 12 months, compounded monthly
 * const result = calculateCompoundInterest(100000, 0.05, 12, 'monthly');
 * // result.finalBalanceCents ≈ 105116 (1051.16€)
 * // result.interestEarnedCents ≈ 5116 (51.16€)
 */
export function calculateCompoundInterest(
  principalCents: number,
  annualRate: number,
  periodMonths: number,
  capitalization: CapitalizationPeriod,
): CompoundInterestResult {
  // Input validations
  if (principalCents <= 0) {
    throw new Error("Principal must be positive");
  }
  if (annualRate < 0 || annualRate > 1) {
    throw new Error("Annual rate must be between 0 and 1");
  }
  if (periodMonths <= 0) {
    throw new Error("Period must be positive");
  }

  // Convert capitalization to n (periods per year)
  const n = capitalization === "monthly" ? 12 : capitalization === "quarterly" ? 4 : 1;
  const t = periodMonths / 12; // years

  // Compound interest formula: A = P * (1 + r/n)^(n*t)
  const finalBalanceCents = Math.round(principalCents * Math.pow(1 + annualRate / n, n * t));
  const interestEarnedCents = finalBalanceCents - principalCents;

  // Generate monthly breakdown
  const monthlyBreakdown: CompoundInterestResult["monthlyBreakdown"] = [];
  let currentBalance = principalCents;

  for (let month = 1; month <= periodMonths; month++) {
    const startBalance = currentBalance;
    // Calculate interest for this month based on the capitalization period
    const monthlyInterest = Math.round(startBalance * (Math.pow(1 + annualRate / n, n / 12) - 1));
    currentBalance = startBalance + monthlyInterest;

    monthlyBreakdown.push({
      month,
      startBalanceCents: startBalance,
      interestCents: monthlyInterest,
      endBalanceCents: currentBalance,
    });
  }

  return {
    finalBalanceCents,
    interestEarnedCents,
    monthlyBreakdown,
  };
}
