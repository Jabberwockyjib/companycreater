import type { Customer, Invoice, MonthlyRevenue, Opportunity, Order, OrderLineItem, Salesperson, ScenarioInput, Sku } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

const ORDER_STATUSES = ["fulfilled", "partial", "backordered", "cancelled"] as const;

export function generateOrders(
  input: ScenarioInput,
  random: SeededRandom,
  customers: Customer[],
  salespeople: Salesperson[],
  skus: Sku[],
  opportunities: Opportunity[],
): {
  orders: Order[];
  orderLineItems: OrderLineItem[];
  invoices: Invoice[];
  monthlyRevenue: MonthlyRevenue[];
} {
  const orders: Order[] = [];
  const orderLineItems: OrderLineItem[] = [];
  const invoices: Invoice[] = [];
  const monthlyRevenue = buildMonthlyRevenue(input);
  const orderableCustomers = customers.filter((customer) => customer.accountStatus === "active");
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
    const year = input.startYear + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1;
    const orderDate = `${year}-${String(month).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`;
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
        unitPrice: sku.unitPrice,
        discountRate,
        lineTotal,
      });
    }

    const discountAmount = round(subtotal * random.money(0, 0.08));
    const status = index % 17 === 0 ? "backordered" : index % 31 === 0 ? "partial" : random.pick(ORDER_STATUSES);
    const total = status === "cancelled" ? 0 : round(subtotal - discountAmount);
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
      status,
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

  return { orders, orderLineItems, invoices, monthlyRevenue };
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
