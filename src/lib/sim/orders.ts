import type { Customer, InventoryPosition, Invoice, LifecycleEvent, MonthlyRevenue, Opportunity, Order, OrderLineItem, Salesperson, ScenarioInput, Sku } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

export function generateOrders(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
  salespeople: Salesperson[],
  skus: Sku[],
  opportunities: Opportunity[],
  lifecycleEvents: LifecycleEvent[],
): {
  orders: Order[];
  orderLineItems: OrderLineItem[];
  inventoryPositions: InventoryPosition[];
  invoices: Invoice[];
  monthlyRevenue: MonthlyRevenue[];
} {
  const orders: Order[] = [];
  const orderLineItems: OrderLineItem[] = [];
  const invoices: Invoice[] = [];
  const monthlyRevenue = buildMonthlyRevenue(input);
  const lostDateByCustomer = new Map(
    lifecycleEvents
      .filter((event) => event.eventType === "lost")
      .map((event) => [event.customerId, event.eventDate]),
  );
  const orderableCustomers = customers.filter(
    (customer) =>
      customer.accountStatus === "active" || lostDateByCustomer.has(customer.id),
  );
  const closedWonOpportunityByCustomer = new Map(
    opportunities
      .filter((opportunity) => opportunity.stage === "closed_won")
      .map((opportunity) => [opportunity.customerId, opportunity]),
  );
  const orderTarget = Math.max(
    orderableCustomers.length + 1,
    Math.round(orderableCustomers.length * input.years * 1.45),
  );
  const targetAverageOrder = input.revenueTarget / Math.max(1, orderTarget);

  for (let index = 0; index < orderTarget; index += 1) {
    const customer = orderableCustomers[index % orderableCustomers.length] as Customer;
    const salesperson =
      salespeople.find((candidate) => candidate.id === customer.accountOwnerId) ??
      (salespeople[index % salespeople.length] as Salesperson);
    const opportunity = closedWonOpportunityByCustomer.get(customer.id);

    if (!opportunity) {
      throw new Error(`Customer ${customer.id} does not have a closed-won opportunity`);
    }

    const monthOffset = index % (input.years * 12);
    const orderDate = buildOrderDate(input, random, customer, lostDateByCustomer, monthOffset);
    const year = Number(orderDate.slice(0, 4));
    const month = Number(orderDate.slice(5, 7));
    const lineCount = random.int(1, 4);
    let subtotal = 0;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const sku = random.pick(skus);
      const discountRate = random.money(0, 0.12);
      const quantity = Math.max(1, Math.round((targetAverageOrder / lineCount / sku.unitPrice) * random.money(0.6, 1.4)));
      const lineTotal = round(sku.unitPrice * quantity * (1 - discountRate));
      subtotal += lineTotal;
      orderLineItems.push({
        id: `line_item_${index + 1}_${lineIndex + 1}`,
        orderId: `order_${index + 1}`,
        skuId: sku.id,
        quantity,
        allocatedQuantity: 0,
        shippedQuantity: 0,
        backorderedQuantity: 0,
        unitPrice: sku.unitPrice,
        discountRate,
        lineTotal,
      });
    }

    const discountAmount = round(subtotal * random.money(0, 0.08));
    const total = round(subtotal - discountAmount);
    const monthBucket = monthlyRevenue.find((row) => row.month === `${year}-${String(month).padStart(2, "0")}`);

    if (monthBucket) {
      monthBucket.bookedRevenue = round(monthBucket.bookedRevenue + total);
      monthBucket.invoicedRevenue = round(monthBucket.invoicedRevenue + total);
    }

    orders.push({
      id: `order_${index + 1}`,
      customerId: customer.id,
      salespersonId: salesperson.id,
      opportunityId: opportunity.id,
      orderDate,
      status: "fulfilled",
      allocatedQuantity: 0,
      shippedQuantity: 0,
      backorderedQuantity: 0,
      subtotal: round(subtotal),
      discountAmount,
      total,
    });

    invoices.push({
      id: `invoice_${index + 1}`,
      orderId: `order_${index + 1}`,
      invoiceDate: orderDate,
      dueDate: addDays(orderDate, 30),
      status: total === 0 ? "credited" : index % 8 === 0 ? "open" : "paid",
      total,
    });
  }

  const inventoryPositions = applyInventoryFulfillment(input, skus, orders, orderLineItems);

  return { orders, orderLineItems, inventoryPositions, invoices, monthlyRevenue };
}

function applyInventoryFulfillment(
  input: ScenarioInput,
  skus: Sku[],
  orders: Order[],
  orderLineItems: OrderLineItem[],
): InventoryPosition[] {
  const demandBySku = new Map<string, number>();

  for (const lineItem of orderLineItems) {
    demandBySku.set(lineItem.skuId, (demandBySku.get(lineItem.skuId) ?? 0) + lineItem.quantity);
  }

  const inventoryBySku = new Map(
    skus.map((sku, index) => {
      const demand = demandBySku.get(sku.id) ?? 0;
      const availableQuantity = buildAvailableQuantity(input, demand, index);
      const receivedQuantity = Math.floor(availableQuantity * 0.25);
      const startingOnHand = availableQuantity - receivedQuantity;

      return [
        sku.id,
        {
          skuId: sku.id,
          startingOnHand,
          receivedQuantity,
          allocatedQuantity: 0,
          shippedQuantity: 0,
          backorderedQuantity: 0,
          endingOnHand: availableQuantity,
        },
      ];
    }),
  );

  for (const lineItem of orderLineItems) {
    const inventory = inventoryBySku.get(lineItem.skuId);

    if (!inventory) {
      continue;
    }

    const allocatedQuantity = Math.min(lineItem.quantity, inventory.endingOnHand);
    const backorderedQuantity = lineItem.quantity - allocatedQuantity;

    lineItem.allocatedQuantity = allocatedQuantity;
    lineItem.shippedQuantity = allocatedQuantity;
    lineItem.backorderedQuantity = backorderedQuantity;
    inventory.allocatedQuantity += allocatedQuantity;
    inventory.shippedQuantity += lineItem.shippedQuantity;
    inventory.backorderedQuantity += backorderedQuantity;
    inventory.endingOnHand -= allocatedQuantity;
  }

  const linesByOrderId = new Map<string, OrderLineItem[]>();

  for (const lineItem of orderLineItems) {
    linesByOrderId.set(lineItem.orderId, [
      ...(linesByOrderId.get(lineItem.orderId) ?? []),
      lineItem,
    ]);
  }

  for (const order of orders) {
    const lines = linesByOrderId.get(order.id) ?? [];

    order.allocatedQuantity = lines.reduce((total, lineItem) => total + lineItem.allocatedQuantity, 0);
    order.shippedQuantity = lines.reduce((total, lineItem) => total + lineItem.shippedQuantity, 0);
    order.backorderedQuantity = lines.reduce((total, lineItem) => total + lineItem.backorderedQuantity, 0);
    order.status =
      order.backorderedQuantity === 0
        ? "fulfilled"
        : order.allocatedQuantity === 0
          ? "backordered"
          : "partial";
  }

  return [...inventoryBySku.values()];
}

function buildAvailableQuantity(
  input: ScenarioInput,
  demand: number,
  skuIndex: number,
): number {
  if (demand === 0) {
    return 0;
  }

  if (input.disruptionLevel === "low") {
    return demand;
  }

  const baseFillRate = input.disruptionLevel === "high" ? 0.7 : 0.9;
  const skuVariation = input.disruptionLevel === "high" ? (skuIndex % 4) * 0.04 : (skuIndex % 3) * 0.03;
  const fillRate = Math.max(0.45, baseFillRate - skuVariation);

  return Math.max(0, Math.floor(demand * fillRate));
}

function buildMonthlyRevenue(input: ScenarioInput): MonthlyRevenue[] {
  return Array.from({ length: input.years * 12 }, (_, index) => {
    const year = input.startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;

    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      bookedRevenue: 0,
      invoicedRevenue: 0,
      creditedRevenue: 0,
    };
  });
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildOrderDate(
  input: ScenarioInput,
  random: SeededRandom,
  customer: Customer,
  lostDateByCustomer: Map<string, string>,
  monthOffset: number,
): string {
  const lostDate = lostDateByCustomer.get(customer.id);

  if (!lostDate) {
    const year = input.startYear + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1;

    return `${year}-${String(month).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`;
  }

  const lostYear = Number(lostDate.slice(0, 4));
  const lostMonth = Number(lostDate.slice(5, 7));
  const monthsBeforeLoss = Math.max(1, (lostYear - input.startYear) * 12 + lostMonth - 1);
  const boundedMonthOffset = monthOffset % monthsBeforeLoss;
  const year = input.startYear + Math.floor(boundedMonthOffset / 12);
  const month = (boundedMonthOffset % 12) + 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
