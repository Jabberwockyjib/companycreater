import type { Customer, InventoryPosition, Invoice, LifecycleEvent, MonthlyRevenue, Opportunity, Order, OrderLineItem, PaymentRecord, Salesperson, ScenarioInput, Sku } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

const PAYMENT_METHODS = ["ach", "check", "wire", "card"] as const;
const EXPECTED_ORDER_DISCOUNT_RATE = 0.04;

interface CustomerBuyingPlan {
  customer: Customer;
  salesperson: Salesperson;
  opportunity: Opportunity;
  orderCount: number;
  targetSubtotal: number;
  affinityFamilyIds: string[];
}

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
  payments: PaymentRecord[];
  monthlyRevenue: MonthlyRevenue[];
} {
  const orders: Order[] = [];
  const orderLineItems: OrderLineItem[] = [];
  const invoices: Invoice[] = [];
  const payments: PaymentRecord[] = [];
  const monthlyRevenue = buildMonthlyRevenue(input);
  const finalPaymentDate = `${input.startYear + input.years - 1}-12-28`;
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
  const customerPlans = buildCustomerBuyingPlans(
    input,
    random,
    orderableCustomers,
    salespeople,
    skus,
    closedWonOpportunityByCustomer,
    lostDateByCustomer,
  );
  const plannedOrders = customerPlans
    .flatMap((plan) => buildPlannedOrders(input, random, plan, lostDateByCustomer))
    .sort((left, right) => left.orderDate.localeCompare(right.orderDate));

  for (let index = 0; index < plannedOrders.length; index += 1) {
    const plannedOrder = plannedOrders[index] as {
      plan: CustomerBuyingPlan;
      orderDate: string;
      targetSubtotal: number;
    };
    const { customer, salesperson, opportunity } = plannedOrder.plan;
    const orderDate = plannedOrder.orderDate;
    const year = Number(orderDate.slice(0, 4));
    const month = Number(orderDate.slice(5, 7));
    const lineCount = buildLineCount(plannedOrder.targetSubtotal, random);
    const lineWeights = buildWeights(lineCount, random);
    const lineWeightTotal = lineWeights.reduce((total, weight) => total + weight, 0);
    let subtotal = 0;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const sku = pickSkuForCustomer(plannedOrder.plan, skus, random, lineIndex);
      const discountRate = random.money(0, 0.12);
      const targetLineTotal =
        plannedOrder.targetSubtotal *
        ((lineWeights[lineIndex] ?? 1) / lineWeightTotal) *
        trajectoryMultiplier(input, orderDate);
      const quantity = Math.max(
        1,
        Math.round((targetLineTotal / sku.unitPrice) * random.money(0.85, 1.15)),
      );
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
    const paymentTerms = buildPaymentTerms(index);
    const termDays = paymentTermDays(paymentTerms);
    const paidAmount = buildPaidAmount(total, index, random);
    const balanceDue = round(total - paidAmount);
    const paymentDate =
      paidAmount > 0
        ? addDaysClamped(orderDate, random.int(Math.max(5, termDays - 10), termDays + 30), finalPaymentDate)
        : undefined;
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
      customerId: customer.id,
      invoiceDate: orderDate,
      dueDate: addDays(orderDate, termDays),
      paymentTerms,
      status: total === 0 ? "credited" : balanceDue === 0 ? "paid" : "open",
      paidAmount,
      balanceDue,
      total,
    });

    if (paymentDate) {
      payments.push({
        id: `payment_${index + 1}`,
        invoiceId: `invoice_${index + 1}`,
        customerId: customer.id,
        paymentDate,
        amount: paidAmount,
        method: random.pick(PAYMENT_METHODS),
      });
      const paymentBucket = monthlyRevenue.find((row) => row.month === paymentDate.slice(0, 7));

      if (paymentBucket) {
        paymentBucket.collectedRevenue = round(paymentBucket.collectedRevenue + paidAmount);
      }
    }
  }

  const inventoryPositions = applyInventoryFulfillment(input, skus, orders, orderLineItems);
  recalculateEndingArBalance(monthlyRevenue);

  return { orders, orderLineItems, inventoryPositions, invoices, payments, monthlyRevenue };
}

function buildCustomerBuyingPlans(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
  salespeople: Salesperson[],
  skus: Sku[],
  opportunitiesByCustomerId: Map<string, Opportunity>,
  lostDateByCustomer: Map<string, string>,
): CustomerBuyingPlan[] {
  const planSeeds = customers.map((customer, index) => {
    const salesperson =
      salespeople.find((candidate) => candidate.id === customer.accountOwnerId) ??
      (salespeople[index % salespeople.length] as Salesperson);
    const opportunity = opportunitiesByCustomerId.get(customer.id);

    if (!opportunity) {
      throw new Error(`Customer ${customer.id} does not have a closed-won opportunity`);
    }

    const segmentWeight =
      customer.segment === "enterprise" ? 2.5 : customer.segment === "mid_market" ? 1.15 : 0.45;
    const riskWeight =
      customer.riskProfile === "high" ? 0.72 : customer.riskProfile === "medium" ? 0.95 : 1.08;
    const lostWeight = lostDateByCustomer.has(customer.id) ? 0.75 : 1;
    const weight =
      Math.pow(customer.annualPotential, 1.25) *
      segmentWeight *
      riskWeight *
      lostWeight *
      random.money(0.8, 1.2);

    return {
      customer,
      salesperson,
      opportunity,
      orderCount: buildOrderCount(input, customer, random, lostDateByCustomer.has(customer.id)),
      weight,
      affinityFamilyIds: buildAffinityFamilyIds(customer, skus),
    };
  });
  const totalWeight = planSeeds.reduce((total, plan) => total + plan.weight, 0);
  const targetSubtotal = input.revenueTarget / (1 - EXPECTED_ORDER_DISCOUNT_RATE);

  return planSeeds.map((planSeed) => ({
    customer: planSeed.customer,
    salesperson: planSeed.salesperson,
    opportunity: planSeed.opportunity,
    orderCount: planSeed.orderCount,
    targetSubtotal: targetSubtotal * (planSeed.weight / totalWeight),
    affinityFamilyIds: planSeed.affinityFamilyIds,
  }));
}

function buildOrderCount(
  input: ScenarioInput,
  customer: Customer,
  random: SeededRandom,
  isLost: boolean,
): number {
  const baseAnnualOrders =
    customer.segment === "enterprise"
      ? random.int(3, 6)
      : customer.segment === "mid_market"
        ? random.int(1, 3)
        : random.money(0.45, 1.35);
  const riskMultiplier =
    customer.riskProfile === "high" ? 0.65 : customer.riskProfile === "medium" ? 0.9 : 1.1;
  const lostMultiplier = isLost ? 0.7 : 1;

  return Math.max(1, Math.round(input.years * baseAnnualOrders * riskMultiplier * lostMultiplier));
}

function buildAffinityFamilyIds(customer: Customer, skus: Sku[]): string[] {
  const familyIds = [...new Set(skus.map((sku) => sku.familyId))];
  const numericId = Number(customer.id.replace(/\D/g, "")) || 1;
  const primaryFamilyId = familyIds[(numericId * 3) % familyIds.length] as string;
  const secondaryFamilyId = familyIds[(numericId * 7 + 1) % familyIds.length] as string;

  return [...new Set([primaryFamilyId, secondaryFamilyId])];
}

function buildPlannedOrders(
  input: ScenarioInput,
  random: SeededRandom,
  plan: CustomerBuyingPlan,
  lostDateByCustomer: Map<string, string>,
): Array<{ plan: CustomerBuyingPlan; orderDate: string; targetSubtotal: number }> {
  const weights = buildWeights(plan.orderCount, random).map((weight, index) => {
    if (index === 0) {
      return weight * 0.55;
    }

    if (index === 1) {
      return weight * 0.8;
    }

    if ((index + 1) % 6 === 0) {
      return weight * 1.8;
    }

    return weight;
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const availableMonths = buildAvailableMonths(input, plan.customer, lostDateByCustomer);

  return Array.from({ length: plan.orderCount }, (_, index) => {
    const monthOffset = availableMonths[Math.min(
      availableMonths.length - 1,
      Math.floor((index / Math.max(1, plan.orderCount)) * availableMonths.length),
    )] ?? 0;
    const orderDate = buildOrderDate(input, random, plan.customer, lostDateByCustomer, monthOffset);

    return {
      plan,
      orderDate,
      targetSubtotal: plan.targetSubtotal * ((weights[index] ?? 1) / totalWeight),
    };
  });
}

function buildAvailableMonths(
  input: ScenarioInput,
  customer: Customer,
  lostDateByCustomer: Map<string, string>,
): number[] {
  const lostDate = lostDateByCustomer.get(customer.id);
  const totalMonths = input.years * 12;

  if (!lostDate) {
    return Array.from({ length: totalMonths }, (_, index) => index);
  }

  const lostYear = Number(lostDate.slice(0, 4));
  const lostMonth = Number(lostDate.slice(5, 7));
  const monthsBeforeLoss = Math.max(1, (lostYear - input.startYear) * 12 + lostMonth - 1);

  return Array.from({ length: monthsBeforeLoss }, (_, index) => index);
}

function buildLineCount(targetSubtotal: number, random: SeededRandom): number {
  if (targetSubtotal > 350000) {
    return random.int(3, 6);
  }

  if (targetSubtotal > 125000) {
    return random.int(2, 4);
  }

  return random.int(1, 3);
}

function buildWeights(count: number, random: SeededRandom): number[] {
  return Array.from({ length: count }, (_, index) => {
    const cycleLift = index % 5 === 0 ? 1.35 : 1;
    return random.money(0.65, 1.45) * cycleLift;
  });
}

function pickSkuForCustomer(
  plan: CustomerBuyingPlan,
  skus: Sku[],
  random: SeededRandom,
  lineIndex: number,
): Sku {
  const roll = random.next();
  const preferredFamilyId =
    roll < 0.68
      ? plan.affinityFamilyIds[0]
      : roll < 0.9
        ? plan.affinityFamilyIds[1] ?? plan.affinityFamilyIds[0]
        : undefined;
  const candidateSkus = preferredFamilyId
    ? skus.filter((sku) => sku.familyId === preferredFamilyId)
    : skus;

  return candidateSkus[(lineIndex + random.int(0, candidateSkus.length - 1)) % candidateSkus.length] as Sku;
}

export function recalculateEndingArBalance(monthlyRevenue: MonthlyRevenue[]): void {
  let balance = 0;

  for (const revenue of monthlyRevenue) {
    balance = Math.max(
      0,
      round(
        balance +
          revenue.invoicedRevenue -
          revenue.collectedRevenue -
          revenue.creditedRevenue,
      ),
    );
    revenue.endingArBalance = balance;
  }
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

  if (input.disruptionLevel === "low" && input.trajectory !== "supply_constrained") {
    return demand;
  }

  const baseFillRate =
    input.trajectory === "supply_constrained"
      ? 0.68
      : input.disruptionLevel === "high"
        ? 0.7
        : 0.9;
  const skuVariation =
    input.trajectory === "supply_constrained" || input.disruptionLevel === "high"
      ? (skuIndex % 4) * 0.04
      : (skuIndex % 3) * 0.03;
  const fillRate = Math.max(0.45, baseFillRate - skuVariation);

  return Math.max(0, Math.floor(demand * fillRate));
}

function trajectoryMultiplier(input: ScenarioInput, orderDate: string): number {
  const orderMonth =
    (Number(orderDate.slice(0, 4)) - input.startYear) * 12 + Number(orderDate.slice(5, 7)) - 1;
  const progress = input.years <= 1 ? 0 : orderMonth / Math.max(1, input.years * 12 - 1);

  switch (input.trajectory ?? "stable") {
    case "growth":
      return 0.72 + progress * 0.75;
    case "decline":
      return 1.25 - progress * 0.55;
    case "turnaround":
      return progress < 0.5 ? 0.78 - progress * 0.18 : 0.72 + (progress - 0.5) * 1.1;
    case "supply_constrained":
      return 1.05 + progress * 0.18;
    case "breakout":
      return progress < 0.62 ? 0.62 + progress * 0.35 : 0.85 + (progress - 0.62) * 2.3;
    case "stable":
    default:
      return 0.96 + progress * 0.08;
  }
}

function buildMonthlyRevenue(input: ScenarioInput): MonthlyRevenue[] {
  return Array.from({ length: input.years * 12 }, (_, index) => {
    const year = input.startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;

    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      bookedRevenue: 0,
      invoicedRevenue: 0,
      collectedRevenue: 0,
      creditedRevenue: 0,
      endingArBalance: 0,
    };
  });
}

function buildPaymentTerms(index: number): Invoice["paymentTerms"] {
  if (index % 11 === 0) {
    return "net_60";
  }

  if (index % 5 === 0) {
    return "net_45";
  }

  return "net_30";
}

function paymentTermDays(paymentTerms: Invoice["paymentTerms"]): number {
  return Number(paymentTerms.replace("net_", ""));
}

function buildPaidAmount(total: number, index: number, random: SeededRandom): number {
  if (total === 0 || index % 19 === 0) {
    return 0;
  }

  if (index % 8 === 0) {
    return round(total * random.money(0.25, 0.75));
  }

  return total;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addDaysClamped(dateString: string, days: number, maxDateString: string): string {
  const date = addDays(dateString, days);
  return date > maxDateString ? maxDateString : date;
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
