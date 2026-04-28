import type { CompanyProfile, Customer, Opportunity, Salesperson, ScenarioInput, Territory } from "@/lib/domain/types";
import type { SeededRandom } from "./random";
import { buildResearchContext, pickResearchSignal } from "./research-context";
import { clampDate, getScenarioHorizon, monthAtOffset } from "./time";

const FIRST_NAMES = ["Alex", "Bailey", "Cameron", "Drew", "Elliot", "Francis", "Gale", "Hayden", "Jamie", "Kendall", "Logan", "Micah", "Quinn", "Reese"];
const LAST_NAMES = ["Anderson", "Brooks", "Campbell", "Davis", "Edwards", "Flores", "Garcia", "Hughes", "Kim", "Long", "Murphy", "Patel", "Rivera", "Young"];
const RAMP_STATUSES = ["ramping", "productive", "veteran"] as const;

export function generateSales(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
  profile?: CompanyProfile,
): {
  territories: Territory[];
  salespeople: Salesperson[];
  opportunities: Opportunity[];
} {
  const territories = input.regions.map((region, index): Territory => ({
    id: `territory_${index + 1}`,
    name: `${region} Territory`,
    region,
  }));

  const annualQuota = input.revenueTarget / Math.max(1, input.salesRepCount);
  const salespeople = Array.from({ length: input.salesRepCount }, (_, index): Salesperson => ({
    id: `salesperson_${index + 1}`,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[random.int(0, LAST_NAMES.length - 1)]}`,
    territoryId: (territories[index % territories.length] as Territory).id,
    quota: round(annualQuota * random.money(0.75, 1.25)),
    tenureMonths: random.int(3, 132),
    rampStatus: index < Math.ceil(input.salesRepCount * 0.2) ? "ramping" : random.pick(RAMP_STATUSES),
  }));

  const opportunities = generateOpportunities(input, random, customers, salespeople, profile);

  return { territories, salespeople, opportunities };
}

export function generateSalesOrg(
  input: ScenarioInput,
  random: SeededRandom,
): {
  territories: Territory[];
  salespeople: Salesperson[];
} {
  const territories = input.regions.map((region, index): Territory => ({
    id: `territory_${index + 1}`,
    name: `${region} Territory`,
    region,
  }));

  const annualQuota = input.revenueTarget / Math.max(1, input.salesRepCount);
  const salespeople = Array.from({ length: input.salesRepCount }, (_, index): Salesperson => ({
    id: `salesperson_${index + 1}`,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[random.int(0, LAST_NAMES.length - 1)]}`,
    territoryId: (territories[index % territories.length] as Territory).id,
    quota: round(annualQuota * random.money(0.75, 1.25)),
    tenureMonths: random.int(3, 132),
    rampStatus: index < Math.ceil(input.salesRepCount * 0.2) ? "ramping" : random.pick(RAMP_STATUSES),
  }));

  return { territories, salespeople };
}

export function generateOpportunities(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
  salespeople: Salesperson[],
  profile?: CompanyProfile,
): Opportunity[] {
  const horizon = getScenarioHorizon(input);
  const researchContext = buildResearchContext(profile);

  return customers.map((customer, index): Opportunity => {
    const salesperson =
      salespeople.find((candidate) => candidate.id === customer.accountOwnerId) ??
      (salespeople[index % salespeople.length] as Salesperson);
    const stage = "closed_won";

    const closeMonth = monthAtOffset(input, random.int(0, Math.max(0, horizon.totalMonths - 1)));
    const closeDate = clampDate(
      `${closeMonth.monthKey}-${String(random.int(1, 28)).padStart(2, "0")}`,
      horizon.asOfDate,
    );

    return {
      id: `opportunity_${index + 1}`,
      customerId: customer.id,
      salespersonId: salesperson.id,
      stage,
      expectedValue: round(customer.annualPotential * random.money(0.15, 0.55)),
      closeDate,
      cycleDays: buildCycleDays(random, researchContext.buyerSegments),
      closeReason: buildCloseReason(customer, index, researchContext),
    };
  });
}

function buildCycleDays(random: SeededRandom, buyerSegments: string[]): number {
  const hasTechnicalBuyer = buyerSegments.some((segment) =>
    /engineering|designer|technical|maintenance|plant|operation/i.test(segment),
  );

  return hasTechnicalBuyer ? random.int(55, 210) : random.int(28, 180);
}

function buildCloseReason(
  customer: Customer,
  index: number,
  researchContext: ReturnType<typeof buildResearchContext>,
): string {
  const market = pickResearchSignal(researchContext.markets, index);
  const buyer = pickResearchSignal(researchContext.buyerSegments, index);
  const launch = pickResearchSignal(researchContext.launches, index);
  const language = pickResearchSignal(researchContext.industryLanguage, index);

  if (!market && !buyer && !launch && !language) {
    return customer.accountStatus === "lost"
      ? "Won initial business before the customer later churned."
      : "Generated from synthetic pipeline assumptions.";
  }

  const demandDriver = launch ?? language ?? "researched public demand signals";
  const buyerText = buyer ? ` for ${buyer}` : "";
  const marketText = market ? ` in ${market}` : "";
  const lossText = customer.accountStatus === "lost" ? " before the customer later churned" : "";

  return `Won based on ${demandDriver}${buyerText}${marketText}${lossText}.`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
