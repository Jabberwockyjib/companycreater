import type { GeneratedScenario } from "@/lib/domain/types";

export function scenarioToJsonBundle(scenario: GeneratedScenario) {
  return {
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
