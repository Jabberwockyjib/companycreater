import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generateScenario } from "@/lib/sim/generate";
import { validateScenario } from "@/lib/sim/validate";

describe("validateScenario", () => {
  it("reconciles generated booked revenue within the MVP tolerance", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(validations.some((message) => message.code === "revenue_reconciled")).toBe(true);
    expect(validations.some((message) => message.severity === "error")).toBe(false);
  });

  it("reports order line items that reference missing orders", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orderLineItems[0].orderId = "missing_order";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) =>
          message.code === "missing_order_reference" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports orders that reference missing salespeople", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orders[0].salespersonId = "missing_salesperson";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) =>
          message.code === "missing_salesperson_reference" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports orders that do not use the customer account owner", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const alternateSalesperson = scenario.tables.salespeople.find(
      (salesperson) => salesperson.id !== scenario.tables.customers[0].accountOwnerId,
    );
    scenario.tables.orders[0].customerId = scenario.tables.customers[0].id;
    scenario.tables.orders[0].salespersonId = alternateSalesperson?.id ?? "missing_salesperson";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "order_account_owner_mismatch" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports invoices that reference missing orders", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.invoices[0].orderId = "missing_order";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "missing_invoice_order_reference" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports orders whose totals do not reconcile to line items and discounts", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orders[0].total += 1000;

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "order_total_mismatch" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports orders dated after a customer loss event", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const lostEvent = scenario.tables.lifecycleEvents.find((event) => event.eventType === "lost");

    if (!lostEvent) {
      throw new Error("Expected default scenario to include a lost customer");
    }

    const order = scenario.tables.orders.find((candidate) => candidate.customerId === lostEvent.customerId);

    if (!order) {
      throw new Error("Expected lost customer to have pre-loss order history");
    }

    order.orderDate = lostEvent.eventDate;

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "order_after_customer_loss" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports returns that reference a missing order line item", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.returns[0].orderLineItemId = "missing_line_item";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "missing_return_line_item_reference" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports credits that fall outside the monthly revenue horizon", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.credits[0].creditDate = "2099-01-01";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "missing_credit_month" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports order line fulfillment quantities that do not reconcile", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orderLineItems[0].backorderedQuantity += 1;

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) =>
          message.code === "line_fulfillment_quantity_mismatch" &&
          message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports return quantities above the shipped quantity for a line item", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const returnRecord = scenario.tables.returns[0];
    const lineItem = scenario.tables.orderLineItems.find(
      (candidate) => candidate.id === returnRecord.orderLineItemId,
    );

    if (!lineItem) {
      throw new Error("Expected return to reference a generated line item");
    }

    returnRecord.quantity = lineItem.shippedQuantity + 1;

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "return_line_item_mismatch" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports inventory positions that do not match SKU line fulfillment totals", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.inventoryPositions[0].allocatedQuantity += 1;

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) =>
          message.code === "inventory_line_quantity_mismatch" && message.severity === "error",
      ),
    ).toBe(true);
  });
});
