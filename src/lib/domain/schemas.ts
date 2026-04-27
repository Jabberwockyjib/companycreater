import { z } from "zod";

export const scenarioInputSchema = z.object({
  mode: z.enum(["fictional", "real_company"]),
  seed: z.number().int().min(1),
  companyName: z.string().min(2),
  companyUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().min(2),
  revenueTarget: z.number().min(25_000_000).max(200_000_000),
  startYear: z.number().int().min(2018).max(2026),
  years: z.number().int().min(1).max(5),
  customerCount: z.number().int().min(20).max(500),
  skuCount: z.number().int().min(10).max(1000),
  salesRepCount: z.number().int().min(3).max(80),
  regions: z.array(z.string().min(2)).min(1),
  channels: z.array(z.enum(["direct", "distributor", "partner", "ecommerce"])).min(1),
  seasonality: z.enum(["low", "moderate", "high"]),
  disruptionLevel: z.enum(["low", "moderate", "high"]),
  trajectory: z
    .enum(["stable", "growth", "decline", "turnaround", "supply_constrained", "breakout"])
    .default("stable"),
  returnsRate: z.number().min(0).max(0.2),
  rejectionRate: z.number().min(0).max(0.1),
  churnRate: z.number().min(0).max(0.3),
});

export const claimSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  sourceType: z.enum(["public_fact", "inferred", "user_assumption", "synthetic"]),
  confidence: z.number().min(0).max(1),
  sourceUrl: z.string().url().optional(),
});

const productFamilySchema = z.object({
  id: z.string(),
  name: z.string(),
  marginBand: z.enum(["low", "medium", "high"]),
  seasonalityWeight: z.number(),
});

const skuSchema = z.object({
  id: z.string(),
  skuCode: z.string(),
  name: z.string(),
  familyId: z.string(),
  unitPrice: z.number(),
  unitCost: z.number(),
  launchDate: z.string(),
  lifecycleStatus: z.enum(["active", "new_launch", "discontinued"]),
});

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  region: z.string(),
  territoryId: z.string(),
  accountOwnerId: z.string(),
  accountStatus: z.enum(["active", "lost"]),
  segment: z.enum(["enterprise", "mid_market", "commercial"]),
  annualPotential: z.number(),
  story: z.string(),
  riskProfile: z.enum(["low", "medium", "high"]),
});

const contactSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  role: z.enum(["economic_buyer", "technical_evaluator", "procurement", "operations"]),
  email: z.string(),
});

const salespersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  territoryId: z.string(),
  quota: z.number(),
  tenureMonths: z.number(),
  rampStatus: z.enum(["ramping", "productive", "veteran"]),
});

const territorySchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
});

const opportunitySchema = z.object({
  id: z.string(),
  customerId: z.string(),
  salespersonId: z.string(),
  stage: z.enum([
    "prospecting",
    "qualification",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ]),
  expectedValue: z.number(),
  closeDate: z.string(),
  cycleDays: z.number(),
  closeReason: z.string(),
});

const orderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  salespersonId: z.string(),
  opportunityId: z.string(),
  orderDate: z.string(),
  status: z.enum(["fulfilled", "partial", "backordered", "cancelled"]),
  allocatedQuantity: z.number(),
  shippedQuantity: z.number(),
  backorderedQuantity: z.number(),
  subtotal: z.number(),
  discountAmount: z.number(),
  total: z.number(),
});

const orderLineItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  skuId: z.string(),
  quantity: z.number(),
  allocatedQuantity: z.number(),
  shippedQuantity: z.number(),
  backorderedQuantity: z.number(),
  unitPrice: z.number(),
  discountRate: z.number(),
  lineTotal: z.number(),
});

const inventoryPositionSchema = z.object({
  skuId: z.string(),
  startingOnHand: z.number(),
  receivedQuantity: z.number(),
  allocatedQuantity: z.number(),
  shippedQuantity: z.number(),
  backorderedQuantity: z.number(),
  endingOnHand: z.number(),
});

const invoiceSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  paymentTerms: z.enum(["net_30", "net_45", "net_60"]),
  status: z.enum(["open", "paid", "credited"]),
  paidAmount: z.number(),
  balanceDue: z.number(),
  total: z.number(),
});

const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  customerId: z.string(),
  paymentDate: z.string(),
  amount: z.number(),
  method: z.enum(["ach", "check", "wire", "card"]),
});

const monthlyRevenueSchema = z.object({
  month: z.string(),
  bookedRevenue: z.number(),
  invoicedRevenue: z.number(),
  collectedRevenue: z.number(),
  creditedRevenue: z.number(),
  endingArBalance: z.number(),
});

const supplyEventSchema = z.object({
  id: z.string(),
  skuId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  eventType: z.enum(["lead_time_extension", "stockout", "allocation"]),
  severity: z.enum(["low", "medium", "high"]),
  narrative: z.string(),
});

const returnSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderLineItemId: z.string(),
  customerId: z.string(),
  skuId: z.string(),
  quantity: z.number(),
  reason: z.enum(["damaged", "incorrect_item", "late_delivery", "quality_issue"]),
  creditAmount: z.number(),
  returnDate: z.string(),
});

const rejectionSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderLineItemId: z.string(),
  customerId: z.string(),
  skuId: z.string(),
  quantity: z.number(),
  reason: z.enum(["failed_inspection", "nonconforming_product", "late_shipment"]),
  rejectedAmount: z.number(),
  rejectionDate: z.string(),
});

const creditSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  sourceId: z.string(),
  sourceType: z.enum(["return", "rejection", "commercial_concession"]),
  amount: z.number(),
  creditDate: z.string(),
});

const lifecycleEventSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  eventDate: z.string(),
  eventType: z.enum([
    "lead_created",
    "qualified",
    "onboarded",
    "first_order",
    "expansion",
    "contraction",
    "lost",
  ]),
  narrative: z.string(),
});

export const companyProfileSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  revenueTarget: z.number(),
  regions: z.array(z.string()),
  channels: z.array(z.enum(["direct", "distributor", "partner", "ecommerce"])),
  claims: z.array(claimSchema),
});

export const generatedScenarioSchema = z.object({
  metadata: z.object({
    scenarioId: z.string(),
    generatedAt: z.string(),
    seed: z.number().int(),
    mode: z.enum(["fictional", "real_company"]),
  }),
  profile: companyProfileSchema,
  tables: z.object({
    productFamilies: z.array(productFamilySchema),
    skus: z.array(skuSchema),
    customers: z.array(customerSchema),
    contacts: z.array(contactSchema),
    salespeople: z.array(salespersonSchema),
    territories: z.array(territorySchema),
    opportunities: z.array(opportunitySchema),
    orders: z.array(orderSchema),
    orderLineItems: z.array(orderLineItemSchema),
    inventoryPositions: z.array(inventoryPositionSchema),
    invoices: z.array(invoiceSchema),
    payments: z.array(paymentSchema),
    monthlyRevenue: z.array(monthlyRevenueSchema),
    supplyEvents: z.array(supplyEventSchema),
    returns: z.array(returnSchema),
    rejections: z.array(rejectionSchema),
    credits: z.array(creditSchema),
    lifecycleEvents: z.array(lifecycleEventSchema),
  }),
  validations: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(["info", "warning", "error"]),
      message: z.string(),
    }),
  ),
  assumptionsReport: z.array(z.string()),
});
