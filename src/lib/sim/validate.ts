import type { GeneratedScenario, ScenarioInput, ValidationMessage } from "@/lib/domain/types";

export function validateScenario(
  scenario: GeneratedScenario,
  input: ScenarioInput,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const orderIds = new Set(scenario.tables.orders.map((order) => order.id));
  const skuIds = new Set(scenario.tables.skus.map((sku) => sku.id));
  const productFamilyIds = new Set(scenario.tables.productFamilies.map((family) => family.id));
  const customerIds = new Set(scenario.tables.customers.map((customer) => customer.id));
  const customersById = new Map(scenario.tables.customers.map((customer) => [customer.id, customer]));
  const salespeopleById = new Map(
    scenario.tables.salespeople.map((salesperson) => [salesperson.id, salesperson]),
  );
  const opportunityById = new Map(
    scenario.tables.opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );
  const orderById = new Map(scenario.tables.orders.map((order) => [order.id, order]));
  const lineItemById = new Map(
    scenario.tables.orderLineItems.map((lineItem) => [lineItem.id, lineItem]),
  );
  const inventoryBySkuId = new Map(
    scenario.tables.inventoryPositions.map((inventoryPosition) => [
      inventoryPosition.skuId,
      inventoryPosition,
    ]),
  );
  const lostDateByCustomer = new Map(
    scenario.tables.lifecycleEvents
      .filter((event) => event.eventType === "lost")
      .map((event) => [event.customerId, event.eventDate]),
  );
  const revenueMonths = new Set(scenario.tables.monthlyRevenue.map((revenue) => revenue.month));

  validateRevenue(messages, scenario, input);

  for (const sku of scenario.tables.skus) {
    if (!productFamilyIds.has(sku.familyId)) {
      messages.push({
        code: "missing_product_family_reference",
        severity: "error",
        message: `SKU ${sku.id} references missing product family ${sku.familyId}.`,
      });
    }
  }

  for (const customer of scenario.tables.customers) {
    if (!salespeopleById.has(customer.accountOwnerId)) {
      messages.push({
        code: "missing_account_owner_reference",
        severity: "error",
        message: `Customer ${customer.id} references missing account owner ${customer.accountOwnerId}.`,
      });
    }
  }

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

    if (
      lineItem.allocatedQuantity < 0 ||
      lineItem.shippedQuantity < 0 ||
      lineItem.backorderedQuantity < 0 ||
      lineItem.allocatedQuantity + lineItem.backorderedQuantity !== lineItem.quantity ||
      lineItem.shippedQuantity > lineItem.allocatedQuantity
    ) {
      messages.push({
        code: "line_fulfillment_quantity_mismatch",
        severity: "error",
        message: `Order line item ${lineItem.id} fulfillment quantities do not reconcile.`,
      });
    }
  }

  for (const inventoryPosition of scenario.tables.inventoryPositions) {
    const skuLineItems = scenario.tables.orderLineItems.filter(
      (lineItem) => lineItem.skuId === inventoryPosition.skuId,
    );
    const allocatedQuantity = skuLineItems.reduce(
      (total, lineItem) => total + lineItem.allocatedQuantity,
      0,
    );
    const shippedQuantity = skuLineItems.reduce(
      (total, lineItem) => total + lineItem.shippedQuantity,
      0,
    );
    const backorderedQuantity = skuLineItems.reduce(
      (total, lineItem) => total + lineItem.backorderedQuantity,
      0,
    );

    if (!skuIds.has(inventoryPosition.skuId)) {
      messages.push({
        code: "missing_inventory_sku_reference",
        severity: "error",
        message: `Inventory position references missing SKU ${inventoryPosition.skuId}.`,
      });
    }

    if (
      inventoryPosition.startingOnHand < 0 ||
      inventoryPosition.receivedQuantity < 0 ||
      inventoryPosition.allocatedQuantity < 0 ||
      inventoryPosition.shippedQuantity < 0 ||
      inventoryPosition.backorderedQuantity < 0 ||
      inventoryPosition.endingOnHand < 0 ||
      inventoryPosition.startingOnHand +
        inventoryPosition.receivedQuantity -
        inventoryPosition.allocatedQuantity !==
        inventoryPosition.endingOnHand ||
      inventoryPosition.shippedQuantity > inventoryPosition.allocatedQuantity
    ) {
      messages.push({
        code: "inventory_position_quantity_mismatch",
        severity: "error",
        message: `Inventory position for SKU ${inventoryPosition.skuId} does not reconcile.`,
      });
    }

    if (
      inventoryPosition.allocatedQuantity !== allocatedQuantity ||
      inventoryPosition.shippedQuantity !== shippedQuantity ||
      inventoryPosition.backorderedQuantity !== backorderedQuantity
    ) {
      messages.push({
        code: "inventory_line_quantity_mismatch",
        severity: "error",
        message: `Inventory position for SKU ${inventoryPosition.skuId} does not match order line fulfillment totals.`,
      });
    }
  }

  for (const sku of scenario.tables.skus) {
    if (!inventoryBySkuId.has(sku.id)) {
      messages.push({
        code: "missing_inventory_position",
        severity: "error",
        message: `SKU ${sku.id} is missing an inventory position.`,
      });
    }
  }

  for (const order of scenario.tables.orders) {
    const customer = customersById.get(order.customerId);
    const salesperson = salespeopleById.get(order.salespersonId);
    const opportunity = opportunityById.get(order.opportunityId);

    if (!customer) {
      messages.push({
        code: "missing_customer_reference",
        severity: "error",
        message: `Order ${order.id} references missing customer ${order.customerId}.`,
      });
    }

    if (!salesperson) {
      messages.push({
        code: "missing_salesperson_reference",
        severity: "error",
        message: `Order ${order.id} references missing salesperson ${order.salespersonId}.`,
      });
    }

    if (customer && customer.accountOwnerId !== order.salespersonId) {
      messages.push({
        code: "order_account_owner_mismatch",
        severity: "error",
        message: `Order ${order.id} uses ${order.salespersonId}, but customer ${customer.id} is owned by ${customer.accountOwnerId}.`,
      });
    }

    const lostDate = lostDateByCustomer.get(order.customerId);

    if (lostDate && order.orderDate >= lostDate) {
      messages.push({
        code: "order_after_customer_loss",
        severity: "error",
        message: `Order ${order.id} is dated after customer ${order.customerId} was lost.`,
      });
    }

    if (!opportunity) {
      messages.push({
        code: "missing_order_opportunity_reference",
        severity: "error",
        message: `Order ${order.id} references missing opportunity ${order.opportunityId}.`,
      });
    } else if (
      opportunity.stage !== "closed_won" ||
      opportunity.customerId !== order.customerId ||
      opportunity.salespersonId !== order.salespersonId
    ) {
      messages.push({
        code: "order_opportunity_mismatch",
        severity: "error",
        message: `Order ${order.id} is not tied to a closed-won opportunity for the same customer and salesperson.`,
      });
    }

    const lineSubtotal = round(
      scenario.tables.orderLineItems
        .filter((lineItem) => lineItem.orderId === order.id)
        .reduce((total, lineItem) => total + lineItem.lineTotal, 0),
    );
    const orderLines = scenario.tables.orderLineItems.filter((lineItem) => lineItem.orderId === order.id);
    const allocatedQuantity = orderLines.reduce((total, lineItem) => total + lineItem.allocatedQuantity, 0);
    const shippedQuantity = orderLines.reduce((total, lineItem) => total + lineItem.shippedQuantity, 0);
    const backorderedQuantity = orderLines.reduce((total, lineItem) => total + lineItem.backorderedQuantity, 0);
    const expectedTotal = order.status === "cancelled" ? 0 : round(lineSubtotal - order.discountAmount);

    if (round(order.subtotal) !== lineSubtotal || round(order.total) !== expectedTotal) {
      messages.push({
        code: "order_total_mismatch",
        severity: "error",
        message: `Order ${order.id} totals do not reconcile to line items and discount amount.`,
      });
    }

    if (
      order.allocatedQuantity !== allocatedQuantity ||
      order.shippedQuantity !== shippedQuantity ||
      order.backorderedQuantity !== backorderedQuantity
    ) {
      messages.push({
        code: "order_fulfillment_quantity_mismatch",
        severity: "error",
        message: `Order ${order.id} fulfillment quantities do not match line items.`,
      });
    }
  }

  for (const invoice of scenario.tables.invoices) {
    const order = orderById.get(invoice.orderId);

    if (!order) {
      messages.push({
        code: "missing_invoice_order_reference",
        severity: "error",
        message: `Invoice ${invoice.id} references missing order ${invoice.orderId}.`,
      });
    } else if (round(invoice.total) !== round(order.total)) {
      messages.push({
        code: "invoice_total_mismatch",
        severity: "error",
        message: `Invoice ${invoice.id} total does not match order ${order.id}.`,
      });
    }
  }

  for (const returnRecord of scenario.tables.returns) {
    const order = orderById.get(returnRecord.orderId);
    const lineItem = lineItemById.get(returnRecord.orderLineItemId);

    if (!order) {
      messages.push({
        code: "missing_return_order_reference",
        severity: "error",
        message: `Return ${returnRecord.id} references missing order ${returnRecord.orderId}.`,
      });
    } else if (returnRecord.customerId !== order.customerId) {
      messages.push({
        code: "return_customer_mismatch",
        severity: "error",
        message: `Return ${returnRecord.id} customer does not match order ${order.id}.`,
      });
    }

    if (!lineItem) {
      messages.push({
        code: "missing_return_line_item_reference",
        severity: "error",
        message: `Return ${returnRecord.id} references missing order line item ${returnRecord.orderLineItemId}.`,
      });
    } else if (
      lineItem.orderId !== returnRecord.orderId ||
      lineItem.skuId !== returnRecord.skuId ||
      returnRecord.quantity < 1 ||
      returnRecord.quantity > lineItem.shippedQuantity
    ) {
      messages.push({
        code: "return_line_item_mismatch",
        severity: "error",
        message: `Return ${returnRecord.id} does not match the referenced order line item.`,
      });
    }
  }

  for (const rejection of scenario.tables.rejections) {
    const order = orderById.get(rejection.orderId);
    const lineItem = lineItemById.get(rejection.orderLineItemId);

    if (!order) {
      messages.push({
        code: "missing_rejection_order_reference",
        severity: "error",
        message: `Rejection ${rejection.id} references missing order ${rejection.orderId}.`,
      });
    } else if (rejection.customerId !== order.customerId) {
      messages.push({
        code: "rejection_customer_mismatch",
        severity: "error",
        message: `Rejection ${rejection.id} customer does not match order ${order.id}.`,
      });
    }

    if (!lineItem) {
      messages.push({
        code: "missing_rejection_line_item_reference",
        severity: "error",
        message: `Rejection ${rejection.id} references missing order line item ${rejection.orderLineItemId}.`,
      });
    } else if (
      lineItem.orderId !== rejection.orderId ||
      lineItem.skuId !== rejection.skuId ||
      rejection.quantity < 1 ||
      rejection.quantity > lineItem.shippedQuantity
    ) {
      messages.push({
        code: "rejection_line_item_mismatch",
        severity: "error",
        message: `Rejection ${rejection.id} does not match the referenced order line item.`,
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

    if (!customerIds.has(credit.customerId)) {
      messages.push({
        code: "missing_credit_customer_reference",
        severity: "error",
        message: `Credit ${credit.id} references missing customer ${credit.customerId}.`,
      });
    }

    const source =
      credit.sourceType === "return"
        ? scenario.tables.returns.find((returnRecord) => returnRecord.id === credit.sourceId)
        : credit.sourceType === "rejection"
          ? scenario.tables.rejections.find((rejection) => rejection.id === credit.sourceId)
          : undefined;

    if (!source && credit.sourceType !== "commercial_concession") {
      messages.push({
        code: "missing_credit_source_reference",
        severity: "error",
        message: `Credit ${credit.id} references missing ${credit.sourceType} source ${credit.sourceId}.`,
      });
    } else if (source && source.customerId !== credit.customerId) {
      messages.push({
        code: "credit_customer_mismatch",
        severity: "error",
        message: `Credit ${credit.id} customer does not match source ${credit.sourceId}.`,
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
