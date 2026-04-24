import type { CreditRecord, Order, RejectionRecord, ReturnRecord, ScenarioInput, Sku, SupplyEvent } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

const EVENT_TYPES = ["lead_time_extension", "stockout", "allocation"] as const;
const SEVERITIES = ["low", "medium", "high"] as const;
const RETURN_REASONS = ["damaged", "incorrect_item", "late_delivery", "quality_issue"] as const;
const REJECTION_REASONS = ["failed_inspection", "nonconforming_product", "late_shipment"] as const;

export function generateSupply(
  input: ScenarioInput,
  random: SeededRandom,
  skus: Sku[],
  orders: Order[],
): {
  supplyEvents: SupplyEvent[];
  returns: ReturnRecord[];
  rejections: RejectionRecord[];
  credits: CreditRecord[];
} {
  const eventCount = input.disruptionLevel === "high" ? 12 : input.disruptionLevel === "moderate" ? 7 : 3;
  const finalAdjustmentDate = `${input.startYear + input.years - 1}-12-28`;
  const supplyEvents = Array.from({ length: eventCount }, (_, index): SupplyEvent => {
    const startMonth = random.int(1, 12);
    const startDate = `${input.startYear + random.int(0, input.years - 1)}-${String(startMonth).padStart(2, "0")}-${String(random.int(1, 24)).padStart(2, "0")}`;

    return {
      id: `supply_event_${index + 1}`,
      skuId: random.pick(skus).id,
      startDate,
      endDate: addDays(startDate, random.int(7, 45)),
      eventType: random.pick(EVENT_TYPES),
      severity: input.disruptionLevel === "high" ? random.pick(SEVERITIES) : index % 3 === 0 ? "medium" : "low",
      narrative: "Synthetic supply disruption generated from scenario disruption assumptions.",
    };
  });

  const eligibleOrders = orders.filter((order) => order.total > 0);
  const returnCount =
    input.returnsRate === 0
      ? 0
      : Math.min(eligibleOrders.length, Math.max(1, Math.floor(orders.length * input.returnsRate)));
  const rejectionCount =
    input.rejectionRate === 0
      ? 0
      : Math.min(
          eligibleOrders.length,
          Math.max(1, Math.floor(orders.length * input.rejectionRate)),
        );
  const returns: ReturnRecord[] = [];
  const rejections: RejectionRecord[] = [];
  const credits: CreditRecord[] = [];

  for (let index = 0; index < returnCount; index += 1) {
    const order = eligibleOrders[(index * 3) % eligibleOrders.length] as Order;
    const creditAmount = round(order.total * random.money(0.08, 0.35));
    const returnDate = addDaysClamped(order.orderDate, random.int(5, 60), finalAdjustmentDate);

    returns.push({
      id: `return_${index + 1}`,
      orderId: order.id,
      customerId: order.customerId,
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
    const order = eligibleOrders[(index * 5 + 1) % eligibleOrders.length] as Order;
    const rejectedAmount = round(order.total * random.money(0.05, 0.22));
    const rejectionDate = addDaysClamped(order.orderDate, random.int(2, 45), finalAdjustmentDate);

    rejections.push({
      id: `rejection_${index + 1}`,
      orderId: order.id,
      customerId: order.customerId,
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
