import type { Customer, Opportunity, Salesperson, ScenarioInput, Territory } from "@/lib/domain/types";
import type { SeededRandom } from "./random";
import { clampDate, getScenarioHorizon, monthAtOffset } from "./time";

const FIRST_NAMES = ["Alex", "Bailey", "Cameron", "Drew", "Elliot", "Francis", "Gale", "Hayden", "Jamie", "Kendall", "Logan", "Micah", "Quinn", "Reese"];
const LAST_NAMES = ["Anderson", "Brooks", "Campbell", "Davis", "Edwards", "Flores", "Garcia", "Hughes", "Kim", "Long", "Murphy", "Patel", "Rivera", "Young"];
const RAMP_STATUSES = ["ramping", "productive", "veteran"] as const;

export function generateSales(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
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

  const opportunities = generateOpportunities(input, random, customers, salespeople);

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
): Opportunity[] {
  const horizon = getScenarioHorizon(input);

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
      cycleDays: random.int(28, 180),
      closeReason:
        customer.accountStatus === "lost"
          ? "Won initial business before the customer later churned."
          : "Generated from synthetic pipeline assumptions.",
    };
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
