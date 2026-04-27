import { describe, expect, it } from "vitest";
import { scenarioInputSchema, generatedScenarioSchema } from "@/lib/domain/schemas";
import { defaultScenarioInput } from "@/lib/domain/defaults";

const createGeneratedScenario = () => ({
  metadata: {
    scenarioId: "scenario_test",
    generatedAt: "2026-04-23T00:00:00.000Z",
    seed: 42,
    mode: "fictional",
  },
  profile: {
    companyName: "Acme Industrial Components",
    industry: "Industrial Components",
    revenueTarget: 75000000,
    regions: ["Northeast", "Midwest"],
    channels: ["direct", "distributor"],
    claims: [],
  },
  tables: {
    productFamilies: [],
    skus: [],
    customers: [],
    contacts: [],
    salespeople: [],
    territories: [],
    opportunities: [],
    orders: [],
    orderLineItems: [],
    inventoryPositions: [],
    invoices: [],
    payments: [],
    monthlyRevenue: [],
    supplyEvents: [],
    returns: [],
    rejections: [],
    credits: [],
    lifecycleEvents: [],
  },
  validations: [],
  assumptionsReport: [],
});

describe("domain schemas", () => {
  it("accepts the default scenario input", () => {
    const parsed = scenarioInputSchema.parse(defaultScenarioInput);
    expect(parsed.revenueTarget).toBe(75000000);
    expect(parsed.mode).toBe("fictional");
  });

  it("rejects revenue targets outside the MVP band", () => {
    expect(() =>
      scenarioInputSchema.parse({ ...defaultScenarioInput, revenueTarget: 1000000 }),
    ).toThrow();
  });

  it("accepts an empty but structurally valid generated scenario", () => {
    const parsed = generatedScenarioSchema.parse(createGeneratedScenario());
    expect(parsed.profile.companyName).toBe("Acme Industrial Components");
  });

  it("rejects monthly revenue rows missing booked revenue", () => {
    const scenario = createGeneratedScenario();
    const malformedScenario = {
      ...scenario,
      tables: {
        ...scenario.tables,
        monthlyRevenue: [
          {
            month: "2023-01",
            invoicedRevenue: 100000,
            creditedRevenue: 5000,
          },
        ],
      },
    };

    expect(() => generatedScenarioSchema.parse(malformedScenario)).toThrow();
  });

  it("rejects order rows with invalid status", () => {
    const scenario = createGeneratedScenario();
    const malformedScenario = {
      ...scenario,
      tables: {
        ...scenario.tables,
        orders: [
          {
            id: "order_1",
            customerId: "customer_1",
            salespersonId: "salesperson_1",
            orderDate: "2023-01-15",
            status: "shipped",
            subtotal: 100000,
            discountAmount: 5000,
            total: 95000,
          },
        ],
      },
    };

    expect(() => generatedScenarioSchema.parse(malformedScenario)).toThrow();
  });

  it("rejects return rows missing credit amount", () => {
    const scenario = createGeneratedScenario();
    const malformedScenario = {
      ...scenario,
      tables: {
        ...scenario.tables,
        returns: [
          {
            id: "return_1",
            orderId: "order_1",
            customerId: "customer_1",
            reason: "damaged",
            returnDate: "2023-02-01",
          },
        ],
      },
    };

    expect(() => generatedScenarioSchema.parse(malformedScenario)).toThrow();
  });
});
