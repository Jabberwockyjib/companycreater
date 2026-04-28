import type { GeneratedScenario } from "@/lib/domain/types";
import { scenarioToCsvFiles, toCsv } from "./csv";
import { scenarioToJsonBundle } from "./json";

type CsvValue = string | number | boolean | null;
type CsvRow = Record<string, CsvValue>;

export type ExportProfileId =
  | "standard"
  | "bi"
  | "crm"
  | "erp_finance"
  | "sales_analysis"
  | "template";

export type TemplateSourceTable =
  | "customers"
  | "products"
  | "orders"
  | "order_lines"
  | "invoices"
  | "payments"
  | "opportunities"
  | "returns"
  | "monthly_revenue";

export interface ExportTemplateColumn {
  header: string;
  source?: string;
  constant?: CsvValue;
}

export interface ExportTemplate {
  fileName: string;
  sourceTable: TemplateSourceTable;
  columns: ExportTemplateColumn[];
}

export interface ExportBundleOptions {
  profileId?: ExportProfileId;
  templates?: ExportTemplate[];
}

export interface ExportBundle {
  files: Record<string, string>;
  manifest: {
    scenarioId: string;
    companyName: string;
    exportedAt: string;
    profileId: ExportProfileId;
    fileCount: number;
    templateCount: number;
  };
  validation: {
    messages: string[];
  };
}

export const EXPORT_PROFILES: Array<{
  id: ExportProfileId;
  label: string;
  description: string;
}> = [
  {
    id: "standard",
    label: "Canonical CSV",
    description: "Raw generated tables with full IDs and relationships.",
  },
  {
    id: "bi",
    label: "BI star schema",
    description: "Dimension and fact tables for Power BI, Tableau, Looker, or SQL analysis.",
  },
  {
    id: "crm",
    label: "CRM import",
    description: "Accounts, contacts, opportunities, activities, and sales orders.",
  },
  {
    id: "erp_finance",
    label: "ERP finance",
    description: "Customers, items, orders, invoices, payments, credits, AR, and inventory events.",
  },
  {
    id: "sales_analysis",
    label: "Sales analysis",
    description: "Aggregated account, salesperson, product, monthly, and win/loss performance.",
  },
  {
    id: "template",
    label: "Custom template",
    description: "Map generated data into uploaded or pasted CSV column headers.",
  },
];

export function buildExportBundle(
  scenario: GeneratedScenario,
  options: ExportBundleOptions = {},
): ExportBundle {
  const profileId = options.profileId ?? "standard";
  const validationMessages: string[] = [];
  const files =
    profileId === "standard"
      ? buildStandardFiles(scenario)
      : profileId === "bi"
        ? buildBiFiles(scenario)
        : profileId === "crm"
          ? buildCrmFiles(scenario)
          : profileId === "erp_finance"
            ? buildErpFinanceFiles(scenario)
            : profileId === "sales_analysis"
              ? buildSalesAnalysisFiles(scenario)
              : buildTemplateFiles(scenario, options.templates ?? [], validationMessages);

  return {
    files,
    manifest: {
      scenarioId: scenario.metadata.scenarioId,
      companyName: scenario.profile.companyName,
      exportedAt: new Date().toISOString(),
      profileId,
      fileCount: Object.keys(files).length,
      templateCount: options.templates?.length ?? 0,
    },
    validation: {
      messages: validationMessages,
    },
  };
}

export function createTemplateFromHeaders({
  fileName,
  sourceTable,
  headers,
}: {
  fileName: string;
  sourceTable: TemplateSourceTable;
  headers: string[];
}): ExportTemplate {
  return {
    fileName: cleanFileName(fileName),
    sourceTable,
    columns: headers
      .map((header) => header.trim())
      .filter(Boolean)
      .map((header) => ({
        header,
        ...inferTemplateMapping(sourceTable, header),
      })),
  };
}

function buildStandardFiles(scenario: GeneratedScenario) {
  return {
    ...Object.fromEntries(
      Object.entries(scenarioToCsvFiles(scenario)).map(([fileName, contents]) => [
        `standard/csv/${fileName}`,
        contents,
      ]),
    ),
    "standard/scenario_manifest.json": JSON.stringify(scenarioToJsonBundle(scenario).manifest, null, 2),
    "standard/scenario.json": JSON.stringify(scenarioToJsonBundle(scenario), null, 2),
    "standard/assumptions_report.txt": scenario.assumptionsReport.join("\n"),
  };
}

function buildBiFiles(scenario: GeneratedScenario) {
  const { customersById, skusById, familiesById, ordersById } = buildLookups(scenario);

  return csvFiles("bi", {
    "dim_customers.csv": scenario.tables.customers.map((customer) => ({
      customer_key: customer.id,
      customer_name: customer.name,
      industry: customer.industry,
      region: customer.region,
      segment: customer.segment,
      territory_key: customer.territoryId,
      owner_key: customer.accountOwnerId,
      account_status: customer.accountStatus,
      annual_potential: customer.annualPotential,
      risk_profile: customer.riskProfile,
    })),
    "dim_products.csv": scenario.tables.skus.map((sku) => ({
      product_key: sku.id,
      sku: sku.skuCode,
      product_name: sku.name,
      family_key: sku.familyId,
      family: familiesById.get(sku.familyId)?.name ?? "",
      unit_price: sku.unitPrice,
      unit_cost: sku.unitCost,
      lifecycle_status: sku.lifecycleStatus,
      launch_date: sku.launchDate,
    })),
    "dim_salespeople.csv": scenario.tables.salespeople.map((salesperson) => ({
      salesperson_key: salesperson.id,
      salesperson_name: salesperson.name,
      territory_key: salesperson.territoryId,
      quota: salesperson.quota,
      tenure_months: salesperson.tenureMonths,
      ramp_status: salesperson.rampStatus,
    })),
    "dim_territories.csv": scenario.tables.territories.map((territory) => ({
      territory_key: territory.id,
      territory_name: territory.name,
      region: territory.region,
    })),
    "fact_order_lines.csv": scenario.tables.orderLineItems.map((line) => {
      const order = ordersById.get(line.orderId);
      const customer = order ? customersById.get(order.customerId) : undefined;
      const sku = skusById.get(line.skuId);

      return {
        order_key: line.orderId,
        line_key: line.id,
        customer_key: order?.customerId ?? "",
        salesperson_key: order?.salespersonId ?? "",
        product_key: line.skuId,
        order_date: order?.orderDate ?? "",
        order_status: order?.status ?? "",
        region: customer?.region ?? "",
        segment: customer?.segment ?? "",
        sku: sku?.skuCode ?? "",
        quantity: line.quantity,
        shipped_quantity: line.shippedQuantity,
        backordered_quantity: line.backorderedQuantity,
        unit_price: line.unitPrice,
        discount_rate: line.discountRate,
        line_total: line.lineTotal,
      };
    }),
    "fact_monthly_revenue.csv": scenario.tables.monthlyRevenue.map((month) => ({
      month: month.month,
      booked_revenue: month.bookedRevenue,
      invoiced_revenue: month.invoicedRevenue,
      collected_revenue: month.collectedRevenue,
      credited_revenue: month.creditedRevenue,
      ending_ar_balance: month.endingArBalance,
    })),
    "fact_returns.csv": scenario.tables.returns.map((record) => ({
      return_key: record.id,
      order_key: record.orderId,
      line_key: record.orderLineItemId,
      customer_key: record.customerId,
      product_key: record.skuId,
      return_date: record.returnDate,
      reason: record.reason,
      quantity: record.quantity,
      credit_amount: record.creditAmount,
    })),
    "fact_inventory.csv": scenario.tables.inventoryPositions.map((position) => ({
      product_key: position.skuId,
      sku: skusById.get(position.skuId)?.skuCode ?? "",
      starting_on_hand: position.startingOnHand,
      received_quantity: position.receivedQuantity,
      allocated_quantity: position.allocatedQuantity,
      shipped_quantity: position.shippedQuantity,
      backordered_quantity: position.backorderedQuantity,
      ending_on_hand: position.endingOnHand,
    })),
  });
}

function buildCrmFiles(scenario: GeneratedScenario) {
  const { salespeopleById } = buildLookups(scenario);

  return csvFiles("crm", {
    "accounts.csv": scenario.tables.customers.map((customer) => ({
      "Account ID": customer.id,
      "Account Name": customer.name,
      "Owner ID": customer.accountOwnerId,
      "Owner Name": salespeopleById.get(customer.accountOwnerId)?.name ?? "",
      Segment: customer.segment,
      Industry: customer.industry,
      Region: customer.region,
      Status: customer.accountStatus,
      "Annual Potential": customer.annualPotential,
      "Risk Profile": customer.riskProfile,
      Story: customer.story,
    })),
    "contacts.csv": scenario.tables.contacts.map((contact) => ({
      "Contact ID": contact.id,
      "Account ID": contact.customerId,
      Name: contact.name,
      Role: contact.role,
      Email: contact.email,
    })),
    "opportunities.csv": scenario.tables.opportunities.map((opportunity) => ({
      "Opportunity ID": opportunity.id,
      "Account ID": opportunity.customerId,
      "Owner ID": opportunity.salespersonId,
      Stage: opportunity.stage,
      "Expected Value": opportunity.expectedValue,
      "Close Date": opportunity.closeDate,
      "Cycle Days": opportunity.cycleDays,
      "Close Reason": opportunity.closeReason,
    })),
    "activities.csv": scenario.tables.lifecycleEvents.map((event) => ({
      "Activity ID": event.id,
      "Account ID": event.customerId,
      "Activity Date": event.eventDate,
      Type: event.eventType,
      Notes: event.narrative,
    })),
    "sales_orders.csv": scenario.tables.orders.map((order) => ({
      "Order ID": order.id,
      "Account ID": order.customerId,
      "Owner ID": order.salespersonId,
      "Opportunity ID": order.opportunityId,
      "Order Date": order.orderDate,
      Status: order.status,
      Total: order.total,
    })),
  });
}

function buildErpFinanceFiles(scenario: GeneratedScenario) {
  const { customersById, skusById, familiesById, ordersById } = buildLookups(scenario);

  return csvFiles("erp_finance", {
    "customers.csv": scenario.tables.customers.map((customer) => ({
      "Customer Number": customer.id,
      "Customer Name": customer.name,
      Region: customer.region,
      Segment: customer.segment,
      "Credit Status": customer.riskProfile === "high" ? "review" : "approved",
      "Account Status": customer.accountStatus,
    })),
    "items.csv": scenario.tables.skus.map((sku) => ({
      "Item Number": sku.skuCode,
      "Item ID": sku.id,
      Description: sku.name,
      Family: familiesById.get(sku.familyId)?.name ?? "",
      "Unit Price": sku.unitPrice,
      "Unit Cost": sku.unitCost,
      Status: sku.lifecycleStatus === "discontinued" ? "inactive" : "active",
    })),
    "sales_orders.csv": scenario.tables.orders.map((order) => ({
      "Order Number": order.id,
      "Customer Number": order.customerId,
      "Salesperson ID": order.salespersonId,
      "Order Date": order.orderDate,
      Status: order.status,
      Subtotal: order.subtotal,
      Discount: order.discountAmount,
      Total: order.total,
    })),
    "sales_order_lines.csv": scenario.tables.orderLineItems.map((line) => ({
      "Order Number": line.orderId,
      "Line Number": line.id,
      "Item Number": skusById.get(line.skuId)?.skuCode ?? line.skuId,
      Quantity: line.quantity,
      "Allocated Quantity": line.allocatedQuantity,
      "Shipped Quantity": line.shippedQuantity,
      "Backordered Quantity": line.backorderedQuantity,
      "Unit Price": line.unitPrice,
      "Line Amount": line.lineTotal,
    })),
    "invoices.csv": scenario.tables.invoices.map((invoice) => ({
      "Invoice Number": invoice.id,
      "Customer Number": invoice.customerId,
      "Order Number": invoice.orderId,
      "Invoice Date": invoice.invoiceDate,
      "Due Date": invoice.dueDate,
      Terms: invoice.paymentTerms,
      Status: invoice.status,
      Total: invoice.total,
      Paid: invoice.paidAmount,
      Balance: invoice.balanceDue,
    })),
    "payments.csv": scenario.tables.payments.map((payment) => ({
      "Payment Number": payment.id,
      "Invoice Number": payment.invoiceId,
      "Customer Number": payment.customerId,
      "Payment Date": payment.paymentDate,
      Method: payment.method,
      Amount: payment.amount,
    })),
    "credit_memos.csv": scenario.tables.credits.map((credit) => ({
      "Credit Memo Number": credit.id,
      "Customer Number": credit.customerId,
      "Source Number": credit.sourceId,
      "Source Type": credit.sourceType,
      "Credit Date": credit.creditDate,
      Amount: credit.amount,
    })),
    "ar_aging.csv": buildArAgingRows(scenario),
    "inventory_events.csv": scenario.tables.supplyEvents.map((event) => ({
      "Event Number": event.id,
      "Item Number": skusById.get(event.skuId)?.skuCode ?? event.skuId,
      "Start Date": event.startDate,
      "End Date": event.endDate,
      Type: event.eventType,
      Severity: event.severity,
      Narrative: event.narrative,
    })),
    "open_backorders.csv": scenario.tables.orders
      .filter((order) => order.backorderedQuantity > 0)
      .map((order) => ({
        "Order Number": order.id,
        "Customer Number": order.customerId,
        "Customer Name": customersById.get(order.customerId)?.name ?? "",
        "Order Date": order.orderDate,
        Status: order.status,
        "Backordered Quantity": order.backorderedQuantity,
        "Order Total": order.total,
        "Opportunity Number": ordersById.get(order.id)?.opportunityId ?? "",
      })),
  });
}

function buildSalesAnalysisFiles(scenario: GeneratedScenario) {
  const { customersById, skusById, familiesById, salespeopleById, ordersById } =
    buildLookups(scenario);
  const orderLines = scenario.tables.orderLineItems;

  return csvFiles("sales_analysis", {
    "account_performance.csv": scenario.tables.customers.map((customer) => {
      const customerOrders = scenario.tables.orders.filter((order) => order.customerId === customer.id);
      const revenue = customerOrders.reduce((total, order) => total + order.total, 0);

      return {
        "Account ID": customer.id,
        "Account Name": customer.name,
        Segment: customer.segment,
        Region: customer.region,
        Revenue: roundMoney(revenue),
        Orders: customerOrders.length,
        "Annual Potential": customer.annualPotential,
        "Realization Rate": roundRatio(revenue / Math.max(customer.annualPotential, 1)),
        "Account Status": customer.accountStatus,
        "Risk Profile": customer.riskProfile,
      };
    }),
    "salesperson_performance.csv": scenario.tables.salespeople.map((salesperson) => {
      const repOrders = scenario.tables.orders.filter(
        (order) => order.salespersonId === salesperson.id,
      );
      const revenue = repOrders.reduce((total, order) => total + order.total, 0);

      return {
        "Salesperson ID": salesperson.id,
        "Salesperson Name": salesperson.name,
        Territory: salesperson.territoryId,
        Revenue: roundMoney(revenue),
        Orders: repOrders.length,
        Quota: salesperson.quota,
        "Quota Attainment": roundRatio(revenue / Math.max(salesperson.quota, 1)),
        "Ramp Status": salesperson.rampStatus,
      };
    }),
    "product_performance.csv": scenario.tables.skus.map((sku) => {
      const skuLines = orderLines.filter((line) => line.skuId === sku.id);
      const revenue = skuLines.reduce((total, line) => total + line.lineTotal, 0);
      const units = skuLines.reduce((total, line) => total + line.quantity, 0);

      return {
        SKU: sku.skuCode,
        "Product Name": sku.name,
        Family: familiesById.get(sku.familyId)?.name ?? "",
        Revenue: roundMoney(revenue),
        "Units Sold": units,
        "Average Price": units > 0 ? roundMoney(revenue / units) : 0,
        Lifecycle: sku.lifecycleStatus,
      };
    }),
    "monthly_trends.csv": scenario.tables.monthlyRevenue.map((month) => ({
      Month: month.month,
      "Booked Revenue": month.bookedRevenue,
      "Invoiced Revenue": month.invoicedRevenue,
      "Collected Revenue": month.collectedRevenue,
      "Credited Revenue": month.creditedRevenue,
      "Ending AR Balance": month.endingArBalance,
    })),
    "win_loss.csv": scenario.tables.opportunities.map((opportunity) => ({
      "Opportunity ID": opportunity.id,
      "Account ID": opportunity.customerId,
      "Account Name": customersById.get(opportunity.customerId)?.name ?? "",
      "Salesperson ID": opportunity.salespersonId,
      "Salesperson Name": salespeopleById.get(opportunity.salespersonId)?.name ?? "",
      Stage: opportunity.stage,
      "Expected Value": opportunity.expectedValue,
      "Close Date": opportunity.closeDate,
      "Cycle Days": opportunity.cycleDays,
      Reason: opportunity.closeReason,
    })),
    "channel_mix.csv": scenario.tables.orders.map((order) => ({
      "Order ID": order.id,
      "Order Date": order.orderDate,
      "Account ID": order.customerId,
      "Account Name": customersById.get(order.customerId)?.name ?? "",
      "Salesperson ID": order.salespersonId,
      "Salesperson Name": salespeopleById.get(order.salespersonId)?.name ?? "",
      "Opportunity ID": order.opportunityId,
      Status: order.status,
      Total: order.total,
      "Line Count": orderLines.filter((line) => line.orderId === order.id).length,
      "First Product": skusById.get(
        orderLines.find((line) => line.orderId === order.id)?.skuId ?? "",
      )?.skuCode ?? "",
      "Order Lookup": ordersById.get(order.id)?.id ?? "",
    })),
  });
}

function buildTemplateFiles(
  scenario: GeneratedScenario,
  templates: ExportTemplate[],
  validationMessages: string[],
) {
  if (templates.length === 0) {
    validationMessages.push("Add at least one template before exporting a custom template pack.");
    return csvFiles("templates", {
      "empty_template.csv": [],
    });
  }

  return Object.fromEntries(
    templates.map((template) => {
      const sourceRows = getTemplateSourceRows(scenario, template.sourceTable);
      const rows = sourceRows.map((sourceRow) =>
        Object.fromEntries(
          template.columns.map((column) => [
            column.header,
            resolveTemplateColumn(sourceRow, column, template.fileName, validationMessages),
          ]),
        ),
      );

      return [`templates/${cleanFileName(template.fileName)}`, toCsv(rows)];
    }),
  );
}

function resolveTemplateColumn(
  sourceRow: CsvRow,
  column: ExportTemplateColumn,
  fileName: string,
  validationMessages: string[],
): CsvValue {
  if (column.constant !== undefined) {
    return column.constant;
  }

  if (!column.source) {
    const message = `${fileName}: ${column.header} is unmapped`;
    if (!validationMessages.includes(message)) {
      validationMessages.push(message);
    }
    return "";
  }

  return sourceRow[column.source] ?? "";
}

function inferTemplateMapping(
  sourceTable: TemplateSourceTable,
  header: string,
): Pick<ExportTemplateColumn, "source" | "constant"> {
  const normalized = normalizeHeader(header);
  const common: Record<string, Pick<ExportTemplateColumn, "source" | "constant">> = {
    currency: { constant: "USD" },
    "currency code": { constant: "USD" },
    company: { source: "company.name" },
    "company name": { source: "company.name" },
    industry: { source: "customer.industry" },
    region: { source: "customer.region" },
    segment: { source: "customer.segment" },
    status: { source: "order.status" },
  };
  const bySource: Record<TemplateSourceTable, Record<string, string>> = {
    customers: {
      "account id": "customer.id",
      "account number": "customer.id",
      "customer id": "customer.id",
      "customer number": "customer.id",
      "account name": "customer.name",
      "customer name": "customer.name",
      name: "customer.name",
      owner: "salesperson.name",
      "owner id": "customer.accountOwnerId",
      "sales rep": "salesperson.name",
      "annual potential": "customer.annualPotential",
      "risk profile": "customer.riskProfile",
      story: "customer.story",
    },
    products: {
      "item id": "sku.id",
      "item number": "sku.skuCode",
      sku: "sku.skuCode",
      "product name": "sku.name",
      description: "sku.name",
      family: "family.name",
      "unit price": "sku.unitPrice",
      "unit cost": "sku.unitCost",
      lifecycle: "sku.lifecycleStatus",
      "launch date": "sku.launchDate",
    },
    orders: {
      "order id": "order.id",
      "order number": "order.id",
      "order date": "order.orderDate",
      "account id": "customer.id",
      "account name": "customer.name",
      "customer number": "customer.id",
      "customer name": "customer.name",
      "sales rep": "salesperson.name",
      "salesperson id": "salesperson.id",
      subtotal: "order.subtotal",
      discount: "order.discountAmount",
      total: "order.total",
    },
    order_lines: {
      "order id": "order.id",
      "order number": "order.id",
      "order date": "order.orderDate",
      "line id": "line.id",
      "line number": "line.id",
      "account id": "customer.id",
      "account name": "customer.name",
      "customer id": "customer.id",
      "customer number": "customer.id",
      "customer name": "customer.name",
      "sales rep": "salesperson.name",
      "salesperson id": "salesperson.id",
      sku: "sku.skuCode",
      "item number": "sku.skuCode",
      "product name": "sku.name",
      description: "sku.name",
      quantity: "line.quantity",
      "ordered quantity": "line.quantity",
      "shipped quantity": "line.shippedQuantity",
      "backordered quantity": "line.backorderedQuantity",
      "unit price": "line.unitPrice",
      "line amount": "line.lineTotal",
      total: "line.lineTotal",
    },
    invoices: {
      "invoice id": "invoice.id",
      "invoice number": "invoice.id",
      "customer id": "customer.id",
      "customer number": "customer.id",
      "customer name": "customer.name",
      "order number": "invoice.orderId",
      "invoice date": "invoice.invoiceDate",
      "due date": "invoice.dueDate",
      terms: "invoice.paymentTerms",
      total: "invoice.total",
      paid: "invoice.paidAmount",
      balance: "invoice.balanceDue",
    },
    payments: {
      "payment id": "payment.id",
      "payment number": "payment.id",
      "invoice number": "payment.invoiceId",
      "customer number": "customer.id",
      "customer name": "customer.name",
      "payment date": "payment.paymentDate",
      method: "payment.method",
      amount: "payment.amount",
    },
    opportunities: {
      "opportunity id": "opportunity.id",
      "account id": "customer.id",
      "account name": "customer.name",
      "owner id": "salesperson.id",
      "sales rep": "salesperson.name",
      stage: "opportunity.stage",
      "expected value": "opportunity.expectedValue",
      "close date": "opportunity.closeDate",
      "cycle days": "opportunity.cycleDays",
      reason: "opportunity.closeReason",
    },
    returns: {
      "return id": "return.id",
      "order number": "return.orderId",
      "line number": "return.orderLineItemId",
      "customer number": "customer.id",
      "customer name": "customer.name",
      sku: "sku.skuCode",
      "return date": "return.returnDate",
      reason: "return.reason",
      quantity: "return.quantity",
      "credit amount": "return.creditAmount",
    },
    monthly_revenue: {
      month: "month.month",
      "booked revenue": "month.bookedRevenue",
      "invoiced revenue": "month.invoicedRevenue",
      "collected revenue": "month.collectedRevenue",
      "credited revenue": "month.creditedRevenue",
      "ending ar balance": "month.endingArBalance",
    },
  };

  return common[normalized] ?? { source: bySource[sourceTable][normalized] };
}

function getTemplateSourceRows(
  scenario: GeneratedScenario,
  sourceTable: TemplateSourceTable,
): CsvRow[] {
  const { customersById, skusById, familiesById, salespeopleById, ordersById, invoicesById } =
    buildLookups(scenario);
  const company = {
    "company.name": scenario.profile.companyName,
    "company.industry": scenario.profile.industry,
  };

  if (sourceTable === "customers") {
    return scenario.tables.customers.map((customer) => ({
      ...company,
      ...prefixRow("customer", customer),
      "salesperson.name": salespeopleById.get(customer.accountOwnerId)?.name ?? "",
    }));
  }

  if (sourceTable === "products") {
    return scenario.tables.skus.map((sku) => ({
      ...company,
      ...prefixRow("sku", sku),
      "family.name": familiesById.get(sku.familyId)?.name ?? "",
    }));
  }

  if (sourceTable === "orders") {
    return scenario.tables.orders.map((order) => ({
      ...company,
      ...prefixRow("order", order),
      ...prefixRow("customer", customersById.get(order.customerId)),
      ...prefixRow("salesperson", salespeopleById.get(order.salespersonId)),
    }));
  }

  if (sourceTable === "order_lines") {
    return scenario.tables.orderLineItems.map((line) => {
      const order = ordersById.get(line.orderId);
      const sku = skusById.get(line.skuId);

      return {
        ...company,
        ...prefixRow("line", line),
        ...prefixRow("order", order),
        ...prefixRow("customer", order ? customersById.get(order.customerId) : undefined),
        ...prefixRow("salesperson", order ? salespeopleById.get(order.salespersonId) : undefined),
        ...prefixRow("sku", sku),
        "family.name": sku ? familiesById.get(sku.familyId)?.name ?? "" : "",
      };
    });
  }

  if (sourceTable === "invoices") {
    return scenario.tables.invoices.map((invoice) => ({
      ...company,
      ...prefixRow("invoice", invoice),
      ...prefixRow("customer", customersById.get(invoice.customerId)),
    }));
  }

  if (sourceTable === "payments") {
    return scenario.tables.payments.map((payment) => {
      const invoice = invoicesById.get(payment.invoiceId);

      return {
        ...company,
        ...prefixRow("payment", payment),
        ...prefixRow("invoice", invoice),
        ...prefixRow("customer", customersById.get(payment.customerId)),
      };
    });
  }

  if (sourceTable === "opportunities") {
    return scenario.tables.opportunities.map((opportunity) => ({
      ...company,
      ...prefixRow("opportunity", opportunity),
      ...prefixRow("customer", customersById.get(opportunity.customerId)),
      ...prefixRow("salesperson", salespeopleById.get(opportunity.salespersonId)),
    }));
  }

  if (sourceTable === "returns") {
    return scenario.tables.returns.map((record) => ({
      ...company,
      ...prefixRow("return", record),
      ...prefixRow("customer", customersById.get(record.customerId)),
      ...prefixRow("sku", skusById.get(record.skuId)),
    }));
  }

  return scenario.tables.monthlyRevenue.map((month) => ({
    ...company,
    ...prefixRow("month", month),
  }));
}

function buildArAgingRows(scenario: GeneratedScenario): CsvRow[] {
  const { customersById } = buildLookups(scenario);

  return scenario.tables.customers
    .map((customer) => {
      const invoices = scenario.tables.invoices.filter(
        (invoice) => invoice.customerId === customer.id && invoice.balanceDue > 0,
      );
      const buckets = invoices.reduce(
        (summary, invoice) => {
          const daysPastDue = Math.max(
            0,
            Math.round(
              (new Date(scenario.metadata.generatedAt).getTime() - new Date(invoice.dueDate).getTime()) /
                86_400_000,
            ),
          );
          const bucket =
            daysPastDue <= 0
              ? "Current"
              : daysPastDue <= 30
                ? "1-30"
                : daysPastDue <= 60
                  ? "31-60"
                  : daysPastDue <= 90
                    ? "61-90"
                    : "90+";

          return {
            ...summary,
            [bucket]: summary[bucket] + invoice.balanceDue,
          };
        },
        { Current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      );

      return {
        "Customer Number": customer.id,
        "Customer Name": customersById.get(customer.id)?.name ?? customer.name,
        Current: roundMoney(buckets.Current),
        "1-30": roundMoney(buckets["1-30"]),
        "31-60": roundMoney(buckets["31-60"]),
        "61-90": roundMoney(buckets["61-90"]),
        "90+": roundMoney(buckets["90+"]),
        Total: roundMoney(Object.values(buckets).reduce((total, value) => total + value, 0)),
      };
    })
    .filter((row) => Number(row.Total) > 0);
}

function buildLookups(scenario: GeneratedScenario) {
  return {
    customersById: new Map(scenario.tables.customers.map((item) => [item.id, item])),
    skusById: new Map(scenario.tables.skus.map((item) => [item.id, item])),
    familiesById: new Map(scenario.tables.productFamilies.map((item) => [item.id, item])),
    salespeopleById: new Map(scenario.tables.salespeople.map((item) => [item.id, item])),
    ordersById: new Map(scenario.tables.orders.map((item) => [item.id, item])),
    invoicesById: new Map(scenario.tables.invoices.map((item) => [item.id, item])),
  };
}

function csvFiles(prefix: string, files: Record<string, CsvRow[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([fileName, rows]) => [`${prefix}/${fileName}`, toCsv(rows)]),
  );
}

function prefixRow(prefix: string, row: object | undefined): CsvRow {
  if (!row) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [`${prefix}.${key}`, value as CsvValue]),
  );
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function cleanFileName(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  const withExtension = cleaned.endsWith(".csv") ? cleaned : `${cleaned}.csv`;

  return withExtension || "template.csv";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round(value * 10_000) / 10_000;
}
