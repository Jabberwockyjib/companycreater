import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import {
  buildExportBundle,
  createTemplateFromHeaders,
  EXPORT_PROFILES,
} from "@/lib/export/profiles";
import { generateScenario } from "@/lib/sim/generate";

describe("export profiles", () => {
  it("builds role-specific export packs for BI, CRM, ERP, and sales analysis", () => {
    const scenario = generateScenario(defaultScenarioInput);

    expect(EXPORT_PROFILES.map((profile) => profile.id)).toEqual([
      "standard",
      "bi",
      "crm",
      "erp_finance",
      "sales_analysis",
      "template",
    ]);

    const biBundle = buildExportBundle(scenario, { profileId: "bi" });
    expect(biBundle.files["bi/dim_customers.csv"]).toContain("customer_key,customer_name");
    expect(biBundle.files["bi/fact_order_lines.csv"]).toContain(
      "order_key,line_key,customer_key,salesperson_key,product_key",
    );
    expect(biBundle.manifest.profileId).toBe("bi");

    const crmBundle = buildExportBundle(scenario, { profileId: "crm" });
    expect(crmBundle.files["crm/accounts.csv"]).toContain("Account ID,Account Name,Owner ID");
    expect(crmBundle.files["crm/activities.csv"]).toContain("Activity ID,Account ID,Activity Date");

    const erpBundle = buildExportBundle(scenario, { profileId: "erp_finance" });
    expect(erpBundle.files["erp_finance/invoices.csv"]).toContain(
      "Invoice Number,Customer Number,Order Number",
    );
    expect(erpBundle.files["erp_finance/ar_aging.csv"]).toContain(
      "Customer Number,Customer Name,Current,1-30,31-60,61-90,90+",
    );

    const salesBundle = buildExportBundle(scenario, { profileId: "sales_analysis" });
    expect(salesBundle.files["sales_analysis/account_performance.csv"]).toContain(
      "Account ID,Account Name,Segment,Region,Revenue,Orders",
    );
    expect(salesBundle.files["sales_analysis/product_performance.csv"]).toContain(
      "SKU,Product Name,Family,Revenue,Units Sold",
    );
  });

  it("maps custom template headers onto enriched scenario rows", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const template = createTemplateFromHeaders({
      fileName: "salesforce_orders.csv",
      sourceTable: "order_lines",
      headers: [
        "Order Number",
        "Order Date",
        "Account Name",
        "Sales Rep",
        "SKU",
        "Product Name",
        "Quantity",
        "Line Amount",
        "Currency",
      ],
    });

    const bundle = buildExportBundle(scenario, { profileId: "template", templates: [template] });
    const csv = bundle.files["templates/salesforce_orders.csv"];
    const firstOrder = scenario.tables.orders[0];
    const firstLine = scenario.tables.orderLineItems.find((line) => line.orderId === firstOrder.id);
    const firstCustomer = scenario.tables.customers.find(
      (customer) => customer.id === firstOrder.customerId,
    );

    expect(csv).toContain(
      "Order Number,Order Date,Account Name,Sales Rep,SKU,Product Name,Quantity,Line Amount,Currency",
    );
    expect(csv).toContain(firstOrder.id);
    expect(csv).toContain(firstCustomer?.name);
    expect(csv).toContain(firstLine?.quantity.toString());
    expect(csv).toContain("USD");
    expect(bundle.validation.messages).toEqual([]);
  });

  it("reports unmapped template columns instead of silently inventing data", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const template = createTemplateFromHeaders({
      fileName: "unknown_system.csv",
      sourceTable: "customers",
      headers: ["Account Name", "Unsupported Mystery Column"],
    });

    const bundle = buildExportBundle(scenario, { profileId: "template", templates: [template] });

    expect(bundle.files["templates/unknown_system.csv"]).toContain(
      "Account Name,Unsupported Mystery Column",
    );
    expect(bundle.validation.messages).toContain(
      "unknown_system.csv: Unsupported Mystery Column is unmapped",
    );
  });
});
