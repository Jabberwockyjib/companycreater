import { z } from "zod";
import { SCENARIO_INPUT_LIMITS } from "./limits";

export const scenarioInputSchema = z.object({
  mode: z.enum(["fictional", "real_company"]),
  seed: z.number().int("Seed must be a whole number.").min(SCENARIO_INPUT_LIMITS.seed.min, "Seed must be at least 1."),
  companyName: z.string().min(2, "Company must be at least 2 characters."),
  companyUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().min(2, "Industry must be at least 2 characters."),
  revenueTarget: z
    .number()
    .min(SCENARIO_INPUT_LIMITS.revenueTarget.min, "Revenue target must be between $25M and $200M.")
    .max(SCENARIO_INPUT_LIMITS.revenueTarget.max, "Revenue target must be between $25M and $200M."),
  startYear: z
    .number()
    .int()
    .min(SCENARIO_INPUT_LIMITS.startYear.min)
    .max(SCENARIO_INPUT_LIMITS.startYear.max),
  years: z
    .number()
    .int()
    .min(SCENARIO_INPUT_LIMITS.years.min)
    .max(SCENARIO_INPUT_LIMITS.years.max),
  historyYears: z
    .number()
    .int("Years of history must be a whole number.")
    .min(SCENARIO_INPUT_LIMITS.historyYears.min, "Years of history must be between 1 and 5.")
    .max(SCENARIO_INPUT_LIMITS.historyYears.max, "Years of history must be between 1 and 5.")
    .optional(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data through must use YYYY-MM-DD.").optional(),
  customerCount: z
    .number()
    .int("Customers must be a whole number.")
    .min(SCENARIO_INPUT_LIMITS.customerCount.min, "Customers must be between 20 and 500.")
    .max(SCENARIO_INPUT_LIMITS.customerCount.max, "Customers must be between 20 and 500."),
  skuCount: z
    .number()
    .int("SKUs must be a whole number.")
    .min(SCENARIO_INPUT_LIMITS.skuCount.min, "SKUs must be between 10 and 1,000.")
    .max(SCENARIO_INPUT_LIMITS.skuCount.max, "SKUs must be between 10 and 1,000."),
  salesRepCount: z
    .number()
    .int("Sales reps must be a whole number.")
    .min(SCENARIO_INPUT_LIMITS.salesRepCount.min, "Sales reps must be between 3 and 80.")
    .max(SCENARIO_INPUT_LIMITS.salesRepCount.max, "Sales reps must be between 3 and 80."),
  regions: z.array(z.string().min(2)).min(1),
  channels: z.array(z.enum(["direct", "distributor", "partner", "ecommerce"])).min(1),
  seasonality: z.enum(["low", "moderate", "high"]),
  disruptionLevel: z.enum(["low", "moderate", "high"]),
  trajectory: z
    .enum(["stable", "growth", "decline", "turnaround", "supply_constrained", "breakout"])
    .default("stable"),
  returnsRate: z.number().min(0).max(SCENARIO_INPUT_LIMITS.returnsRate.max),
  rejectionRate: z.number().min(0).max(SCENARIO_INPUT_LIMITS.rejectionRate.max),
  churnRate: z.number().min(0).max(SCENARIO_INPUT_LIMITS.churnRate.max),
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
    scenarioGroupId: z.string().optional(),
    versionId: z.string().optional(),
    versionNumber: z.number().int().optional(),
    previousVersionId: z.string().optional(),
    generatedAt: z.string(),
    asOfDate: z.string().optional(),
    historyStartDate: z.string().optional(),
    seed: z.number().int(),
    mode: z.enum(["fictional", "real_company"]),
    input: scenarioInputSchema.optional(),
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
