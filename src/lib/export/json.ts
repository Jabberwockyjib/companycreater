import type { GeneratedScenario } from "@/lib/domain/types";

function countRows(scenario: GeneratedScenario) {
  return Object.fromEntries(
    Object.entries(scenario.tables).map(([tableName, rows]) => [tableName, rows.length]),
  );
}

function summarizeValidations(scenario: GeneratedScenario) {
  return scenario.validations.reduce(
    (summary, validation) => ({
      ...summary,
      [validation.severity]: summary[validation.severity] + 1,
    }),
    { info: 0, warning: 0, error: 0 },
  );
}

const relationships = {
  primaryKeys: {
    productFamilies: ["id"],
    skus: ["id"],
    customers: ["id"],
    contacts: ["id"],
    salespeople: ["id"],
    territories: ["id"],
    opportunities: ["id"],
    orders: ["id"],
    orderLineItems: ["id"],
    invoices: ["id"],
    monthlyRevenue: ["month"],
    supplyEvents: ["id"],
    returns: ["id"],
    rejections: ["id"],
    credits: ["id"],
    lifecycleEvents: ["id"],
  },
  foreignKeys: [
    {
      table: "skus",
      column: "familyId",
      references: { table: "productFamilies", column: "id" },
    },
    {
      table: "customers",
      column: "accountOwnerId",
      references: { table: "salespeople", column: "id" },
    },
    {
      table: "customers",
      column: "territoryId",
      references: { table: "territories", column: "id" },
    },
    {
      table: "contacts",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "salespeople",
      column: "territoryId",
      references: { table: "territories", column: "id" },
    },
    {
      table: "opportunities",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "opportunities",
      column: "salespersonId",
      references: { table: "salespeople", column: "id" },
    },
    {
      table: "orders",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "orders",
      column: "salespersonId",
      references: { table: "salespeople", column: "id" },
    },
    {
      table: "orders",
      column: "opportunityId",
      references: { table: "opportunities", column: "id" },
    },
    {
      table: "orderLineItems",
      column: "orderId",
      references: { table: "orders", column: "id" },
    },
    {
      table: "orderLineItems",
      column: "skuId",
      references: { table: "skus", column: "id" },
    },
    {
      table: "invoices",
      column: "orderId",
      references: { table: "orders", column: "id" },
    },
    {
      table: "supplyEvents",
      column: "skuId",
      references: { table: "skus", column: "id" },
    },
    {
      table: "returns",
      column: "orderId",
      references: { table: "orders", column: "id" },
    },
    {
      table: "returns",
      column: "orderLineItemId",
      references: { table: "orderLineItems", column: "id" },
    },
    {
      table: "returns",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "returns",
      column: "skuId",
      references: { table: "skus", column: "id" },
    },
    {
      table: "rejections",
      column: "orderId",
      references: { table: "orders", column: "id" },
    },
    {
      table: "rejections",
      column: "orderLineItemId",
      references: { table: "orderLineItems", column: "id" },
    },
    {
      table: "rejections",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "rejections",
      column: "skuId",
      references: { table: "skus", column: "id" },
    },
    {
      table: "credits",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
    {
      table: "lifecycleEvents",
      column: "customerId",
      references: { table: "customers", column: "id" },
    },
  ],
};

export function scenarioToJsonBundle(scenario: GeneratedScenario) {
  return {
    manifest: {
      scenarioId: scenario.metadata.scenarioId,
      generatedAt: scenario.metadata.generatedAt,
      exportedAt: new Date().toISOString(),
      mode: scenario.metadata.mode,
      companyName: scenario.profile.companyName,
      rowCounts: countRows(scenario),
      validationSummary: summarizeValidations(scenario),
      relationships,
    },
    scenario,
    assumptionsReport: scenario.assumptionsReport,
    dataDictionary: {
      customers:
        "Synthetic customer accounts with industry, segment, region, story, potential, and risk profile.",
      skus:
        "Synthetic SKU catalog grounded by product families, price, cost, launch date, and lifecycle status.",
      orders: "Synthetic order headers with customer, salesperson, date, status, and totals.",
      orderLineItems: "Synthetic order lines tying SKUs, quantities, pricing, discounts, and totals.",
      invoices: "Synthetic invoice records tied to generated orders.",
      monthlyRevenue: "Monthly booked, invoiced, and credited revenue summaries.",
      returns: "Synthetic return records tied to original orders and credits.",
      rejections: "Synthetic rejected order records tied to original orders and credits.",
      credits: "Synthetic credits created by returns, rejections, or concessions.",
      supplyEvents: "ERP-visible supply constraints that affect fulfillment realism.",
      lifecycleEvents: "Synthetic customer onboarding, expansion, contraction, and loss events.",
    },
  };
}
