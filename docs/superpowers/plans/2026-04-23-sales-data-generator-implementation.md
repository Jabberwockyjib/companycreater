# Sales Data Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of an interactive web app that generates source-grounded synthetic CRM, BI, and ERP-visible sales datasets for B2B product companies.

**Architecture:** Use a Next.js App Router application with server-side research/model adapters and a deterministic TypeScript simulation engine. LLMs can extract public facts and write narratives, but all reconciled numeric data is generated and validated by pure TypeScript modules. The UI lets users configure a scenario, generate data, inspect summaries/tables, and export CSV/JSON plus an assumptions report.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Zod, Vitest, Testing Library, Faker, Recharts, PapaParse, JSZip.

---

## Scope Check

The approved design describes a large product. This implementation plan builds a narrow but complete MVP:

- Fictional company mode works fully.
- Real-company-inspired mode has source collection, citation storage, and a deterministic fallback profile. Live LLM extraction is behind a provider interface and enabled only when credentials exist.
- CRM, BI, and ERP-visible sales effects are implemented.
- Full ERP internals remain out of scope, but IDs and relationships are designed so later ERP modules can attach.
- SQL export is represented by a data dictionary and JSON bundle in this plan; SQL seed output can be added after the schema stabilizes.

## File Structure

Create or modify these paths:

- `package.json`: npm scripts and dependencies.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: TypeScript configuration.
- `vitest.config.ts`: unit test configuration.
- `src/app/layout.tsx`: app shell metadata.
- `src/app/page.tsx`: main generator workspace.
- `src/app/globals.css`: global styling.
- `src/app/api/research/route.ts`: server route for public source discovery and profile extraction.
- `src/app/api/generate/route.ts`: server route for scenario generation.
- `src/app/api/export/route.ts`: server route for zip export.
- `src/components/generator/scenario-form.tsx`: scenario controls.
- `src/components/generator/profile-review.tsx`: sourced profile review.
- `src/components/generator/scenario-dashboard.tsx`: charts and summary metrics.
- `src/components/generator/data-preview.tsx`: table samples.
- `src/components/generator/export-panel.tsx`: export controls.
- `src/components/ui/button.tsx`: local button component.
- `src/components/ui/input.tsx`: local input component.
- `src/components/ui/select.tsx`: local select component.
- `src/lib/domain/types.ts`: domain types for generated data.
- `src/lib/domain/schemas.ts`: Zod schemas for inputs and generated output.
- `src/lib/domain/defaults.ts`: default assumptions and industry presets.
- `src/lib/research/sources.ts`: public source fetch and extraction helpers.
- `src/lib/research/profile-builder.ts`: profile normalization.
- `src/lib/model/types.ts`: LLM provider contracts.
- `src/lib/model/providers.ts`: provider selection and no-credential fallback.
- `src/lib/model/prompts.ts`: prompt templates for extraction and narratives.
- `src/lib/sim/random.ts`: seeded random helpers.
- `src/lib/sim/company.ts`: company profile scenario generation.
- `src/lib/sim/products.ts`: product families, SKUs, prices, launches.
- `src/lib/sim/customers.ts`: customers, contacts, onboarding, loss.
- `src/lib/sim/sales.ts`: salespeople, territories, quotas, opportunities.
- `src/lib/sim/orders.ts`: orders, invoices, revenue summaries.
- `src/lib/sim/supply.ts`: inventory snapshots, supply constraints, returns, rejections, credits.
- `src/lib/sim/validate.ts`: realism and reconciliation checks.
- `src/lib/sim/generate.ts`: orchestrates the simulator.
- `src/lib/export/csv.ts`: CSV serialization.
- `src/lib/export/json.ts`: JSON bundle and assumptions report.
- `src/lib/export/zip.ts`: zip packaging.
- `src/lib/format.ts`: currency, percent, date helpers.
- `tests/domain/schemas.test.ts`: schema coverage.
- `tests/sim/generate.test.ts`: full scenario generation tests.
- `tests/sim/validate.test.ts`: realism and reconciliation tests.
- `tests/export/export.test.ts`: export integrity tests.
- `tests/api/generate-route.test.ts`: API route smoke test.
- `.env.example`: supported provider keys and model names.
- `README.md`: local setup and operating notes.

## Task 1: Scaffold Next.js App and Test Harness

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Scaffold the app**

Run:

```bash
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Next.js files are created in the existing repo without deleting `docs/`.

- [ ] **Step 2: Install MVP dependencies**

Run:

```bash
npm install zod @faker-js/faker recharts papaparse jszip clsx
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: dependencies install and `package-lock.json` is updated.

- [ ] **Step 3: Add test scripts**

Edit `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 5: Add environment example**

Create `.env.example`:

```bash
LLM_PROVIDER=none
LLM_MODEL=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 6: Replace starter page with a neutral shell**

Create `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="border-b border-zinc-200 pb-4">
          <h1 className="text-2xl font-semibold">Sales Data Generator</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Generate synthetic CRM, BI, and sales operations data for B2B product companies.
          </p>
        </header>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Document local setup**

Create `README.md`:

````md
# Sales Data Generator

Interactive generator for realistic synthetic B2B product-company sales data.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test Commands

```bash
npm run test
npm run build
```

## LLM Configuration

The app runs without an LLM when `LLM_PROVIDER=none`. Provider-specific keys can be added in `.env.local` when model-backed research extraction is enabled.
````

- [ ] **Step 8: Verify scaffold**

Run:

```bash
npm run test
npm run build
```

Expected: tests pass with no test files or Vitest exits successfully, and Next.js build completes.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts src/app .env.example README.md
git commit -m "chore: scaffold sales data generator app"
```

## Task 2: Define Domain Types and Schemas

**Files:**
- Create: `src/lib/domain/types.ts`
- Create: `src/lib/domain/schemas.ts`
- Create: `src/lib/domain/defaults.ts`
- Create: `tests/domain/schemas.test.ts`

- [ ] **Step 1: Write schema tests first**

Create `tests/domain/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scenarioInputSchema, generatedScenarioSchema } from "@/lib/domain/schemas";
import { defaultScenarioInput } from "@/lib/domain/defaults";

describe("domain schemas", () => {
  it("accepts the default scenario input", () => {
    const parsed = scenarioInputSchema.parse(defaultScenarioInput);
    expect(parsed.revenueTarget).toBe(75000000);
    expect(parsed.mode).toBe("fictional");
  });

  it("rejects revenue targets outside the MVP band", () => {
    expect(() =>
      scenarioInputSchema.parse({ ...defaultScenarioInput, revenueTarget: 1000000 }),
    ).toThrow();
  });

  it("accepts an empty but structurally valid generated scenario", () => {
    const parsed = generatedScenarioSchema.parse({
      metadata: {
        scenarioId: "scenario_test",
        generatedAt: "2026-04-23T00:00:00.000Z",
        seed: 42,
        mode: "fictional",
      },
      profile: {
        companyName: "Acme Industrial Components",
        industry: "Industrial Components",
        revenueTarget: 75000000,
        regions: ["Northeast", "Midwest"],
        channels: ["direct", "distributor"],
        claims: [],
      },
      tables: {
        productFamilies: [],
        skus: [],
        customers: [],
        contacts: [],
        salespeople: [],
        territories: [],
        opportunities: [],
        orders: [],
        orderLineItems: [],
        invoices: [],
        monthlyRevenue: [],
        supplyEvents: [],
        returns: [],
        rejections: [],
        credits: [],
        lifecycleEvents: [],
      },
      validations: [],
      assumptionsReport: [],
    });
    expect(parsed.profile.companyName).toBe("Acme Industrial Components");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- tests/domain/schemas.test.ts
```

Expected: FAIL because `@/lib/domain/schemas` and `@/lib/domain/defaults` do not exist.

- [ ] **Step 3: Create domain types**

Create `src/lib/domain/types.ts`:

```ts
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
```

- [ ] **Step 4: Create Zod schemas**

Create `src/lib/domain/schemas.ts` with schemas mirroring the interfaces above:

```ts
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
```

- [ ] **Step 5: Add defaults and presets**

Create `src/lib/domain/defaults.ts`:

```ts
import type { ScenarioInput } from "./types";

export const defaultScenarioInput: ScenarioInput = {
  mode: "fictional",
  seed: 42,
  companyName: "Acme Industrial Components",
  companyUrl: "",
  industry: "Industrial Components",
  revenueTarget: 75_000_000,
  startYear: 2023,
  years: 3,
  customerCount: 120,
  skuCount: 160,
  salesRepCount: 14,
  regions: ["Northeast", "Midwest", "Southeast", "West"],
  channels: ["direct", "distributor"],
  seasonality: "moderate",
  disruptionLevel: "moderate",
  returnsRate: 0.035,
  rejectionRate: 0.012,
  churnRate: 0.08,
};

export const industryPresets = [
  "Industrial Components",
  "Packaging Materials",
  "Medical Devices",
  "Specialty Chemicals",
  "Foodservice Equipment",
] as const;
```

- [ ] **Step 6: Run schema tests**

Run:

```bash
npm run test -- tests/domain/schemas.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain tests/domain
git commit -m "feat: define scenario domain schema"
```

## Task 3: Build Seeded Random and Simulator Core

**Files:**
- Create: `src/lib/sim/random.ts`
- Create: `src/lib/sim/company.ts`
- Create: `src/lib/sim/products.ts`
- Create: `src/lib/sim/customers.ts`
- Create: `src/lib/sim/sales.ts`
- Create: `src/lib/sim/orders.ts`
- Create: `src/lib/sim/supply.ts`
- Create: `src/lib/sim/generate.ts`
- Create: `tests/sim/generate.test.ts`

- [ ] **Step 1: Write generation tests first**

Create `tests/sim/generate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generateScenario } from "@/lib/sim/generate";

describe("generateScenario", () => {
  it("generates a deterministic scenario for the same seed", () => {
    const first = generateScenario(defaultScenarioInput);
    const second = generateScenario(defaultScenarioInput);
    expect(first.metadata.scenarioId).toBe(second.metadata.scenarioId);
    expect(first.tables.customers[0].name).toBe(second.tables.customers[0].name);
    expect(first.tables.orders[0].total).toBe(second.tables.orders[0].total);
  });

  it("generates the requested table sizes", () => {
    const scenario = generateScenario(defaultScenarioInput);
    expect(scenario.tables.skus).toHaveLength(defaultScenarioInput.skuCount);
    expect(scenario.tables.customers).toHaveLength(defaultScenarioInput.customerCount);
    expect(scenario.tables.salespeople).toHaveLength(defaultScenarioInput.salesRepCount);
    expect(scenario.tables.orders.length).toBeGreaterThan(defaultScenarioInput.customerCount);
  });

  it("labels generated private operating data as synthetic", () => {
    const scenario = generateScenario(defaultScenarioInput);
    expect(scenario.profile.claims.some((claim) => claim.sourceType === "synthetic")).toBe(true);
    expect(scenario.assumptionsReport.join(" ")).toContain("synthetic");
  });

  it("generates explicit customer loss lifecycle events from churn assumptions", () => {
    const scenario = generateScenario(defaultScenarioInput);
    expect(scenario.tables.lifecycleEvents.some((event) => event.eventType === "lost")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- tests/sim/generate.test.ts
```

Expected: FAIL because `generateScenario` does not exist.

- [ ] **Step 3: Create seeded random helper**

Create `src/lib/sim/random.ts`:

```ts
export interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  money(min: number, max: number): number;
}

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    money(min, max) {
      return Math.round((next() * (max - min) + min) * 100) / 100;
    },
  };
}
```

- [ ] **Step 4: Implement company profile generation**

Create `src/lib/sim/company.ts`:

```ts
import type { CompanyProfile, ScenarioInput } from "@/lib/domain/types";

export function buildCompanyProfile(input: ScenarioInput): CompanyProfile {
  return {
    companyName: input.companyName,
    industry: input.industry,
    revenueTarget: input.revenueTarget,
    regions: input.regions,
    channels: input.channels,
    claims: [
      {
        id: "claim_revenue_target",
        field: "revenueTarget",
        value: String(input.revenueTarget),
        sourceType: "user_assumption",
        confidence: 1,
      },
      {
        id: "claim_private_data",
        field: "operatingData",
        value: "Customers, orders, revenue, reps, returns, and churn are synthetic.",
        sourceType: "synthetic",
        confidence: 1,
      },
    ],
  };
}
```

- [ ] **Step 5: Implement product generation**

Create `src/lib/sim/products.ts`:

```ts
import type { ProductFamily, ScenarioInput, Sku } from "@/lib/domain/types";
import type { RandomSource } from "./random";

const familyNames = ["Core Components", "Advanced Assemblies", "Replacement Parts", "Consumables", "Configured Systems"];

export function generateProducts(input: ScenarioInput, random: RandomSource) {
  const productFamilies: ProductFamily[] = familyNames.map((name, index) => ({
    id: `family_${index + 1}`,
    name,
    marginBand: random.pick(["low", "medium", "high"] as const),
    seasonalityWeight: Number((0.7 + random.next() * 0.6).toFixed(2)),
  }));

  const skus: Sku[] = Array.from({ length: input.skuCount }, (_, index) => {
    const family = productFamilies[index % productFamilies.length];
    const price = random.money(45, 8500);
    const margin = family.marginBand === "high" ? 0.58 : family.marginBand === "medium" ? 0.42 : 0.27;
    return {
      id: `sku_${index + 1}`,
      skuCode: `SKU-${String(index + 1).padStart(5, "0")}`,
      name: `${family.name} ${index + 1}`,
      familyId: family.id,
      unitPrice: price,
      unitCost: Math.round(price * (1 - margin) * 100) / 100,
      launchDate: `${input.startYear - random.int(0, 2)}-${String(random.int(1, 12)).padStart(2, "0")}-01`,
      lifecycleStatus: index < Math.max(3, Math.floor(input.skuCount * 0.08)) ? "new_launch" : "active",
    };
  });

  return { productFamilies, skus };
}
```

- [ ] **Step 6: Implement customer, contact, and lifecycle generation**

Create `src/lib/sim/customers.ts`:

```ts
import type { Contact, Customer, LifecycleEvent, ScenarioInput } from "@/lib/domain/types";
import type { RandomSource } from "./random";

const customerIndustries = ["Manufacturing", "Healthcare", "Distribution", "Construction", "Food Production", "Utilities"];
const companySuffixes = ["Works", "Systems", "Supply", "Manufacturing", "Group", "Industries"];

export function generateCustomers(input: ScenarioInput, random: RandomSource) {
  const customers: Customer[] = [];
  const contacts: Contact[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];

  for (let index = 0; index < input.customerCount; index += 1) {
    const id = `customer_${index + 1}`;
    const segment = index < input.customerCount * 0.12 ? "enterprise" : index < input.customerCount * 0.45 ? "mid_market" : "commercial";
    const name = `${random.pick(["Northstar", "Pioneer", "Summit", "Atlas", "Keystone", "Evergreen"])} ${random.pick(companySuffixes)}`;
    const annualPotential = segment === "enterprise" ? random.money(900000, 4500000) : segment === "mid_market" ? random.money(250000, 1100000) : random.money(50000, 300000);

    customers.push({
      id,
      name: `${name} ${index + 1}`,
      industry: random.pick(customerIndustries),
      region: random.pick(input.regions),
      segment,
      annualPotential,
      story: `${name} buys ${input.industry.toLowerCase()} products on a recurring operational cycle and evaluates suppliers on price, lead time, and quality.`,
      riskProfile: random.pick(["low", "medium", "high"] as const),
    });

    for (const role of ["economic_buyer", "procurement", "operations"] as const) {
      contacts.push({
        id: `contact_${contacts.length + 1}`,
        customerId: id,
        name: `${random.pick(["Alex", "Jordan", "Taylor", "Morgan", "Casey"])} ${random.pick(["Reed", "Patel", "Chen", "Garcia", "Miller"])}`,
        role,
        email: `contact${contacts.length + 1}@example.com`,
      });
    }

    lifecycleEvents.push({
      id: `lifecycle_${lifecycleEvents.length + 1}`,
      customerId: id,
      eventDate: `${input.startYear}-01-${String((index % 27) + 1).padStart(2, "0")}`,
      eventType: "onboarded",
      narrative: "Customer onboarding completed before recurring order activity began.",
    });

    if (index < Math.max(1, Math.floor(input.customerCount * input.churnRate))) {
      lifecycleEvents.push({
        id: `lifecycle_${lifecycleEvents.length + 1}`,
        customerId: id,
        eventDate: `${input.startYear + input.years - 1}-${String(random.int(7, 12)).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`,
        eventType: "lost",
        narrative: "Customer was lost after price pressure, supply reliability issues, or a competitor displacement.",
      });
    }
  }

  return { customers, contacts, lifecycleEvents };
}
```

- [ ] **Step 7: Implement sales organization and opportunity generation**

Create `src/lib/sim/sales.ts`:

```ts
import type { Customer, Opportunity, Salesperson, ScenarioInput, Territory } from "@/lib/domain/types";
import type { RandomSource } from "./random";

export function generateSalesOrg(input: ScenarioInput, customers: Customer[], random: RandomSource) {
  const territories: Territory[] = input.regions.map((region, index) => ({
    id: `territory_${index + 1}`,
    name: `${region} Territory`,
    region,
  }));

  const annualQuotaPool = input.revenueTarget * 1.12;
  const salespeople: Salesperson[] = Array.from({ length: input.salesRepCount }, (_, index) => ({
    id: `rep_${index + 1}`,
    name: `${random.pick(["Jamie", "Riley", "Avery", "Drew", "Skyler"])} ${random.pick(["Brooks", "Hayes", "Kim", "Nguyen", "Singh"])}`,
    territoryId: territories[index % territories.length].id,
    quota: Math.round(annualQuotaPool / input.salesRepCount),
    tenureMonths: random.int(4, 96),
    rampStatus: random.pick(["ramping", "productive", "veteran"] as const),
  }));

  const opportunities: Opportunity[] = customers.map((customer, index) => {
    const salesperson = salespeople[index % salespeople.length];
    const won = random.next() > 0.22;
    return {
      id: `opp_${index + 1}`,
      customerId: customer.id,
      salespersonId: salesperson.id,
      stage: won ? "closed_won" : "closed_lost",
      expectedValue: Math.round(customer.annualPotential * (0.25 + random.next() * 0.5)),
      closeDate: `${input.startYear + input.years - 1}-${String(random.int(1, 12)).padStart(2, "0")}-${String(random.int(1, 28)).padStart(2, "0")}`,
      cycleDays: customer.segment === "enterprise" ? random.int(90, 210) : customer.segment === "mid_market" ? random.int(45, 120) : random.int(14, 60),
      closeReason: won ? "Won on product fit, reliable supply, and account coverage." : "Lost to price pressure or incumbent supplier relationship.",
    };
  });

  return { territories, salespeople, opportunities };
}
```

- [ ] **Step 8: Implement orders and invoices**

Create `src/lib/sim/orders.ts`:

```ts
import type { Customer, Invoice, MonthlyRevenue, Order, OrderLineItem, Salesperson, ScenarioInput, Sku } from "@/lib/domain/types";
import type { RandomSource } from "./random";

export function generateOrders(input: ScenarioInput, customers: Customer[], skus: Sku[], salespeople: Salesperson[], random: RandomSource) {
  const orders: Order[] = [];
  const orderLineItems: OrderLineItem[] = [];
  const invoices: Invoice[] = [];
  const monthlyRevenueMap = new Map<string, MonthlyRevenue>();
  const totalMonths = input.years * 12;
  const targetMonthlyRevenue = input.revenueTarget / 12;

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex += 1) {
    const year = input.startYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthTarget = targetMonthlyRevenue * (input.seasonality === "high" && [9, 10, 11].includes(month) ? 1.25 : 1);
    let booked = 0;

    while (booked < monthTarget * 0.92) {
      const customer = random.pick(customers);
      const salesperson = salespeople[customers.indexOf(customer) % salespeople.length];
      const orderId = `order_${orders.length + 1}`;
      const lineCount = random.int(1, 5);
      let subtotal = 0;

      for (let line = 0; line < lineCount; line += 1) {
        const sku = random.pick(skus);
        const quantity = random.int(1, customer.segment === "enterprise" ? 80 : 25);
        const discountRate = customer.segment === "enterprise" ? 0.08 : customer.segment === "mid_market" ? 0.05 : 0.02;
        const lineTotal = Math.round(sku.unitPrice * quantity * (1 - discountRate) * 100) / 100;
        subtotal += lineTotal;
        orderLineItems.push({
          id: `line_${orderLineItems.length + 1}`,
          orderId,
          skuId: sku.id,
          quantity,
          unitPrice: sku.unitPrice,
          discountRate,
          lineTotal,
        });
      }

      const discountAmount = Math.round(subtotal * 0.01 * 100) / 100;
      const total = Math.round((subtotal - discountAmount) * 100) / 100;
      booked += total;

      orders.push({
        id: orderId,
        customerId: customer.id,
        salespersonId: salesperson.id,
        orderDate: `${monthKey}-${String(random.int(1, 28)).padStart(2, "0")}`,
        status: "fulfilled",
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount,
        total,
      });
      invoices.push({
        id: `invoice_${invoices.length + 1}`,
        orderId,
        invoiceDate: `${monthKey}-${String(random.int(1, 28)).padStart(2, "0")}`,
        dueDate: `${monthKey}-28`,
        status: "paid",
        total,
      });
    }

    monthlyRevenueMap.set(monthKey, {
      month: monthKey,
      bookedRevenue: Math.round(booked * 100) / 100,
      invoicedRevenue: Math.round(booked * 100) / 100,
      creditedRevenue: 0,
    });
  }

  return { orders, orderLineItems, invoices, monthlyRevenue: [...monthlyRevenueMap.values()] };
}
```

- [ ] **Step 9: Implement supply events, returns, rejections, credits**

Create `src/lib/sim/supply.ts`:

```ts
import type { CreditRecord, Customer, Order, RejectionRecord, ReturnRecord, ScenarioInput, Sku, SupplyEvent } from "@/lib/domain/types";
import type { RandomSource } from "./random";

export function generateSupplyEffects(input: ScenarioInput, orders: Order[], customers: Customer[], skus: Sku[], random: RandomSource) {
  const eventRate = input.disruptionLevel === "high" ? 0.08 : input.disruptionLevel === "moderate" ? 0.04 : 0.015;
  const supplyEvents: SupplyEvent[] = skus.filter(() => random.next() < eventRate).map((sku, index) => ({
    id: `supply_event_${index + 1}`,
    skuId: sku.id,
    startDate: `${input.startYear + input.years - 1}-${String(random.int(1, 10)).padStart(2, "0")}-01`,
    endDate: `${input.startYear + input.years - 1}-${String(random.int(2, 12)).padStart(2, "0")}-20`,
    eventType: random.pick(["lead_time_extension", "stockout", "allocation"] as const),
    severity: random.pick(["low", "medium", "high"] as const),
    narrative: "Supply constraint created delays, partial fulfillment risk, or customer service pressure.",
  }));

  const returns: ReturnRecord[] = [];
  const rejections: RejectionRecord[] = [];
  const credits: CreditRecord[] = [];

  for (const order of orders) {
    const customer = customers.find((item) => item.id === order.customerId);
    if (!customer) {
      continue;
    }

    if (random.next() < input.returnsRate) {
      const record: ReturnRecord = {
        id: `return_${returns.length + 1}`,
        orderId: order.id,
        customerId: customer.id,
        reason: random.pick(["damaged", "incorrect_item", "late_delivery", "quality_issue"] as const),
        creditAmount: Math.round(order.total * random.money(0.05, 0.45) * 100) / 100,
        returnDate: order.orderDate,
      };
      returns.push(record);
      credits.push({
        id: `credit_${credits.length + 1}`,
        customerId: customer.id,
        sourceId: record.id,
        sourceType: "return",
        amount: record.creditAmount,
        creditDate: record.returnDate,
      });
    }

    if (random.next() < input.rejectionRate) {
      const record: RejectionRecord = {
        id: `rejection_${rejections.length + 1}`,
        orderId: order.id,
        customerId: customer.id,
        reason: random.pick(["failed_inspection", "nonconforming_product", "late_shipment"] as const),
        rejectedAmount: Math.round(order.total * random.money(0.1, 0.7) * 100) / 100,
        rejectionDate: order.orderDate,
      };
      rejections.push(record);
      credits.push({
        id: `credit_${credits.length + 1}`,
        customerId: customer.id,
        sourceId: record.id,
        sourceType: "rejection",
        amount: record.rejectedAmount,
        creditDate: record.rejectionDate,
      });
    }
  }

  return { supplyEvents, returns, rejections, credits };
}
```

- [ ] **Step 10: Wire simulator orchestration**

Create `src/lib/sim/generate.ts`:

```ts
import { generatedScenarioSchema, scenarioInputSchema } from "@/lib/domain/schemas";
import type { GeneratedScenario, ScenarioInput } from "@/lib/domain/types";
import { buildCompanyProfile } from "./company";
import { generateCustomers } from "./customers";
import { generateOrders } from "./orders";
import { generateProducts } from "./products";
import { createRandom } from "./random";
import { generateSalesOrg } from "./sales";
import { generateSupplyEffects } from "./supply";

export function generateScenario(rawInput: ScenarioInput): GeneratedScenario {
  const input = scenarioInputSchema.parse(rawInput);
  const random = createRandom(input.seed);
  const profile = buildCompanyProfile(input);
  const { productFamilies, skus } = generateProducts(input, random);
  const { customers, contacts, lifecycleEvents } = generateCustomers(input, random);
  const { territories, salespeople, opportunities } = generateSalesOrg(input, customers, random);
  const { orders, orderLineItems, invoices, monthlyRevenue } = generateOrders(input, customers, skus, salespeople, random);
  const { supplyEvents, returns, rejections, credits } = generateSupplyEffects(input, orders, customers, skus, random);

  for (const credit of credits) {
    const month = credit.creditDate.slice(0, 7);
    const summary = monthlyRevenue.find((item) => item.month === month);
    if (summary) {
      summary.creditedRevenue = Math.round((summary.creditedRevenue + credit.amount) * 100) / 100;
    }
  }

  const scenario: GeneratedScenario = {
    metadata: {
      scenarioId: `scenario_${input.seed}_${input.startYear}_${input.years}`,
      generatedAt: new Date("2026-04-23T00:00:00.000Z").toISOString(),
      seed: input.seed,
      mode: input.mode,
    },
    profile,
    tables: {
      productFamilies,
      skus,
      customers,
      contacts,
      salespeople,
      territories,
      opportunities,
      orders,
      orderLineItems,
      invoices,
      monthlyRevenue,
      supplyEvents,
      returns,
      rejections,
      credits,
      lifecycleEvents,
    },
    validations: [],
    assumptionsReport: [
      "All private customer, order, revenue, salesperson, return, rejection, and churn data is synthetic.",
      `Revenue target supplied by user: ${input.revenueTarget}.`,
      `Supply disruption level: ${input.disruptionLevel}.`,
    ],
  };

  return generatedScenarioSchema.parse(scenario) as GeneratedScenario;
}
```

- [ ] **Step 11: Run simulator tests**

Run:

```bash
npm run test -- tests/sim/generate.test.ts
```

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/lib/sim tests/sim/generate.test.ts
git commit -m "feat: add deterministic scenario simulator"
```

## Task 4: Add Realism Validation

**Files:**
- Create: `src/lib/sim/validate.ts`
- Modify: `src/lib/sim/generate.ts`
- Create: `tests/sim/validate.test.ts`

- [ ] **Step 1: Write validation tests first**

Create `tests/sim/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generateScenario } from "@/lib/sim/generate";
import { validateScenario } from "@/lib/sim/validate";

describe("validateScenario", () => {
  it("checks revenue reconciliation and relationship integrity", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const messages = validateScenario(scenario, defaultScenarioInput);
    expect(messages.some((message) => message.code === "revenue_reconciled")).toBe(true);
    expect(messages.some((message) => message.severity === "error")).toBe(false);
  });

  it("flags broken order line references", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orderLineItems[0].orderId = "missing_order";
    const messages = validateScenario(scenario, defaultScenarioInput);
    expect(messages.some((message) => message.code === "missing_order_reference" && message.severity === "error")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- tests/sim/validate.test.ts
```

Expected: FAIL because `validateScenario` does not exist.

- [ ] **Step 3: Implement validations**

Create `src/lib/sim/validate.ts`:

```ts
import type { GeneratedScenario, ScenarioInput, ValidationMessage } from "@/lib/domain/types";

export function validateScenario(scenario: GeneratedScenario, input: ScenarioInput): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const orderIds = new Set(scenario.tables.orders.map((order) => order.id));
  const skuIds = new Set(scenario.tables.skus.map((sku) => sku.id));
  const customerIds = new Set(scenario.tables.customers.map((customer) => customer.id));
  const bookedRevenue = scenario.tables.monthlyRevenue.reduce((sum, item) => sum + item.bookedRevenue, 0) / input.years;
  const tolerance = input.revenueTarget * 0.2;

  if (Math.abs(bookedRevenue - input.revenueTarget) <= tolerance) {
    messages.push({
      code: "revenue_reconciled",
      severity: "info",
      message: "Average booked annual revenue is within the MVP reconciliation tolerance.",
    });
  } else {
    messages.push({
      code: "revenue_out_of_tolerance",
      severity: "warning",
      message: `Average booked annual revenue ${Math.round(bookedRevenue)} is outside target ${input.revenueTarget}.`,
    });
  }

  for (const line of scenario.tables.orderLineItems) {
    if (!orderIds.has(line.orderId)) {
      messages.push({
        code: "missing_order_reference",
        severity: "error",
        message: `Order line ${line.id} references missing order ${line.orderId}.`,
      });
    }
    if (!skuIds.has(line.skuId)) {
      messages.push({
        code: "missing_sku_reference",
        severity: "error",
        message: `Order line ${line.id} references missing SKU ${line.skuId}.`,
      });
    }
  }

  for (const order of scenario.tables.orders) {
    if (!customerIds.has(order.customerId)) {
      messages.push({
        code: "missing_customer_reference",
        severity: "error",
        message: `Order ${order.id} references missing customer ${order.customerId}.`,
      });
    }
  }

  return messages;
}
```

- [ ] **Step 4: Attach validations during generation**

Modify `src/lib/sim/generate.ts`:

```ts
import { validateScenario } from "./validate";
```

Set validations before returning:

```ts
scenario.validations = validateScenario(scenario, input);
return generatedScenarioSchema.parse(scenario) as GeneratedScenario;
```

- [ ] **Step 5: Run validation and generation tests**

Run:

```bash
npm run test -- tests/sim/generate.test.ts tests/sim/validate.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sim/generate.ts src/lib/sim/validate.ts tests/sim/validate.test.ts
git commit -m "feat: add scenario realism validation"
```

## Task 5: Add Research and LLM Provider Abstractions

**Files:**
- Create: `src/lib/research/sources.ts`
- Create: `src/lib/research/profile-builder.ts`
- Create: `src/lib/model/types.ts`
- Create: `src/lib/model/providers.ts`
- Create: `src/lib/model/prompts.ts`
- Create: `src/app/api/research/route.ts`

- [ ] **Step 1: Create model contracts**

Create `src/lib/model/types.ts`:

```ts
export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ModelResult<T> {
  data: T;
  usage: ModelUsage;
  provider: string;
  model: string;
}

export interface LlmProvider {
  extractJson<T>(args: {
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<ModelResult<T>>;
}
```

- [ ] **Step 2: Create prompt templates**

Create `src/lib/model/prompts.ts`:

```ts
export const researchExtractionSystemPrompt =
  "Extract only public factual signals and clearly separate public facts from inference. Never invent private customer, revenue, order, salesperson, quota, return, or churn data.";

export function buildResearchExtractionPrompt(sourceText: string) {
  return `Extract product families, markets, channels, geographies, launches, buyer segments, and industry language from this public source text. Return concise structured JSON.\n\nSOURCE:\n${sourceText.slice(0, 12000)}`;
}
```

- [ ] **Step 3: Create provider selection with safe fallback**

Create `src/lib/model/providers.ts`:

```ts
import type { LlmProvider, ModelResult } from "./types";

class NoopProvider implements LlmProvider {
  async extractJson<T>(): Promise<ModelResult<T>> {
    return {
      data: {} as T,
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
      provider: "none",
      model: "none",
    };
  }
}

export function getLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "none";
  if (provider === "none") {
    return new NoopProvider();
  }

  return new NoopProvider();
}
```

- [ ] **Step 4: Create public source collector**

Create `src/lib/research/sources.ts`:

```ts
export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  retrievedAt: string;
  text: string;
}

export async function collectResearchSources(companyName: string, companyUrl?: string): Promise<ResearchSource[]> {
  if (!companyUrl) {
    return [
      {
        id: "source_user_company_name",
        url: "about:blank",
        title: companyName,
        retrievedAt: new Date().toISOString(),
        text: `${companyName} public web research was not provided with a URL. The app will use a conservative inferred profile.`,
      },
    ];
  }

  const response = await fetch(companyUrl, { headers: { "user-agent": "sales-data-generator/0.1" } });
  const text = await response.text();

  return [
    {
      id: "source_company_homepage",
      url: companyUrl,
      title: companyName,
      retrievedAt: new Date().toISOString(),
      text: text.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 20000),
    },
  ];
}
```

- [ ] **Step 5: Create profile builder**

Create `src/lib/research/profile-builder.ts`:

```ts
import type { CompanyProfile, ScenarioInput } from "@/lib/domain/types";
import type { ResearchSource } from "./sources";

export function buildProfileFromSources(input: ScenarioInput, sources: ResearchSource[]): CompanyProfile {
  return {
    companyName: input.companyName,
    industry: input.industry,
    revenueTarget: input.revenueTarget,
    regions: input.regions,
    channels: input.channels,
    claims: [
      ...sources.map((source, index) => ({
        id: `public_claim_${index + 1}`,
        field: "source",
        value: `Public source reviewed: ${source.title}`,
        sourceType: "public_fact" as const,
        confidence: source.url === "about:blank" ? 0.2 : 0.7,
        sourceUrl: source.url === "about:blank" ? undefined : source.url,
      })),
      {
        id: "inferred_profile_scope",
        field: "profileScope",
        value: "Operating profile is inferred from public signals and user assumptions.",
        sourceType: "inferred",
        confidence: 0.6,
      },
    ],
  };
}
```

- [ ] **Step 6: Add research API route**

Create `src/app/api/research/route.ts`:

```ts
import { NextResponse } from "next/server";
import { scenarioInputSchema } from "@/lib/domain/schemas";
import { buildProfileFromSources } from "@/lib/research/profile-builder";
import { collectResearchSources } from "@/lib/research/sources";

export async function POST(request: Request) {
  const body = await request.json();
  const input = scenarioInputSchema.parse(body);
  const sources = await collectResearchSources(input.companyName, input.companyUrl || undefined);
  const profile = buildProfileFromSources(input, sources);

  return NextResponse.json({ profile, sources });
}
```

- [ ] **Step 7: Verify app build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/research src/lib/model src/app/api/research
git commit -m "feat: add research and model abstraction"
```

## Task 6: Add Generation API Route

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `tests/api/generate-route.test.ts`

- [ ] **Step 1: Write route smoke test**

Create `tests/api/generate-route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate/route";
import { defaultScenarioInput } from "@/lib/domain/defaults";

describe("POST /api/generate", () => {
  it("returns a generated scenario", async () => {
    const response = await POST(new Request("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify(defaultScenarioInput),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.tables.customers).toHaveLength(defaultScenarioInput.customerCount);
    expect(body.validations.some((message: { severity: string }) => message.severity === "error")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm run test -- tests/api/generate-route.test.ts
```

Expected: FAIL because route does not exist.

- [ ] **Step 3: Create route**

Create `src/app/api/generate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { scenarioInputSchema } from "@/lib/domain/schemas";
import { generateScenario } from "@/lib/sim/generate";

export async function POST(request: Request) {
  const body = await request.json();
  const input = scenarioInputSchema.parse(body);
  const scenario = generateScenario(input);
  return NextResponse.json(scenario);
}
```

- [ ] **Step 4: Run route test**

Run:

```bash
npm run test -- tests/api/generate-route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate tests/api/generate-route.test.ts
git commit -m "feat: expose scenario generation API"
```

## Task 7: Add Export Serialization and API

**Files:**
- Create: `src/lib/export/csv.ts`
- Create: `src/lib/export/json.ts`
- Create: `src/lib/export/zip.ts`
- Create: `src/app/api/export/route.ts`
- Create: `tests/export/export.test.ts`

- [ ] **Step 1: Write export tests first**

Create `tests/export/export.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { scenarioToCsvFiles } from "@/lib/export/csv";
import { scenarioToJsonBundle } from "@/lib/export/json";
import { generateScenario } from "@/lib/sim/generate";

describe("exports", () => {
  it("creates CSV files for core tables", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const files = scenarioToCsvFiles(scenario);
    expect(files["customers.csv"]).toContain("id,name,industry");
    expect(files["orders.csv"]).toContain("id,customerId,salespersonId");
    expect(files["returns.csv"]).toContain("creditAmount");
  });

  it("creates JSON bundle with assumptions report", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const bundle = scenarioToJsonBundle(scenario);
    expect(bundle.scenario.metadata.scenarioId).toBe(scenario.metadata.scenarioId);
    expect(bundle.dataDictionary.customers).toContain("Synthetic customer accounts");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- tests/export/export.test.ts
```

Expected: FAIL because export modules do not exist.

- [ ] **Step 3: Implement CSV serialization**

Create `src/lib/export/csv.ts`:

```ts
import Papa from "papaparse";
import type { GeneratedScenario } from "@/lib/domain/types";

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  return Papa.unparse(rows);
}

export function scenarioToCsvFiles(scenario: GeneratedScenario): Record<string, string> {
  return {
    "product_families.csv": toCsv(scenario.tables.productFamilies as unknown as Record<string, unknown>[]),
    "skus.csv": toCsv(scenario.tables.skus as unknown as Record<string, unknown>[]),
    "customers.csv": toCsv(scenario.tables.customers as unknown as Record<string, unknown>[]),
    "contacts.csv": toCsv(scenario.tables.contacts as unknown as Record<string, unknown>[]),
    "salespeople.csv": toCsv(scenario.tables.salespeople as unknown as Record<string, unknown>[]),
    "territories.csv": toCsv(scenario.tables.territories as unknown as Record<string, unknown>[]),
    "opportunities.csv": toCsv(scenario.tables.opportunities as unknown as Record<string, unknown>[]),
    "orders.csv": toCsv(scenario.tables.orders as unknown as Record<string, unknown>[]),
    "order_line_items.csv": toCsv(scenario.tables.orderLineItems as unknown as Record<string, unknown>[]),
    "invoices.csv": toCsv(scenario.tables.invoices as unknown as Record<string, unknown>[]),
    "monthly_revenue.csv": toCsv(scenario.tables.monthlyRevenue as unknown as Record<string, unknown>[]),
    "supply_events.csv": toCsv(scenario.tables.supplyEvents as unknown as Record<string, unknown>[]),
    "returns.csv": toCsv(scenario.tables.returns as unknown as Record<string, unknown>[]),
    "rejections.csv": toCsv(scenario.tables.rejections as unknown as Record<string, unknown>[]),
    "credits.csv": toCsv(scenario.tables.credits as unknown as Record<string, unknown>[]),
    "lifecycle_events.csv": toCsv(scenario.tables.lifecycleEvents as unknown as Record<string, unknown>[]),
  };
}
```

- [ ] **Step 4: Implement JSON bundle**

Create `src/lib/export/json.ts`:

```ts
import type { GeneratedScenario } from "@/lib/domain/types";

export function scenarioToJsonBundle(scenario: GeneratedScenario) {
  return {
    scenario,
    dataDictionary: {
      customers: "Synthetic customer accounts with industry, segment, region, story, potential, and risk profile.",
      skus: "Synthetic SKU catalog grounded by product families, price, cost, launch date, and lifecycle status.",
      orders: "Synthetic order headers with customer, salesperson, date, status, and totals.",
      returns: "Synthetic return records tied to original orders and credits.",
      rejections: "Synthetic rejected order records tied to original orders and credits.",
      supplyEvents: "ERP-visible supply constraints that affect fulfillment realism.",
    },
  };
}
```

- [ ] **Step 5: Implement zip packaging**

Create `src/lib/export/zip.ts`:

```ts
import JSZip from "jszip";
import type { GeneratedScenario } from "@/lib/domain/types";
import { scenarioToCsvFiles } from "./csv";
import { scenarioToJsonBundle } from "./json";

export async function scenarioToZip(scenario: GeneratedScenario): Promise<Uint8Array> {
  const zip = new JSZip();
  const csvFiles = scenarioToCsvFiles(scenario);

  for (const [fileName, contents] of Object.entries(csvFiles)) {
    zip.file(`csv/${fileName}`, contents);
  }

  zip.file("scenario.json", JSON.stringify(scenarioToJsonBundle(scenario), null, 2));
  zip.file("assumptions_report.txt", scenario.assumptionsReport.join("\n"));

  return zip.generateAsync({ type: "uint8array" });
}
```

- [ ] **Step 6: Add export route**

Create `src/app/api/export/route.ts`:

```ts
import { NextResponse } from "next/server";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import { scenarioToZip } from "@/lib/export/zip";

export async function POST(request: Request) {
  const body = await request.json();
  const scenario = generatedScenarioSchema.parse(body);
  const zip = await scenarioToZip(scenario);

  return new NextResponse(zip, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${scenario.metadata.scenarioId}.zip"`,
    },
  });
}
```

- [ ] **Step 7: Run export tests**

Run:

```bash
npm run test -- tests/export/export.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/export src/app/api/export tests/export
git commit -m "feat: add scenario export bundle"
```

## Task 8: Build Generator Workspace UI

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/generator/scenario-form.tsx`
- Create: `src/components/generator/profile-review.tsx`
- Create: `src/components/generator/scenario-dashboard.tsx`
- Create: `src/components/generator/data-preview.tsx`
- Create: `src/components/generator/export-panel.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/lib/format.ts`

- [ ] **Step 1: Create UI primitives**

Create `src/components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
```

Create `src/components/ui/input.tsx`:

```tsx
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm", className)} {...props} />;
}
```

Create `src/components/ui/select.tsx`:

```tsx
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx("h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm", className)} {...props} />;
}
```

- [ ] **Step 2: Add format helpers**

Create `src/lib/format.ts`:

```ts
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}
```

- [ ] **Step 3: Create scenario form**

Create `src/components/generator/scenario-form.tsx` with controlled inputs for `ScenarioInput` and a generate button:

```tsx
"use client";

import type { ScenarioInput } from "@/lib/domain/types";
import { industryPresets } from "@/lib/domain/defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ScenarioFormProps {
  value: ScenarioInput;
  isGenerating: boolean;
  onChange: (value: ScenarioInput) => void;
  onGenerate: () => void;
}

export function ScenarioForm({ value, isGenerating, onChange, onGenerate }: ScenarioFormProps) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Mode</span>
          <Select value={value.mode} onChange={(event) => onChange({ ...value, mode: event.target.value as ScenarioInput["mode"] })}>
            <option value="fictional">Fictional</option>
            <option value="real_company">Real-company inspired</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Company</span>
          <Input value={value.companyName} onChange={(event) => onChange({ ...value, companyName: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Industry</span>
          <Select value={value.industry} onChange={(event) => onChange({ ...value, industry: event.target.value })}>
            {industryPresets.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Revenue Target</span>
          <Input type="number" value={value.revenueTarget} onChange={(event) => onChange({ ...value, revenueTarget: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Customers</span>
          <Input type="number" value={value.customerCount} onChange={(event) => onChange({ ...value, customerCount: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">SKUs</span>
          <Input type="number" value={value.skuCount} onChange={(event) => onChange({ ...value, skuCount: Number(event.target.value) })} />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onGenerate} disabled={isGenerating}>{isGenerating ? "Generating" : "Generate Scenario"}</Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create dashboard component**

Create `src/components/generator/scenario-dashboard.tsx`:

```tsx
import type { ReactNode } from "react";
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function ScenarioDashboard({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return <section className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Generate a scenario to preview revenue, customers, orders, and supply effects.</section>;
  }

  const revenue = scenario.tables.monthlyRevenue.reduce((sum, item) => sum + item.bookedRevenue, 0);

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase text-zinc-500">Booked Revenue</div>
        <div className="mt-1 text-xl font-semibold">{formatCurrency(revenue)}</div>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase text-zinc-500">Customers</div>
        <div className="mt-1 text-xl font-semibold">{scenario.tables.customers.length}</div>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase text-zinc-500">Orders</div>
        <div className="mt-1 text-xl font-semibold">{scenario.tables.orders.length}</div>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase text-zinc-500">Supply Events</div>
        <div className="mt-1 text-xl font-semibold">{scenario.tables.supplyEvents.length}</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create profile review component**

Create `src/components/generator/profile-review.tsx`:

```tsx
import type { GeneratedScenario } from "@/lib/domain/types";

export function ProfileReview({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Profile Claims</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-2 pr-4">Field</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scenario.profile.claims.map((claim) => (
              <tr key={claim.id} className="border-t border-zinc-100">
                <td className="py-2 pr-4">{claim.field}</td>
                <td className="py-2 pr-4">{claim.value}</td>
                <td className="py-2 pr-4">{claim.sourceType}</td>
                <td className="py-2 pr-4">{Math.round(claim.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create data preview component**

Create `src/components/generator/data-preview.tsx`:

```tsx
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function DataPreview({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <PreviewBlock title="Customers">
        {scenario.tables.customers.slice(0, 5).map((customer) => (
          <tr key={customer.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{customer.name}</td>
            <td className="py-2 pr-4">{customer.segment}</td>
            <td className="py-2 pr-4">{customer.region}</td>
            <td className="py-2 pr-4">{formatCurrency(customer.annualPotential)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Orders">
        {scenario.tables.orders.slice(0, 5).map((order) => (
          <tr key={order.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{order.id}</td>
            <td className="py-2 pr-4">{order.orderDate}</td>
            <td className="py-2 pr-4">{order.status}</td>
            <td className="py-2 pr-4">{formatCurrency(order.total)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Returns">
        {scenario.tables.returns.slice(0, 5).map((record) => (
          <tr key={record.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{record.id}</td>
            <td className="py-2 pr-4">{record.reason}</td>
            <td className="py-2 pr-4">{record.returnDate}</td>
            <td className="py-2 pr-4">{formatCurrency(record.creditAmount)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Rejections">
        {scenario.tables.rejections.slice(0, 5).map((record) => (
          <tr key={record.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{record.id}</td>
            <td className="py-2 pr-4">{record.reason}</td>
            <td className="py-2 pr-4">{record.rejectionDate}</td>
            <td className="py-2 pr-4">{formatCurrency(record.rejectedAmount)}</td>
          </tr>
        ))}
      </PreviewBlock>
    </section>
  );
}

function PreviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create export panel component**

Create `src/components/generator/export-panel.tsx`:

```tsx
"use client";

import type { GeneratedScenario } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";

export function ExportPanel({ scenario }: { scenario: GeneratedScenario | null }) {
  async function exportScenario() {
    if (!scenario) {
      return;
    }

    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.metadata.scenarioId}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold">Export</h2>
        <p className="mt-1 text-sm text-zinc-600">Download CSV files, JSON bundle, and assumptions report.</p>
      </div>
      <Button disabled={!scenario} onClick={exportScenario}>Export ZIP</Button>
    </section>
  );
}
```

- [ ] **Step 8: Wire main page as a client workspace**

Modify `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { DataPreview } from "@/components/generator/data-preview";
import { ExportPanel } from "@/components/generator/export-panel";
import { ProfileReview } from "@/components/generator/profile-review";
import { ScenarioDashboard } from "@/components/generator/scenario-dashboard";
import { ScenarioForm } from "@/components/generator/scenario-form";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import type { GeneratedScenario, ScenarioInput } from "@/lib/domain/types";

export default function Home() {
  const [input, setInput] = useState<ScenarioInput>(defaultScenarioInput);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generate() {
    setIsGenerating(true);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    setScenario(await response.json());
    setIsGenerating(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6">
        <header className="border-b border-zinc-200 pb-4">
          <h1 className="text-2xl font-semibold">Sales Data Generator</h1>
          <p className="mt-1 text-sm text-zinc-600">Generate synthetic CRM, BI, and sales operations data for B2B product companies.</p>
        </header>
        <ScenarioForm value={input} isGenerating={isGenerating} onChange={setInput} onGenerate={generate} />
        <ScenarioDashboard scenario={scenario} />
        <ProfileReview scenario={scenario} />
        <DataPreview scenario={scenario} />
        <ExportPanel scenario={scenario} />
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Build and manually inspect**

Run:

```bash
npm run build
npm run dev
```

Expected: app runs at `http://localhost:3000`, the generator form renders, clicking generate populates dashboard metrics and table previews, and export downloads a zip.

- [ ] **Step 10: Commit**

```bash
git add src/app/page.tsx src/components src/lib/format.ts
git commit -m "feat: build scenario generator workspace"
```

## Task 9: Final Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-04-23-sales-data-generator-design.md` only if implementation discoveries require a spec correction.

- [ ] **Step 1: Update README with MVP scope**

Add:

```md
## MVP Scope

This version fully supports fictional B2B product-company generation. Real-company-inspired mode stores public-source claims and can be connected to an LLM provider through the model abstraction, while generated operating data remains synthetic.

Generated tables include products, SKUs, customers, contacts, salespeople, territories, opportunities, orders, invoices, monthly revenue, supply events, returns, rejections, credits, and lifecycle events.
```

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run test
npm run build
git status --short
```

Expected:

```text
PASS
Compiled successfully
```

`git status --short` should show only intentional documentation edits before the final commit.

- [ ] **Step 3: Commit docs**

```bash
git add README.md docs/superpowers/specs/2026-04-23-sales-data-generator-design.md
git commit -m "docs: document MVP operating scope"
```

- [ ] **Step 4: Start local server for user review**

Run:

```bash
npm run dev
```

Expected: app is available at `http://localhost:3000`.

## Plan Self-Review

Spec coverage:

- Interactive web app: covered by Tasks 1 and 8.
- Fictional mode: covered by Tasks 2, 3, 6, and 8.
- Real-company-inspired mode: covered by Task 5 with source collection and profile claims; live provider implementation remains behind the abstraction for a later model-specific task.
- LLM orchestration: covered by Task 5 with provider contracts, prompts, and no-credential fallback.
- Deterministic numeric truth: covered by Tasks 3 and 4.
- CRM/BI data: covered by domain types, simulator, dashboard, preview, and export in Tasks 2, 3, 7, and 8.
- ERP-visible supply effects: covered by Task 3 supply generator, Task 4 validations, and Task 7 exports.
- Returns, rejections, onboarding, customer loss: covered by Task 3 with onboarding lifecycle events, churn-driven `lost` lifecycle events, returns, rejections, and credits.
- Source and assumptions report: covered by Tasks 3, 5, and 7.
- Testing: covered in every implementation task.

Known intentional MVP gap:

- SQL seed output is not implemented in this plan because CSV and JSON are enough to validate the table shape first.
- Live Gemini/OpenAI provider calls are not implemented in this plan because provider credentials, pricing controls, and model-specific SDK choices should be handled as a focused follow-up task after the no-credential flow works.
