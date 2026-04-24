import type { GeneratedScenario, ScenarioInput, ValidationMessage } from "@/lib/domain/types";

export function validateScenario(
  scenario: GeneratedScenario,
  input: ScenarioInput,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const orderIds = new Set(scenario.tables.orders.map((order) => order.id));
  const skuIds = new Set(scenario.tables.skus.map((sku) => sku.id));
  const customerIds = new Set(scenario.tables.customers.map((customer) => customer.id));
  const revenueMonths = new Set(scenario.tables.monthlyRevenue.map((revenue) => revenue.month));

  validateRevenue(messages, scenario, input);

  for (const lineItem of scenario.tables.orderLineItems) {
    if (!orderIds.has(lineItem.orderId)) {
      messages.push({
        code: "missing_order_reference",
        severity: "error",
        message: `Order line item ${lineItem.id} references missing order ${lineItem.orderId}.`,
      });
    }

    if (!skuIds.has(lineItem.skuId)) {
      messages.push({
        code: "missing_sku_reference",
        severity: "error",
        message: `Order line item ${lineItem.id} references missing SKU ${lineItem.skuId}.`,
      });
    }
  }

  for (const order of scenario.tables.orders) {
    if (!customerIds.has(order.customerId)) {
      messages.push({
        code: "missing_customer_reference",
        severity: "error",
        message: `Order ${order.id} references missing customer ${order.customerId}.`,
      });
    }
  }

  for (const credit of scenario.tables.credits) {
    const creditMonth = credit.creditDate.slice(0, 7);

    if (!revenueMonths.has(creditMonth)) {
      messages.push({
        code: "missing_credit_month",
        severity: "error",
        message: `Credit ${credit.id} falls in ${creditMonth}, which is missing from monthly revenue.`,
      });
    }
  }

  return messages;
}

function validateRevenue(
  messages: ValidationMessage[],
  scenario: GeneratedScenario,
  input: ScenarioInput,
): void {
  const bookedRevenue = scenario.tables.monthlyRevenue.reduce(
    (total, revenue) => total + revenue.bookedRevenue,
    0,
  );
  const averageBookedAnnualRevenue = bookedRevenue / input.years;
  const tolerance = input.revenueTarget * 0.2;
  const variance = Math.abs(averageBookedAnnualRevenue - input.revenueTarget);

  if (variance <= tolerance) {
    messages.push({
      code: "revenue_reconciled",
      severity: "info",
      message: "Average booked annual revenue is within the MVP reconciliation tolerance.",
    });
    return;
  }

  messages.push({
    code: "revenue_out_of_tolerance",
    severity: "warning",
    message: `Average booked annual revenue ${Math.round(
      averageBookedAnnualRevenue,
    )} differs from target ${input.revenueTarget} by more than the MVP tolerance ${Math.round(
      tolerance,
    )}.`,
  });
}
