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

  it("assigns every customer to a valid account owner and keeps orders with that owner", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const salespersonIds = new Set(scenario.tables.salespeople.map((salesperson) => salesperson.id));
    const territoryIds = new Set(scenario.tables.territories.map((territory) => territory.id));
    const customersById = new Map(
      scenario.tables.customers.map((customer) => [customer.id, customer]),
    );

    expect(scenario.tables.customers.every((customer) => salespersonIds.has(customer.accountOwnerId))).toBe(
      true,
    );
    expect(scenario.tables.customers.every((customer) => territoryIds.has(customer.territoryId))).toBe(
      true,
    );
    expect(
      scenario.tables.orders.every((order) => {
        const customer = customersById.get(order.customerId);

        return customer?.accountOwnerId === order.salespersonId;
      }),
    ).toBe(true);
  });

  it("ties every order to a closed-won opportunity for the same customer and salesperson", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const opportunitiesById = new Map(
      scenario.tables.opportunities.map((opportunity) => [opportunity.id, opportunity]),
    );

    expect(
      scenario.tables.orders.every((order) => {
        const opportunity = opportunitiesById.get(order.opportunityId);

        return (
          opportunity?.stage === "closed_won" &&
          opportunity.customerId === order.customerId &&
          opportunity.salespersonId === order.salespersonId
        );
      }),
    ).toBe(true);
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

  it("keeps every credit within the monthly revenue horizon", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const revenueMonths = new Set(scenario.tables.monthlyRevenue.map((row) => row.month));
    const creditMonths = scenario.tables.credits.map((credit) => credit.creditDate.slice(0, 7));
    const creditTotal = scenario.tables.credits.reduce((total, credit) => total + credit.amount, 0);
    const creditedRevenueTotal = scenario.tables.monthlyRevenue.reduce(
      (total, revenue) => total + revenue.creditedRevenue,
      0,
    );

    expect(creditMonths.length).toBeGreaterThan(0);
    expect(creditMonths.every((month) => revenueMonths.has(month))).toBe(true);
    expect(Math.round(creditedRevenueTotal * 100) / 100).toBe(
      Math.round(creditTotal * 100) / 100,
    );
  });

  it("does not drop credits when late-horizon orders receive adjustments", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      years: 1,
      returnsRate: 0.2,
      rejectionRate: 0.1,
    });
    const revenueMonths = new Set(scenario.tables.monthlyRevenue.map((row) => row.month));
    const creditTotal = scenario.tables.credits.reduce((total, credit) => total + credit.amount, 0);
    const creditedRevenueTotal = scenario.tables.monthlyRevenue.reduce(
      (total, revenue) => total + revenue.creditedRevenue,
      0,
    );

    expect(
      scenario.tables.credits.every((credit) => revenueMonths.has(credit.creditDate.slice(0, 7))),
    ).toBe(true);
    expect(Math.round(creditedRevenueTotal * 100) / 100).toBe(
      Math.round(creditTotal * 100) / 100,
    );
  });

  it("returns a strict schema-valid generated scenario", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(() => generatedScenarioSchema.parse(scenario)).not.toThrow();
  });
});
