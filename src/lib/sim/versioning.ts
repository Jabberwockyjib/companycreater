import type {
  CreditRecord,
  GeneratedScenario,
  Invoice,
  Order,
  OrderLineItem,
  PaymentRecord,
  RejectionRecord,
  ReturnRecord,
  SupplyEvent,
} from "@/lib/domain/types";
import { generateScenario } from "./generate";
import { getScenarioHorizon, monthDistance } from "./time";

export function extendScenarioToDate(
  original: GeneratedScenario,
  asOfDate: string,
): GeneratedScenario {
  const originalInput = original.metadata.input;

  if (!originalInput) {
    throw new Error("Scenario cannot be updated because the original input was not stored.");
  }

  const originalAsOfDate = original.metadata.asOfDate ?? original.metadata.generatedAt.slice(0, 10);
  const originalStartDate = original.metadata.historyStartDate ?? getScenarioHorizon(originalInput).startDate;
  const historyYears = Math.max(1, Math.ceil((monthDistance(originalStartDate, asOfDate) + 1) / 12));
  const refreshed = generateScenario({
    ...originalInput,
    historyYears,
    asOfDate,
  });

  const merged = mergeScenarioFacts(original, refreshed, originalAsOfDate);

  return {
    ...merged,
    metadata: {
      ...merged.metadata,
      scenarioId: original.metadata.scenarioId,
      scenarioGroupId: original.metadata.scenarioGroupId ?? original.metadata.scenarioId,
      versionId: `${original.metadata.scenarioGroupId ?? original.metadata.scenarioId}_draft_update`,
      versionNumber: 0,
      previousVersionId: original.metadata.versionId,
      asOfDate,
      historyStartDate: originalStartDate,
      input: {
        ...originalInput,
        historyYears,
        asOfDate,
      },
    },
    assumptionsReport: [
      ...merged.assumptionsReport,
      `Scenario was extended from a previously saved scenario dated ${originalAsOfDate}; dimensions and prior-period history were preserved while later-period facts were regenerated from the original knobs.`,
    ],
  };
}

function mergeScenarioFacts(
  original: GeneratedScenario,
  refreshed: GeneratedScenario,
  cutoffDate: string,
): GeneratedScenario {
  const cutoffMonth = cutoffDate.slice(0, 7);
  const existingOrders = original.tables.orders.filter((order) => order.orderDate <= cutoffDate);
  const orderIdMap = new Map<string, string>();
  const lineItemIdMap = new Map<string, string>();
  const invoiceIdMap = new Map<string, string>();
  const adjustmentIdMap = new Map<string, string>();
  const existingClosedWonOpportunityByCustomer = new Map(
    original.tables.opportunities
      .filter((opportunity) => opportunity.stage === "closed_won")
      .map((opportunity) => [opportunity.customerId, opportunity.id]),
  );
  const nextOrders = refreshed.tables.orders
    .filter((order) => order.orderDate > cutoffDate)
    .map((order, index): Order => {
      const id = `order_${existingOrders.length + index + 1}`;
      orderIdMap.set(order.id, id);

      return {
        ...order,
        id,
        opportunityId:
          existingClosedWonOpportunityByCustomer.get(order.customerId) ?? order.opportunityId,
      };
    });
  const existingOrderIds = new Set(existingOrders.map((order) => order.id));
  const refreshedOrderIds = new Set(orderIdMap.keys());
  const existingLineItems = original.tables.orderLineItems.filter((line) =>
    existingOrderIds.has(line.orderId),
  );
  const nextLineItems = refreshed.tables.orderLineItems
    .filter((line) => refreshedOrderIds.has(line.orderId))
    .map((line): OrderLineItem => {
      const orderId = orderIdMap.get(line.orderId) as string;
      const lineNumber = (line.id.match(/_(\d+)$/)?.[1] ?? "1").padStart(1, "0");
      const id = `line_item_${orderId.replace("order_", "")}_${lineNumber}`;
      lineItemIdMap.set(line.id, id);

      return {
        ...line,
        id,
        orderId,
      };
    });
  const existingInvoices = original.tables.invoices.filter((invoice) => invoice.invoiceDate <= cutoffDate);
  const nextInvoices = refreshed.tables.invoices
    .filter((invoice) => orderIdMap.has(invoice.orderId))
    .map((invoice, index): Invoice => {
      const id = `invoice_${existingInvoices.length + index + 1}`;
      invoiceIdMap.set(invoice.id, id);

      return {
        ...invoice,
        id,
        orderId: orderIdMap.get(invoice.orderId) as string,
      };
    });
  const existingPayments = original.tables.payments.filter((payment) => payment.paymentDate <= cutoffDate);
  const nextPayments = refreshed.tables.payments
    .filter((payment) => invoiceIdMap.has(payment.invoiceId) && payment.paymentDate > cutoffDate)
    .map((payment, index): PaymentRecord => ({
      ...payment,
      id: `payment_${existingPayments.length + index + 1}`,
      invoiceId: invoiceIdMap.get(payment.invoiceId) as string,
    }));
  const existingReturns = original.tables.returns.filter((record) => record.returnDate <= cutoffDate);
  const nextReturns = refreshed.tables.returns
    .filter((record) => orderIdMap.has(record.orderId) && lineItemIdMap.has(record.orderLineItemId))
    .map((record, index): ReturnRecord => {
      const id = `return_${existingReturns.length + index + 1}`;
      adjustmentIdMap.set(record.id, id);

      return {
        ...record,
        id,
        orderId: orderIdMap.get(record.orderId) as string,
        orderLineItemId: lineItemIdMap.get(record.orderLineItemId) as string,
      };
    });
  const existingRejections = original.tables.rejections.filter(
    (record) => record.rejectionDate <= cutoffDate,
  );
  const nextRejections = refreshed.tables.rejections
    .filter((record) => orderIdMap.has(record.orderId) && lineItemIdMap.has(record.orderLineItemId))
    .map((record, index): RejectionRecord => {
      const id = `rejection_${existingRejections.length + index + 1}`;
      adjustmentIdMap.set(record.id, id);

      return {
        ...record,
        id,
        orderId: orderIdMap.get(record.orderId) as string,
        orderLineItemId: lineItemIdMap.get(record.orderLineItemId) as string,
      };
    });
  const existingCredits = original.tables.credits.filter((credit) => credit.creditDate <= cutoffDate);
  const nextCredits = refreshed.tables.credits
    .filter((credit) => credit.creditDate > cutoffDate)
    .map((credit, index): CreditRecord => ({
      ...credit,
      id: `credit_${existingCredits.length + index + 1}`,
      sourceId: adjustmentIdMap.get(credit.sourceId) ?? credit.sourceId,
    }));
  const existingSupplyEvents = original.tables.supplyEvents.filter(
    (event) => event.startDate <= cutoffDate,
  );
  const nextSupplyEvents = refreshed.tables.supplyEvents
    .filter((event) => event.startDate > cutoffDate)
    .map((event, index): SupplyEvent => ({
      ...event,
      id: `supply_event_${existingSupplyEvents.length + index + 1}`,
    }));

  return {
    ...refreshed,
    tables: {
      ...refreshed.tables,
      productFamilies: original.tables.productFamilies,
      skus: original.tables.skus,
      customers: original.tables.customers,
      contacts: original.tables.contacts,
      salespeople: original.tables.salespeople,
      territories: original.tables.territories,
      opportunities: original.tables.opportunities,
      orders: [...existingOrders, ...nextOrders],
      orderLineItems: [...existingLineItems, ...nextLineItems],
      invoices: [...existingInvoices, ...nextInvoices],
      payments: [...existingPayments, ...nextPayments],
      monthlyRevenue: [
        ...original.tables.monthlyRevenue.filter((row) => row.month <= cutoffMonth),
        ...refreshed.tables.monthlyRevenue.filter((row) => row.month > cutoffMonth),
      ],
      supplyEvents: [...existingSupplyEvents, ...nextSupplyEvents],
      returns: [...existingReturns, ...nextReturns],
      rejections: [...existingRejections, ...nextRejections],
      credits: [...existingCredits, ...nextCredits],
      lifecycleEvents: original.tables.lifecycleEvents,
      inventoryPositions: refreshed.tables.inventoryPositions,
    },
  };
}
