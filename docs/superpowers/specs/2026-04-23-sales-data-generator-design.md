# Sales Data Generator Design

## Goal

Build an interactive web application that generates realistic synthetic sales operating data for B2B product companies with roughly $25M-$200M in annual revenue. The first version targets CRM testing, BI dashboards, and ERP-adjacent sales scenarios. It should support both fictional companies and real-company-inspired generation.

The application may use public company, catalog, and industry sources to ground the generated scenario, but all private operating data such as customers, sales, revenue, salespeople, orders, returns, and churn must be clearly labeled as synthetic or inferred. The product must not imply that generated internal sales data is real.

## Initial Scope

The first version focuses on B2B product companies where SKUs, catalogs, customers, buying cycles, salespeople, product launches, and supply constraints matter.

Included in the first phase:

- Real-company mode based on public web research.
- Fictional company mode inspired by selected industries and revenue bands.
- Public-source extraction for product families, catalog structure, markets, geographies, channels, public launches, and industry trends.
- Synthetic generation for customers, contacts, accounts, opportunities, orders, invoices, revenue, salespeople, territories, quotas, forecasts, returns, rejections, onboarding, churn, and account stories.
- ERP-visible supply effects such as backorders, lead-time changes, partial fulfillment, delayed shipments, rejected orders, returns, credits, replacement orders, and revenue risk.
- Exports for CSV, JSON, and future SQL seed files.
- A source and assumptions report showing which fields came from public sources, inference, or user assumptions.

Deferred from the first phase:

- Detailed warehouse bins.
- Supplier purchase orders.
- Manufacturing work orders.
- Bills of materials and routings.
- Labor capacity planning.
- Full inventory valuation.
- General ledger postings.
- Full accounts payable and accounts receivable workflows.
- Material requirements planning.

## Product Modes

### Real-Company-Inspired Mode

The user enters a company name or URL. The app researches public sources and builds a structured company profile. Public facts are retained with citations. Inferred assumptions are separated from public facts. Synthetic data is generated from this profile but remains explicitly synthetic.

### Fictional Company Mode

The user selects an industry, revenue band, regions, channel model, product complexity, and sales motion. The app generates a plausible company profile without naming or implying a real company.

## Architecture

### Model Orchestration Layer

The application should use an LLM provider abstraction rather than binding the product to one model. A strong long-context model such as a Gemini Pro-class model can be used for research summarization, structured profile extraction, customer and account narratives, industry trend interpretation, and plausibility review.

The LLM should not be the only source of numeric truth. Financial totals, order quantities, invoice math, credits, quota attainment, churn rates, and other reconciled metrics should be produced and validated by deterministic simulation code. The LLM may propose assumptions and generate explanations, but the simulator must enforce the final numbers.

The model layer should support:

- Configurable provider and model name.
- Prompt templates for research extraction, scenario assumptions, customer stories, account histories, and trend explanations.
- Structured outputs with schema validation.
- Citation-aware extraction for public facts.
- Retry and fallback behavior when model output fails validation.
- Token and cost tracking per generated scenario.
- A clear audit trail showing which generated fields were model-authored, inferred, or simulation-derived.

### Research Layer

Given a company name, URL, or industry, gather public sources such as:

- Company website.
- Product pages and online catalogs.
- Press releases.
- Case studies.
- Distributor pages.
- Public filings when available.
- Industry articles and market reports.

The research layer extracts factual public signals only: product families, likely markets, geographies, channel model, launch history, customer segments, and industry language. It should store source URL, retrieved date, extracted claim, and confidence.

### Company Profile Layer

Normalize research into a structured profile:

- Company identity and industry.
- Revenue band or user-selected revenue target.
- Product hierarchy.
- Sales channels.
- Buyer personas.
- Regions and territories.
- Seasonality.
- Market trends.
- Product launch timeline.
- Supply constraint assumptions.

Each profile field must be marked as one of:

- `public_fact`
- `inferred`
- `user_assumption`
- `synthetic`

### Simulation Layer

Generate a coherent synthetic operating history. The simulation must reconcile across tables and produce plausible relationships:

- Revenue totals match selected annual targets.
- Customer concentration follows realistic B2B patterns.
- Customers buy plausible product families.
- Reorder cycles match industry and product type.
- Buying cycles vary by segment and deal size.
- Salespeople have realistic territories, ramp periods, quotas, win rates, and capacity.
- Product launches change product mix over time.
- Supply constraints cause delayed shipments, backorders, partial fulfillment, missed revenue, returns, rejections, and churn risk.
- Returns and rejections tie back to original orders and affect account health.
- Customer onboarding precedes first orders for appropriate account types.
- Customer loss is explained by price pressure, competitor displacement, service failures, supply failures, product fit, or budget changes.

### Review and Tuning UI

The user should inspect and adjust the generated company profile before producing final datasets. Controls should include:

- Mode: real-company-inspired or fictional.
- Revenue target and year range.
- Customer count and concentration level.
- SKU count and catalog depth.
- Regions and territories.
- Channel mix: direct, distributor, partner, ecommerce, or mixed.
- Sales team size and quota model.
- Seasonality level.
- Product launch frequency.
- Supply disruption level.
- Returns/rejections frequency.
- Customer churn/loss rate.
- Export format.

The UI should show tables, charts, and narratives so users can judge whether the data feels plausible before exporting it.

### Export Layer

Exports should include:

- CSV files for each table.
- JSON bundle with full relationships and metadata.
- Future SQL seed output.
- Source and assumptions report.
- Data dictionary.
- Scenario summary explaining the generated company, sales motion, trends, disruptions, and major assumptions.

## Core Data Model

### Company and Research

- `companies`
- `company_profiles`
- `research_sources`
- `profile_claims`
- `assumptions`
- `market_events`
- `industry_trends`

### Products and Catalog

- `product_families`
- `products`
- `skus`
- `price_history`
- `product_launches`
- `product_lifecycle_events`

### Customers and Contacts

- `customers`
- `customer_sites`
- `contacts`
- `buyer_personas`
- `customer_stories`
- `customer_lifecycle_events`
- `customer_onboarding_records`
- `customer_loss_records`

### Sales Organization

- `salespeople`
- `territories`
- `sales_teams`
- `quotas`
- `rep_assignments`

### CRM and Pipeline

- `accounts`
- `opportunities`
- `opportunity_stage_history`
- `opportunity_line_items`
- `competitors`
- `win_loss_reasons`
- `forecasts`

### Orders and Revenue

- `orders`
- `order_line_items`
- `invoices`
- `invoice_line_items`
- `payments`
- `revenue_plan`
- `monthly_revenue_summary`

### ERP-Visible Sales Effects

- `inventory_availability_snapshots`
- `supply_constraint_events`
- `backorders`
- `fulfillments`
- `shipments`
- `shipment_delays`
- `returns`
- `return_line_items`
- `rejections`
- `rejection_line_items`
- `credits`
- `replacement_orders`

### Support and Risk Signals

- `support_tickets`
- `account_health_scores`
- `churn_risk_events`

## Generation Workflow

1. User enters a real company name/URL or chooses fictional company mode.
2. App researches public company, catalog, and industry sources when real-company mode is used.
3. App builds a sourced company profile and marks each fact as public, inferred, user assumption, or synthetic.
4. User reviews and tunes key assumptions: revenue target, years of history, customer count, SKU count, channel mix, regions, seasonality, disruption level, returns, rejections, and churn.
5. App generates synthetic products, customers, sales team, lifecycle events, opportunities, orders, returns, rejections, churn, market events, and supply constraint events.
6. App validates realism across revenue totals, customer concentration, SKU mix, margin ranges, buying cycles, sales capacity, supply constraints, and churn rates.
7. User previews dashboards, stories, and table samples.
8. User exports datasets and the assumptions/source report.

## Realism Rules

The generator should include validation checks and warnings for implausible output:

- Annual revenue should reconcile to monthly revenue within a configurable tolerance.
- No customer should buy SKUs outside plausible product families unless explicitly modeled as an unusual event.
- Reorder intervals should vary by customer segment, SKU type, order size, and supply reliability.
- Large opportunities should have longer stage histories and more contacts.
- Sales reps should not exceed plausible account and opportunity capacity.
- Quota attainment should vary across reps and years.
- New product launches should ramp gradually unless the scenario explicitly models a major demand spike.
- Returns and rejections should affect credits, replacement orders, account health, future reorder probability, and churn risk.
- Supply constraints should affect fulfillment and revenue timing, not just create narrative text.
- Customer loss should have a concrete reason and show up in future orders, opportunities, and revenue.

## User Experience

The first screen should be the generator workspace, not a marketing landing page. The core flow should be:

- Start new scenario.
- Enter company or choose fictional industry.
- Review researched profile.
- Tune assumptions.
- Generate data.
- Inspect charts, tables, and stories.
- Export.

The UI should feel like a professional internal tool for operators, CRM admins, BI builders, and sales operations teams. It should prioritize clarity, table density, filters, scenario controls, and export confidence over decorative presentation.

## Testing Strategy

Testing should focus on correctness, consistency, and plausibility:

- Unit tests for deterministic generation helpers.
- Schema tests for required fields, IDs, and relationships.
- Reconciliation tests for revenue, invoices, order totals, returns, credits, and monthly summaries.
- Scenario tests for common generation profiles.
- Validation tests for supply disruption effects.
- Export tests for CSV and JSON integrity.
- UI tests for scenario creation, tuning, preview, and export.

## Open Constraints

- The application should cite public facts and clearly distinguish them from inferred or synthetic data.
- The app may use real company and catalog names as public context, but generated customer lists, salespeople, revenue, orders, quotas, and account stories must be synthetic.
- The first version should keep full ERP depth out of scope while preserving IDs and relationships that allow future ERP modules to attach later.
