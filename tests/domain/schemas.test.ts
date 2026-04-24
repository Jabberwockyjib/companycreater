import { describe, expect, it } from "vitest";
import { scenarioInputSchema, generatedScenarioSchema } from "@/lib/domain/schemas";
import { defaultScenarioInput } from "@/lib/domain/defaults";

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
    const parsed = generatedScenarioSchema.parse({
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
        invoices: [],
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
    expect(parsed.profile.companyName).toBe("Acme Industrial Components");
  });
});
