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
  returnsRate: z.number().min(0).max(0.2),
  rejectionRate: z.number().min(0).max(0.1),
  churnRate: z.number().min(0).max(0.3),
});

const claimSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  sourceType: z.enum(["public_fact", "inferred", "user_assumption", "synthetic"]),
  confidence: z.number().min(0).max(1),
  sourceUrl: z.string().url().optional(),
});

export const generatedScenarioSchema = z.object({
  metadata: z.object({
    scenarioId: z.string(),
    generatedAt: z.string(),
    seed: z.number().int(),
    mode: z.enum(["fictional", "real_company"]),
  }),
  profile: z.object({
    companyName: z.string(),
    industry: z.string(),
    revenueTarget: z.number(),
    regions: z.array(z.string()),
    channels: z.array(z.enum(["direct", "distributor", "partner", "ecommerce"])),
    claims: z.array(claimSchema),
  }),
  tables: z.object({
    productFamilies: z.array(z.any()),
    skus: z.array(z.any()),
    customers: z.array(z.any()),
    contacts: z.array(z.any()),
    salespeople: z.array(z.any()),
    territories: z.array(z.any()),
    opportunities: z.array(z.any()),
    orders: z.array(z.any()),
    orderLineItems: z.array(z.any()),
    invoices: z.array(z.any()),
    monthlyRevenue: z.array(z.any()),
    supplyEvents: z.array(z.any()),
    returns: z.array(z.any()),
    rejections: z.array(z.any()),
    credits: z.array(z.any()),
    lifecycleEvents: z.array(z.any()),
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
