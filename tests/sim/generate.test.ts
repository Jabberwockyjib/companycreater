import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import type { GeneratedScenario } from "@/lib/domain/types";
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

  it("creates relative history through an as-of date without future-dated facts", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      historyYears: 2,
      asOfDate: "2026-04-28",
    });
    const datedValues = [
      ...scenario.tables.orders.map((order) => order.orderDate),
      ...scenario.tables.invoices.map((invoice) => invoice.invoiceDate),
      ...scenario.tables.payments.map((payment) => payment.paymentDate),
      ...scenario.tables.returns.map((record) => record.returnDate),
      ...scenario.tables.rejections.map((record) => record.rejectionDate),
      ...scenario.tables.credits.map((credit) => credit.creditDate),
      ...scenario.tables.supplyEvents.flatMap((event) => [event.startDate, event.endDate]),
      ...scenario.tables.lifecycleEvents.map((event) => event.eventDate),
      ...scenario.tables.opportunities.map((opportunity) => opportunity.closeDate),
    ];

    expect(scenario.metadata.asOfDate).toBe("2026-04-28");
    expect(scenario.metadata.historyStartDate).toBe("2024-04-28");
    expect(scenario.metadata.input?.historyYears).toBe(2);
    expect(scenario.tables.monthlyRevenue[0]?.month).toBe("2024-04");
    expect(scenario.tables.monthlyRevenue.at(-1)?.month).toBe("2026-04");
    expect(datedValues.every((date) => date <= "2026-04-28")).toBe(true);
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

  it("uses non-product AI research signals in generated customer and operating narratives", () => {
    const scenario = generateScenario(
      {
        ...defaultScenarioInput,
        mode: "real_company",
        customerCount: 32,
        skuCount: 36,
        disruptionLevel: "moderate",
      },
      {
        researchProfile: {
          companyName: "Cleveland Gear Company",
          industry: "Industrial Components",
          revenueTarget: defaultScenarioInput.revenueTarget,
          regions: defaultScenarioInput.regions,
          channels: defaultScenarioInput.channels,
          claims: [
            {
              id: "ai_market_1",
              field: "ai.markets",
              value: "AI extracted markets: Steel Production and Processing",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_channel_1",
              field: "ai.channels",
              value: "AI extracted channels: Distributors",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_geo_1",
              field: "ai.geographies",
              value: "AI extracted geographies: Cleveland, Ohio",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_launch_1",
              field: "ai.launches",
              value: "AI extracted launches: Redesigned Millennium Series Drives",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_buyer_1",
              field: "ai.buyerSegments",
              value: "AI extracted buyer segments: Maintenance Teams",
              sourceType: "inferred",
              confidence: 0.55,
            },
            {
              id: "ai_language_1",
              field: "ai.industryLanguage",
              value: "AI extracted industry language: Output Torque",
              sourceType: "inferred",
              confidence: 0.55,
            },
          ],
        },
      },
    );

    expect(scenario.tables.customers.some((customer) => customer.story.includes("Steel Production and Processing"))).toBe(
      true,
    );
    expect(scenario.tables.customers.some((customer) => customer.story.includes("Maintenance Teams"))).toBe(true);
    expect(scenario.tables.customers.some((customer) => customer.story.includes("Distributors"))).toBe(true);
    expect(scenario.tables.customers.some((customer) => customer.story.includes("Cleveland, Ohio"))).toBe(true);
    expect(
      scenario.tables.opportunities.some((opportunity) =>
        opportunity.closeReason.includes("Redesigned Millennium Series Drives"),
      ),
    ).toBe(true);
    expect(scenario.tables.supplyEvents.some((event) => event.narrative.includes("Output Torque"))).toBe(true);
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
      expect(returnRecord.quantity).toBeLessThanOrEqual(lineItem?.shippedQuantity ?? 0);
    }

    for (const rejection of scenario.tables.rejections) {
      const lineItem = lineItemsById.get(rejection.orderLineItemId);

      expect(lineItem).toBeDefined();
      expect(rejection.skuId).toBe(lineItem?.skuId);
      expect(rejection.quantity).toBeGreaterThan(0);
      expect(rejection.quantity).toBeLessThanOrEqual(lineItem?.shippedQuantity ?? 0);
    }
  });

  it("tracks line-level fulfillment quantities and SKU inventory positions", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(scenario.tables.inventoryPositions).toHaveLength(scenario.tables.skus.length);

    for (const lineItem of scenario.tables.orderLineItems) {
      expect(lineItem.allocatedQuantity).toBeGreaterThanOrEqual(0);
      expect(lineItem.shippedQuantity).toBeGreaterThanOrEqual(0);
      expect(lineItem.backorderedQuantity).toBeGreaterThanOrEqual(0);
      expect(lineItem.allocatedQuantity + lineItem.backorderedQuantity).toBe(lineItem.quantity);
      expect(lineItem.shippedQuantity).toBeLessThanOrEqual(lineItem.allocatedQuantity);
    }

    for (const inventoryPosition of scenario.tables.inventoryPositions) {
      expect(inventoryPosition.endingOnHand).toBeGreaterThanOrEqual(0);
      expect(
        inventoryPosition.startingOnHand +
          inventoryPosition.receivedQuantity -
          inventoryPosition.allocatedQuantity,
      ).toBe(inventoryPosition.endingOnHand);
    }
  });

  it("uses high disruption to create real backorders rather than status labels only", () => {
    const scenario = generateScenario({
      ...defaultScenarioInput,
      disruptionLevel: "high",
      customerCount: 80,
      skuCount: 16,
      years: 2,
    });
    const orderIdsWithBackorderedLines = new Set(
      scenario.tables.orderLineItems
        .filter((lineItem) => lineItem.backorderedQuantity > 0)
        .map((lineItem) => lineItem.orderId),
    );

    expect(orderIdsWithBackorderedLines.size).toBeGreaterThan(0);
    expect(
      scenario.tables.orders.some(
        (order) =>
          orderIdsWithBackorderedLines.has(order.id) &&
          (order.status === "partial" || order.status === "backordered"),
      ),
    ).toBe(true);
  });

  it("creates lumpy account revenue instead of evenly spreading sales across customers", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const revenueByCustomer = new Map<string, number>();

    for (const order of scenario.tables.orders) {
      revenueByCustomer.set(
        order.customerId,
        (revenueByCustomer.get(order.customerId) ?? 0) + order.total,
      );
    }

    const customerRevenue = [...revenueByCustomer.values()].sort((a, b) => b - a);
    const topCustomerCount = Math.max(1, Math.ceil(customerRevenue.length * 0.2));
    const topCustomerRevenue = customerRevenue
      .slice(0, topCustomerCount)
      .reduce((total, revenue) => total + revenue, 0);
    const totalRevenue = customerRevenue.reduce((total, revenue) => total + revenue, 0);

    expect(topCustomerRevenue / totalRevenue).toBeGreaterThan(0.5);
  });

  it("varies customer buying cadence by account size and risk", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const orderCountsByCustomer = new Map<string, number>();

    for (const order of scenario.tables.orders) {
      orderCountsByCustomer.set(
        order.customerId,
        (orderCountsByCustomer.get(order.customerId) ?? 0) + 1,
      );
    }

    const orderCounts = [...orderCountsByCustomer.values()].sort((a, b) => a - b);
    const p25 = orderCounts[Math.floor(orderCounts.length * 0.25)] ?? 0;
    const p90 = orderCounts[Math.floor(orderCounts.length * 0.9)] ?? 0;

    expect(p90).toBeGreaterThanOrEqual(p25 * 3);
  });

  it("keeps repeat customers concentrated around preferred product families", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const skusById = new Map(scenario.tables.skus.map((sku) => [sku.id, sku]));
    const orderById = new Map(scenario.tables.orders.map((order) => [order.id, order]));
    const familyCountsByCustomer = new Map<string, Map<string, number>>();

    for (const lineItem of scenario.tables.orderLineItems) {
      const order = orderById.get(lineItem.orderId);
      const sku = skusById.get(lineItem.skuId);

      if (!order || !sku) {
        continue;
      }

      const familyCounts = familyCountsByCustomer.get(order.customerId) ?? new Map<string, number>();
      familyCounts.set(sku.familyId, (familyCounts.get(sku.familyId) ?? 0) + 1);
      familyCountsByCustomer.set(order.customerId, familyCounts);
    }

    const repeatCustomers = [...familyCountsByCustomer.values()].filter((familyCounts) => {
      const lineCount = [...familyCounts.values()].reduce((total, count) => total + count, 0);
      const topFamilyCount = Math.max(...familyCounts.values());

      return lineCount >= 4 && topFamilyCount / lineCount >= 0.45;
    });

    expect(repeatCustomers.length).toBeGreaterThanOrEqual(
      Math.floor(familyCountsByCustomer.size * 0.6),
    );
  });

  it("shapes revenue direction from the scenario trajectory setting", () => {
    const growthScenario = generateScenario({
      ...defaultScenarioInput,
      seed: 9201,
      trajectory: "growth",
    });
    const declineScenario = generateScenario({
      ...defaultScenarioInput,
      seed: 9202,
      trajectory: "decline",
    });
    const breakoutScenario = generateScenario({
      ...defaultScenarioInput,
      seed: 9203,
      trajectory: "breakout",
    });

    expect(yearOverYearChange(growthScenario)).toBeGreaterThan(0.12);
    expect(yearOverYearChange(declineScenario)).toBeLessThan(-0.08);
    expect(yearOverYearChange(breakoutScenario)).toBeGreaterThan(0.3);
  });

  it("makes supply-constrained scenarios visibly operationally stressed", () => {
    const stableScenario = generateScenario({
      ...defaultScenarioInput,
      seed: 9301,
      trajectory: "stable",
      disruptionLevel: "moderate",
    });
    const constrainedScenario = generateScenario({
      ...defaultScenarioInput,
      seed: 9301,
      trajectory: "supply_constrained",
      disruptionLevel: "moderate",
    });

    expect(fillRate(constrainedScenario)).toBeLessThan(fillRate(stableScenario) - 0.1);
    expect(creditRate(constrainedScenario)).toBeGreaterThan(creditRate(stableScenario));
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

  it("generates invoice balances, payments, and collected revenue", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const paymentsByInvoice = new Map<string, number>();
    const collectedRevenueTotal = scenario.tables.monthlyRevenue.reduce(
      (total, revenue) => total + revenue.collectedRevenue,
      0,
    );
    const paymentTotal = scenario.tables.payments.reduce((total, payment) => {
      paymentsByInvoice.set(
        payment.invoiceId,
        Math.round(((paymentsByInvoice.get(payment.invoiceId) ?? 0) + payment.amount) * 100) / 100,
      );

      return total + payment.amount;
    }, 0);

    expect(scenario.tables.payments.length).toBeGreaterThan(0);
    expect(Math.round(collectedRevenueTotal * 100) / 100).toBe(
      Math.round(paymentTotal * 100) / 100,
    );

    for (const invoice of scenario.tables.invoices) {
      const paidAmount = paymentsByInvoice.get(invoice.id) ?? 0;

      expect(invoice.paymentTerms).toMatch(/^net_/);
      expect(Math.round((invoice.paidAmount + invoice.balanceDue) * 100) / 100).toBe(
        invoice.total,
      );
      expect(Math.round(paidAmount * 100) / 100).toBe(invoice.paidAmount);
      expect(invoice.balanceDue).toBeGreaterThanOrEqual(0);
    }
  });

  it("rolls ending AR balance forward from invoices, payments, and credits", () => {
    const scenario = generateScenario(defaultScenarioInput);
    let expectedBalance = 0;

    for (const revenue of scenario.tables.monthlyRevenue) {
      expectedBalance = Math.max(
        0,
        Math.round(
          (expectedBalance +
            revenue.invoicedRevenue -
            revenue.collectedRevenue -
            revenue.creditedRevenue) *
            100,
        ) / 100,
      );

      expect(revenue.endingArBalance).toBe(expectedBalance);
    }
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

function yearOverYearChange(scenario: GeneratedScenario): number {
  const annualRevenue = Array.from({ length: scenario.profile.revenueTarget ? 3 : 0 }, (_, index) =>
    scenario.tables.monthlyRevenue
      .slice(index * 12, index * 12 + 12)
      .reduce((total, revenue) => total + revenue.bookedRevenue, 0),
  );

  return (annualRevenue[2] ?? 0) / Math.max(1, annualRevenue[0] ?? 0) - 1;
}

function fillRate(scenario: GeneratedScenario): number {
  const shippedQuantity = scenario.tables.orderLineItems.reduce(
    (total, lineItem) => total + lineItem.shippedQuantity,
    0,
  );
  const orderedQuantity = scenario.tables.orderLineItems.reduce(
    (total, lineItem) => total + lineItem.quantity,
    0,
  );

  return shippedQuantity / Math.max(1, orderedQuantity);
}

function creditRate(scenario: GeneratedScenario): number {
  const bookedRevenue = scenario.tables.monthlyRevenue.reduce(
    (total, revenue) => total + revenue.bookedRevenue,
    0,
  );
  const creditedRevenue = scenario.tables.monthlyRevenue.reduce(
    (total, revenue) => total + revenue.creditedRevenue,
    0,
  );

  return creditedRevenue / Math.max(1, bookedRevenue);
}
