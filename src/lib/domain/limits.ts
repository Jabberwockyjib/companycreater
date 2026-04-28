export const SCENARIO_INPUT_LIMITS = {
  seed: { min: 1 },
  revenueTarget: { min: 25_000_000, max: 200_000_000 },
  historyYears: { min: 1, max: 5 },
  startYear: { min: 2018, max: 2026 },
  years: { min: 1, max: 6 },
  customerCount: { min: 20, max: 500 },
  skuCount: { min: 10, max: 1000 },
  salesRepCount: { min: 3, max: 80 },
  returnsRate: { min: 0, max: 0.2 },
  rejectionRate: { min: 0, max: 0.1 },
  churnRate: { min: 0, max: 0.3 },
} as const;

export const SCENARIO_LIMIT_LABELS = {
  revenueTarget: "$25M to $200M",
  historyYears: "1 to 5 years",
  customerCount: "20 to 500",
  skuCount: "10 to 1,000",
  salesRepCount: "3 to 80",
  returnsRate: "0% to 20%",
  rejectionRate: "0% to 10%",
  churnRate: "0% to 30%",
} as const;
