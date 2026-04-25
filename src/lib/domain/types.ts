export type ScenarioMode = "fictional" | "real_company";
export type ClaimSourceType = "public_fact" | "inferred" | "user_assumption" | "synthetic";
export type SalesChannel = "direct" | "distributor" | "partner" | "ecommerce";
export type ValidationSeverity = "info" | "warning" | "error";

export interface ScenarioInput {
  mode: ScenarioMode;
  seed: number;
  companyName: string;
  companyUrl?: string;
  industry: string;
  revenueTarget: number;
  startYear: number;
  years: number;
  customerCount: number;
  skuCount: number;
  salesRepCount: number;
  regions: string[];
  channels: SalesChannel[];
  seasonality: "low" | "moderate" | "high";
  disruptionLevel: "low" | "moderate" | "high";
  returnsRate: number;
  rejectionRate: number;
  churnRate: number;
}

export interface ProfileClaim {
  id: string;
  field: string;
  value: string;
  sourceType: ClaimSourceType;
  confidence: number;
  sourceUrl?: string;
}

export interface CompanyProfile {
  companyName: string;
  industry: string;
  revenueTarget: number;
  regions: string[];
  channels: SalesChannel[];
  claims: ProfileClaim[];
}

export interface ProductFamily {
  id: string;
  name: string;
  marginBand: "low" | "medium" | "high";
  seasonalityWeight: number;
}

export interface Sku {
  id: string;
  skuCode: string;
  name: string;
  familyId: string;
  unitPrice: number;
  unitCost: number;
  launchDate: string;
  lifecycleStatus: "active" | "new_launch" | "discontinued";
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  region: string;
  territoryId: string;
  accountOwnerId: string;
  accountStatus: "active" | "lost";
  segment: "enterprise" | "mid_market" | "commercial";
  annualPotential: number;
  story: string;
  riskProfile: "low" | "medium" | "high";
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  role: "economic_buyer" | "technical_evaluator" | "procurement" | "operations";
  email: string;
}

export interface Salesperson {
  id: string;
  name: string;
  territoryId: string;
  quota: number;
  tenureMonths: number;
  rampStatus: "ramping" | "productive" | "veteran";
}

export interface Territory {
  id: string;
  name: string;
  region: string;
}

export interface Opportunity {
  id: string;
  customerId: string;
  salespersonId: string;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  expectedValue: number;
  closeDate: string;
  cycleDays: number;
  closeReason: string;
}

export interface Order {
  id: string;
  customerId: string;
  salespersonId: string;
  opportunityId: string;
  orderDate: string;
  status: "fulfilled" | "partial" | "backordered" | "cancelled";
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceDate: string;
  dueDate: string;
  status: "open" | "paid" | "credited";
  total: number;
}

export interface MonthlyRevenue {
  month: string;
  bookedRevenue: number;
  invoicedRevenue: number;
  creditedRevenue: number;
}

export interface SupplyEvent {
  id: string;
  skuId: string;
  startDate: string;
  endDate: string;
  eventType: "lead_time_extension" | "stockout" | "allocation";
  severity: "low" | "medium" | "high";
  narrative: string;
}

export interface ReturnRecord {
  id: string;
  orderId: string;
  customerId: string;
  reason: "damaged" | "incorrect_item" | "late_delivery" | "quality_issue";
  creditAmount: number;
  returnDate: string;
}

export interface RejectionRecord {
  id: string;
  orderId: string;
  customerId: string;
  reason: "failed_inspection" | "nonconforming_product" | "late_shipment";
  rejectedAmount: number;
  rejectionDate: string;
}

export interface CreditRecord {
  id: string;
  customerId: string;
  sourceId: string;
  sourceType: "return" | "rejection" | "commercial_concession";
  amount: number;
  creditDate: string;
}

export interface LifecycleEvent {
  id: string;
  customerId: string;
  eventDate: string;
  eventType: "lead_created" | "qualified" | "onboarded" | "first_order" | "expansion" | "contraction" | "lost";
  narrative: string;
}

export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
}

export interface GeneratedScenario {
  metadata: {
    scenarioId: string;
    generatedAt: string;
    seed: number;
    mode: ScenarioMode;
  };
  profile: CompanyProfile;
  tables: {
    productFamilies: ProductFamily[];
    skus: Sku[];
    customers: Customer[];
    contacts: Contact[];
    salespeople: Salesperson[];
    territories: Territory[];
    opportunities: Opportunity[];
    orders: Order[];
    orderLineItems: OrderLineItem[];
    invoices: Invoice[];
    monthlyRevenue: MonthlyRevenue[];
    supplyEvents: SupplyEvent[];
    returns: ReturnRecord[];
    rejections: RejectionRecord[];
    credits: CreditRecord[];
    lifecycleEvents: LifecycleEvent[];
  };
  validations: ValidationMessage[];
  assumptionsReport: string[];
}
