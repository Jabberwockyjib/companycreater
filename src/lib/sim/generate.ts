import { generatedScenarioSchema, scenarioInputSchema } from "@/lib/domain/schemas";
import type { CompanyProfile, GeneratedScenario, MonthlyRevenue, ScenarioInput } from "@/lib/domain/types";
import { buildCompanyProfile } from "./company";
import { generateCustomers } from "./customers";
import { generateOrders } from "./orders";
import { generateProducts } from "./products";
import { SeededRandom } from "./random";
import { generateOpportunities, generateSalesOrg } from "./sales";
import { generateSupply } from "./supply";
import { validateScenario } from "./validate";

const BOOKING_REALIZATION_MULTIPLIER = 1.5;

export interface GenerateScenarioOptions {
  researchProfile?: CompanyProfile;
}

export function generateScenario(
  input: ScenarioInput,
  options: GenerateScenarioOptions = {},
): GeneratedScenario {
  const parsedInput = scenarioInputSchema.parse(input);
  const random = new SeededRandom(parsedInput.seed);
  const baseProfile = buildCompanyProfile(parsedInput);
  const profile = options.researchProfile
    ? {
        ...baseProfile,
        claims: [
          ...options.researchProfile.claims,
          ...baseProfile.claims.filter(
            (claim) => !options.researchProfile?.claims.some((item) => item.id === claim.id),
          ),
        ],
      }
    : baseProfile;
  const { productFamilies, skus } = generateProducts(parsedInput, random, options.researchProfile);
  const { territories, salespeople } = generateSalesOrg(parsedInput, random);
  const { customers, contacts, lifecycleEvents } = generateCustomers(
    parsedInput,
    random,
    salespeople,
    territories,
  );
  const opportunities = generateOpportunities(parsedInput, random, customers, salespeople);
  const { orders, orderLineItems, invoices, monthlyRevenue } = generateOrders(
    {
      ...parsedInput,
      revenueTarget:
        parsedInput.revenueTarget * parsedInput.years * BOOKING_REALIZATION_MULTIPLIER,
    },
    random,
    customers,
    salespeople,
    skus,
    opportunities,
    lifecycleEvents,
  );
  const { supplyEvents, returns, rejections, credits } = generateSupply(
    parsedInput,
    random,
    skus,
    orders,
  );

  applyCredits(monthlyRevenue, credits.map((credit) => ({
    creditDate: credit.creditDate,
    amount: credit.amount,
  })));

  const scenario: GeneratedScenario = {
    metadata: {
      scenarioId: `scenario_${parsedInput.seed}_${slug(parsedInput.companyName)}`,
      generatedAt: "2026-04-24T00:00:00.000Z",
      seed: parsedInput.seed,
      mode: parsedInput.mode,
    },
    profile,
    tables: {
      productFamilies,
      skus,
      customers,
      contacts,
      salespeople,
      territories,
      opportunities,
      orders,
      orderLineItems,
      invoices,
      monthlyRevenue,
      supplyEvents,
      returns,
      rejections,
      credits,
      lifecycleEvents,
    },
    validations: [],
    assumptionsReport: [
      "Scenario input values are treated as user assumptions, including revenue target and operating scope.",
      "Private operating data, including customers, orders, supply events, returns, rejections, and credits, is synthetic.",
      buildChurnAssumption(parsedInput),
      "Revenue totals are approximate simulator outputs; formal validation is handled in a later task.",
    ],
  };

  scenario.validations = validateScenario(scenario, parsedInput);

  return generatedScenarioSchema.parse(scenario);
}

function buildChurnAssumption(input: ScenarioInput): string {
  if (input.churnRate === 0) {
    return "No customer loss events were generated because churnRate is 0.";
  }

  return "Lost customer lifecycle events were generated from churn assumptions.";
}

function applyCredits(
  monthlyRevenue: MonthlyRevenue[],
  credits: Array<{ creditDate: string; amount: number }>,
): void {
  for (const credit of credits) {
    const month = credit.creditDate.slice(0, 7);
    const row = monthlyRevenue.find((revenue) => revenue.month === month);

    if (!row) {
      throw new Error(`Credit ${credit.creditDate} falls outside generated monthly revenue horizon`);
    }

    row.creditedRevenue = Math.round((row.creditedRevenue + credit.amount) * 100) / 100;
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
