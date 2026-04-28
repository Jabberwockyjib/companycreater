import type {
  Contact,
  Customer,
  LifecycleEvent,
  Salesperson,
  ScenarioInput,
  Territory,
} from "@/lib/domain/types";
import type { SeededRandom } from "./random";
import { clampDate, getScenarioHorizon } from "./time";

const COMPANY_PREFIXES = ["Atlas", "Beacon", "Cobalt", "Delta", "Evergreen", "Frontier", "Granite", "Harbor", "Keystone", "Liberty", "Meridian", "Northstar"];
const COMPANY_SUFFIXES = ["Manufacturing", "Systems", "Fabrication", "Supply", "Industrial", "Works", "Technologies", "Logistics"];
const FIRST_NAMES = ["Avery", "Blake", "Casey", "Devon", "Emerson", "Finley", "Gray", "Harper", "Jordan", "Morgan", "Parker", "Riley", "Taylor"];
const LAST_NAMES = ["Adams", "Bennett", "Chen", "Diaz", "Evans", "Foster", "Gupta", "Hayes", "Ibrahim", "Jones", "Klein", "Lopez", "Morris"];
const SEGMENTS = ["enterprise", "mid_market", "commercial"] as const;
const RISKS = ["low", "medium", "high"] as const;
const CORE_CONTACT_ROLES = ["economic_buyer", "procurement", "operations"] as const;
const OPTIONAL_CONTACT_ROLES = ["technical_evaluator", "operations", "procurement"] as const;

export function generateCustomers(
  input: ScenarioInput,
  random: SeededRandom,
  salespeople: Salesperson[],
  territories: Territory[],
): {
  customers: Customer[];
  contacts: Contact[];
  lifecycleEvents: LifecycleEvent[];
} {
  const customers: Customer[] = [];
  const contacts: Contact[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  const horizon = getScenarioHorizon(input);
  const lostCount =
    input.churnRate === 0 ? 0 : Math.max(1, Math.floor(input.customerCount * input.churnRate));

  for (let index = 0; index < input.customerCount; index += 1) {
    const id = `customer_${index + 1}`;
    const name = `${random.pick(COMPANY_PREFIXES)} ${random.pick(COMPANY_SUFFIXES)} ${index + 1}`;
    const region = input.regions[index % input.regions.length] as string;
    const territory =
      territories.find((candidate) => candidate.region === region) ??
      (territories[index % territories.length] as Territory);
    const territorySalespeople = salespeople.filter(
      (salesperson) => salesperson.territoryId === territory.id,
    );
    const accountOwner =
      territorySalespeople[index % territorySalespeople.length] ??
      (salespeople[index % salespeople.length] as Salesperson);
    const accountStatus = index < lostCount ? "lost" : "active";
    const segment = random.pick(SEGMENTS);
    const annualPotential = segment === "enterprise" ? random.money(450000, 1800000) : segment === "mid_market" ? random.money(180000, 650000) : random.money(50000, 240000);

    customers.push({
      id,
      name,
      industry: input.industry,
      region,
      territoryId: territory.id,
      accountOwnerId: accountOwner.id,
      accountStatus,
      segment,
      annualPotential,
      story: `${name} buys ${input.industry.toLowerCase()} products through ${region}.`,
      riskProfile: index < lostCount ? "high" : random.pick(RISKS),
    });

    const contactRoles = buildContactRoles(segment, random);

    contactRoles.forEach((role, contactIndex) => {
      const contactName = `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`;

      contacts.push({
        id: `contact_${index + 1}_${contactIndex + 1}`,
        customerId: id,
        name: contactName,
        role,
        email: `${contactName.toLowerCase().replaceAll(" ", ".")}@customer${index + 1}.example.com`,
      });
    });

    lifecycleEvents.push(
      {
        id: `lifecycle_${index + 1}_lead`,
        customerId: id,
        eventDate: clampDate(
          `${horizon.startDate.slice(0, 7)}-${String((index % 27) + 1).padStart(2, "0")}`,
          horizon.asOfDate,
        ),
        eventType: "lead_created",
        narrative: `${name} entered the pipeline.`,
      },
      {
        id: `lifecycle_${index + 1}_onboarded`,
        customerId: id,
        eventDate: clampDate(
          addMonths(horizon.startDate, 1, String((index % 27) + 1).padStart(2, "0")),
          horizon.asOfDate,
        ),
        eventType: "onboarded",
        narrative: `${name} completed onboarding.`,
      },
    );

    if (index < lostCount) {
      lifecycleEvents.push({
        id: `lifecycle_${index + 1}_lost`,
        customerId: id,
        eventDate: clampDate(
          addMonths(horizon.startDate, Math.max(2, horizon.totalMonths - 2), String((index % 27) + 1).padStart(2, "0")),
          horizon.asOfDate,
        ),
        eventType: "lost",
        narrative: `${name} was marked lost based on churn assumptions.`,
      });
    }
  }

  return { customers, contacts, lifecycleEvents };
}

function addMonths(dateString: string, offset: number, day: string): string {
  const year = Number(dateString.slice(0, 4));
  const month = Number(dateString.slice(5, 7));
  const absoluteMonth = month - 1 + offset;
  const targetYear = year + Math.floor(absoluteMonth / 12);
  const targetMonth = (absoluteMonth % 12) + 1;

  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${day}`;
}

function buildContactRoles(
  segment: Customer["segment"],
  random: SeededRandom,
): Contact["role"][] {
  if (segment === "commercial") {
    return [...CORE_CONTACT_ROLES];
  }

  const optionalCount = segment === "enterprise" ? 2 : 1;
  const optionalRoles = Array.from({ length: optionalCount }, (_, index) =>
    OPTIONAL_CONTACT_ROLES[(index + random.int(0, OPTIONAL_CONTACT_ROLES.length - 1)) % OPTIONAL_CONTACT_ROLES.length],
  );

  return [...new Set<Contact["role"]>([...CORE_CONTACT_ROLES, ...optionalRoles])];
}
