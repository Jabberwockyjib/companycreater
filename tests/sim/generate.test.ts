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
    expect(scenario.tables.contacts.length).toBeGreaterThan(defaultScenarioInput.customerCount);
    expect(scenario.tables.salespeople).toHaveLength(defaultScenarioInput.salesRepCount);
    expect(scenario.tables.orders.length).toBeGreaterThan(defaultScenarioInput.customerCount);
  });

  it("creates buyer group contacts for each customer", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const contactsByCustomer = new Map<string, Set<string>>();

    for (const contact of scenario.tables.contacts) {
      contactsByCustomer.set(
        contact.customerId,
        (contactsByCustomer.get(contact.customerId) ?? new Set()).add(contact.role),
      );
    }

    expect(contactsByCustomer.size).toBe(defaultScenarioInput.customerCount);
    expect(
      [...contactsByCustomer.values()].every(
        (roles) => roles.has("economic_buyer") && roles.has("procurement") && roles.size >= 3,
      ),
    ).toBe(true);
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

  it("grounds product families and SKU names in AI research product signals", () => {
    const scenario = generateScenario(
      { ...defaultScenarioInput, mode: "real_company", skuCount: 36 },
      {
        researchProfile: {
          companyName: "Cleveland Gear Company",
          industry: "Industrial Components",
          revenueTarget: defaultScenarioInput.revenueTarget,
          regions: defaultScenarioInput.regions,
          channels: defaultScenarioInput.channels,
          claims: [
            {
              id: "ai_product_1",
              field: "ai.productFamilies",
              value: "AI extracted product families: Worm Gears",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_product_2",
              field: "ai.productFamilies",
              value: "AI extracted product families: Speed Reducers",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_language_1",
              field: "ai.industryLanguage",
              value: "AI extracted industry language: Product Availability",
              sourceType: "inferred",
              confidence: 0.55,
            },
          ],
        },
      },
    );
    const familyNames = scenario.tables.productFamilies.map((family) => family.name);
    const skuNames = scenario.tables.skus.map((sku) => sku.name);

    expect(familyNames).toContain("Worm Gears");
    expect(familyNames).toContain("Speed Reducers");
    expect(skuNames.some((name) => name.startsWith("Worm Gears"))).toBe(true);
  });

  it("gives lost customers pre-loss orders and stops orders after the loss date", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      churnRate: 0.15,
      customerCount: 40,
      years: 3,
    });
    const lostEventsByCustomer = new Map(
      scenario.tables.lifecycleEvents
        .filter((event) => event.eventType === "lost")
        .map((event) => [event.customerId, event]),
    );

    expect(lostEventsByCustomer.size).toBeGreaterThan(0);

    for (const [customerId, lostEvent] of lostEventsByCustomer) {
      const customerOrders = scenario.tables.orders.filter((order) => order.customerId === customerId);

      expect(customerOrders.length).toBeGreaterThan(0);
      expect(customerOrders.every((order) => order.orderDate < lostEvent.eventDate)).toBe(true);
    }
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

  it("ties returns and rejections to specific order line items and SKUs", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      returnsRate: 0.12,
      rejectionRate: 0.08,
    });
    const lineItemsById = new Map(
      scenario.tables.orderLineItems.map((lineItem) => [lineItem.id, lineItem]),
    );

    expect(scenario.tables.returns.length).toBeGreaterThan(0);
    expect(scenario.tables.rejections.length).toBeGreaterThan(0);

    for (const returnRecord of scenario.tables.returns) {
      const lineItem = lineItemsById.get(returnRecord.orderLineItemId);

      expect(lineItem).toBeDefined();
      expect(returnRecord.skuId).toBe(lineItem?.skuId);
      expect(returnRecord.quantity).toBeGreaterThan(0);
      expect(returnRecord.quantity).toBeLessThanOrEqual(lineItem?.quantity ?? 0);
    }

    for (const rejection of scenario.tables.rejections) {
      const lineItem = lineItemsById.get(rejection.orderLineItemId);

      expect(lineItem).toBeDefined();
      expect(rejection.skuId).toBe(lineItem?.skuId);
      expect(rejection.quantity).toBeGreaterThan(0);
      expect(rejection.quantity).toBeLessThanOrEqual(lineItem?.quantity ?? 0);
    }
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
