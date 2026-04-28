import type {
  CompanyProfile,
  CreditRecord,
  Order,
  OrderLineItem,
  RejectionRecord,
  ReturnRecord,
  ScenarioInput,
  Sku,
  SupplyEvent,
} from "@/lib/domain/types";
import type { SeededRandom } from "./random";
import { buildResearchContext, pickResearchSignal } from "./research-context";
import { clampDate, getScenarioHorizon, monthAtOffset } from "./time";

const EVENT_TYPES = ["lead_time_extension", "stockout", "allocation"] as const;
const SEVERITIES = ["low", "medium", "high"] as const;
const RETURN_REASONS = ["damaged", "incorrect_item", "late_delivery", "quality_issue"] as const;
const REJECTION_REASONS = ["failed_inspection", "nonconforming_product", "late_shipment"] as const;

export function generateSupply(
  input: ScenarioInput,
  random: SeededRandom,
  skus: Sku[],
  orders: Order[],
  orderLineItems: OrderLineItem[],
  profile?: CompanyProfile,
): {
  supplyEvents: SupplyEvent[];
  returns: ReturnRecord[];
  rejections: RejectionRecord[];
  credits: CreditRecord[];
} {
  const eventCount = input.disruptionLevel === "high" ? 12 : input.disruptionLevel === "moderate" ? 7 : 3;
  const horizon = getScenarioHorizon(input);
  const finalAdjustmentDate = horizon.asOfDate;
  const researchContext = buildResearchContext(profile);
  const supplyEvents = Array.from({ length: eventCount }, (_, index): SupplyEvent => {
    const eventMonth = monthAtOffset(input, random.int(0, Math.max(0, horizon.totalMonths - 1)));
    const startDate = clampDate(
      `${eventMonth.monthKey}-${String(random.int(1, 24)).padStart(2, "0")}`,
      horizon.asOfDate,
    );

    return {
      id: `supply_event_${index + 1}`,
      skuId: random.pick(skus).id,
      startDate,
      endDate: clampDate(addDays(startDate, random.int(7, 45)), horizon.asOfDate),
      eventType: random.pick(EVENT_TYPES),
      severity: input.disruptionLevel === "high" ? random.pick(SEVERITIES) : index % 3 === 0 ? "medium" : "low",
      narrative: buildSupplyNarrative(input, index, researchContext),
    };
  });

  const eligibleOrders = orders.filter((order) => order.total > 0);
  const eligibleOrdersById = new Map(eligibleOrders.map((order) => [order.id, order]));
  const eligibleLineItems = orderLineItems.filter(
    (lineItem) => eligibleOrdersById.has(lineItem.orderId) && lineItem.shippedQuantity > 0,
  );
  const returnCount =
    input.returnsRate === 0
      ? 0
      : Math.min(eligibleLineItems.length, Math.max(1, Math.floor(orders.length * input.returnsRate)));
  const rejectionCount =
    input.rejectionRate === 0
      ? 0
      : Math.min(
          eligibleLineItems.length,
          Math.max(1, Math.floor(orders.length * input.rejectionRate)),
        );
  const returns: ReturnRecord[] = [];
  const rejections: RejectionRecord[] = [];
  const credits: CreditRecord[] = [];

  for (let index = 0; index < returnCount; index += 1) {
    const lineItem = eligibleLineItems[(index * 3) % eligibleLineItems.length] as OrderLineItem;
    const order = eligibleOrdersById.get(lineItem.orderId) as Order;
    const quantity = random.int(1, lineItem.shippedQuantity);
    const creditAmount = round((lineItem.lineTotal / lineItem.quantity) * quantity * random.money(0.75, 1));
    const returnDate = addDaysClamped(order.orderDate, random.int(5, 60), finalAdjustmentDate);

    returns.push({
      id: `return_${index + 1}`,
      orderId: order.id,
      orderLineItemId: lineItem.id,
      customerId: order.customerId,
      skuId: lineItem.skuId,
      quantity,
      reason: random.pick(RETURN_REASONS),
      creditAmount,
      returnDate,
    });
    credits.push({
      id: `credit_return_${index + 1}`,
      customerId: order.customerId,
      sourceId: `return_${index + 1}`,
      sourceType: "return",
      amount: creditAmount,
      creditDate: returnDate,
    });
  }

  for (let index = 0; index < rejectionCount; index += 1) {
    const lineItem = eligibleLineItems[(index * 5 + 1) % eligibleLineItems.length] as OrderLineItem;
    const order = eligibleOrdersById.get(lineItem.orderId) as Order;
    const quantity = random.int(1, lineItem.shippedQuantity);
    const rejectedAmount = round((lineItem.lineTotal / lineItem.quantity) * quantity * random.money(0.6, 1));
    const rejectionDate = addDaysClamped(order.orderDate, random.int(2, 45), finalAdjustmentDate);

    rejections.push({
      id: `rejection_${index + 1}`,
      orderId: order.id,
      orderLineItemId: lineItem.id,
      customerId: order.customerId,
      skuId: lineItem.skuId,
      quantity,
      reason: random.pick(REJECTION_REASONS),
      rejectedAmount,
      rejectionDate,
    });
    credits.push({
      id: `credit_rejection_${index + 1}`,
      customerId: order.customerId,
      sourceId: `rejection_${index + 1}`,
      sourceType: "rejection",
      amount: rejectedAmount,
      creditDate: rejectionDate,
    });
  }

  return { supplyEvents, returns, rejections, credits };
}

function buildSupplyNarrative(
  input: ScenarioInput,
  index: number,
  researchContext: ReturnType<typeof buildResearchContext>,
): string {
  const productFamily = pickResearchSignal(researchContext.productFamilies, index);
  const market = pickResearchSignal(researchContext.markets, index);
  const language = pickResearchSignal(researchContext.industryLanguage, index);

  if (!productFamily && !market && !language) {
    return "Synthetic supply disruption generated from scenario disruption assumptions.";
  }

  const subject = language ?? productFamily ?? input.industry.toLowerCase();
  const marketText = market ? ` for ${market}` : "";

  return `Synthetic supply disruption around ${subject}${marketText}, based on researched public operating language and scenario disruption assumptions.`;
}

function addDaysClamped(dateString: string, days: number, maxDateString: string): string {
  const date = addDays(dateString, days);
  return date > maxDateString ? maxDateString : date;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
