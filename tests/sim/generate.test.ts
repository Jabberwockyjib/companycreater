import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import { generateScenario } from "@/lib/sim/generate";

describe("generateScenario", () => {
  it("is deterministic for the same seed", () => {
    const first = generateScenario(defaultScenarioInput);
    const second = generateScenario(defaultScenarioInput);

    expect(first.metadata.scenarioId).toBe(second.metadata.scenarioId);
    expect(first.tables.customers[0]?.name).toBe(second.tables.customers[0]?.name);
    expect(first.tables.orders[0]?.total).toBe(second.tables.orders[0]?.total);
  });

  it("generates requested table sizes", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(scenario.tables.skus).toHaveLength(defaultScenarioInput.skuCount);
    expect(scenario.tables.customers).toHaveLength(defaultScenarioInput.customerCount);
    expect(scenario.tables.salespeople).toHaveLength(defaultScenarioInput.salesRepCount);
    expect(scenario.tables.orders.length).toBeGreaterThan(defaultScenarioInput.customerCount);
  });

  it("labels generated private operating data as synthetic", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(scenario.profile.claims.some((claim) => claim.sourceType === "synthetic")).toBe(true);
    expect(
      scenario.assumptionsReport.some((assumption) =>
        assumption.toLowerCase().includes("synthetic"),
      ),
    ).toBe(true);
  });

  it("creates explicit customer loss lifecycle events from churn assumptions", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(
      scenario.tables.lifecycleEvents.some((event) => event.eventType === "lost"),
    ).toBe(true);
  });

  it("does not create lost lifecycle events when churn rate is zero", () => {
    const scenario = generateScenario({ ...defaultScenarioInput, churnRate: 0 });
    const churnReport = scenario.assumptionsReport.find((assumption) =>
      assumption.toLowerCase().includes("churn"),
    );

    expect(scenario.tables.lifecycleEvents.some((event) => event.eventType === "lost")).toBe(
      false,
    );
    expect(churnReport?.toLowerCase()).toContain("no customer loss events");
    expect(churnReport?.toLowerCase()).toContain("churnrate is 0");
    expect(churnReport?.toLowerCase()).not.toContain("lost customer lifecycle events were generated");
  });

  it("does not create returns, rejections, or credits when adjustment rates are zero", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      returnsRate: 0,
      rejectionRate: 0,
    });

    expect(scenario.tables.returns).toHaveLength(0);
    expect(scenario.tables.rejections).toHaveLength(0);
    expect(scenario.tables.credits).toHaveLength(0);
  });

  it("returns a strict schema-valid generated scenario", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(() => generatedScenarioSchema.parse(scenario)).not.toThrow();
  });
});
