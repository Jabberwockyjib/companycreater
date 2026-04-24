import type { Customer, Opportunity, Salesperson, ScenarioInput, Territory } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

const FIRST_NAMES = ["Alex", "Bailey", "Cameron", "Drew", "Elliot", "Francis", "Gale", "Hayden", "Jamie", "Kendall", "Logan", "Micah", "Quinn", "Reese"];
const LAST_NAMES = ["Anderson", "Brooks", "Campbell", "Davis", "Edwards", "Flores", "Garcia", "Hughes", "Kim", "Long", "Murphy", "Patel", "Rivera", "Young"];
const RAMP_STATUSES = ["ramping", "productive", "veteran"] as const;
const STAGES = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;

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

  const opportunities = customers.map((customer, index): Opportunity => {
    const salesperson = salespeople[index % salespeople.length] as Salesperson;
    const stage = index % 5 === 0 ? "closed_won" : index % 7 === 0 ? "closed_lost" : random.pick(STAGES);

    return {
      id: `opportunity_${index + 1}`,
      customerId: customer.id,
      salespersonId: salesperson.id,
      stage,
      expectedValue: round(customer.annualPotential * random.money(0.15, 0.55)),
      closeDate: `${input.startYear + random.int(0, input.years - 1)}-${String(random.int(1, 12)).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`,
      cycleDays: random.int(28, 180),
      closeReason: stage === "closed_lost" ? "Lost to timing or budget constraints." : "Generated from synthetic pipeline assumptions.",
    };
  });

  return { territories, salespeople, opportunities };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
