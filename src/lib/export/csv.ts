import { unparse } from "papaparse";
import type { GeneratedScenario } from "@/lib/domain/types";

type CsvRow = Record<string, unknown>;

export function toCsv<T extends CsvRow>(rows: T[]): string {
  return unparse(rows);
}

export function scenarioToCsvFiles(scenario: GeneratedScenario): Record<string, string> {
  return {
    "product_families.csv": toCsv(scenario.tables.productFamilies as unknown as CsvRow[]),
    "skus.csv": toCsv(scenario.tables.skus as unknown as CsvRow[]),
    "customers.csv": toCsv(scenario.tables.customers as unknown as CsvRow[]),
    "contacts.csv": toCsv(scenario.tables.contacts as unknown as CsvRow[]),
    "salespeople.csv": toCsv(scenario.tables.salespeople as unknown as CsvRow[]),
    "territories.csv": toCsv(scenario.tables.territories as unknown as CsvRow[]),
    "opportunities.csv": toCsv(scenario.tables.opportunities as unknown as CsvRow[]),
    "orders.csv": toCsv(scenario.tables.orders as unknown as CsvRow[]),
    "order_line_items.csv": toCsv(scenario.tables.orderLineItems as unknown as CsvRow[]),
    "inventory_positions.csv": toCsv(scenario.tables.inventoryPositions as unknown as CsvRow[]),
    "invoices.csv": toCsv(scenario.tables.invoices as unknown as CsvRow[]),
    "monthly_revenue.csv": toCsv(scenario.tables.monthlyRevenue as unknown as CsvRow[]),
    "supply_events.csv": toCsv(scenario.tables.supplyEvents as unknown as CsvRow[]),
    "returns.csv": toCsv(scenario.tables.returns as unknown as CsvRow[]),
    "rejections.csv": toCsv(scenario.tables.rejections as unknown as CsvRow[]),
    "credits.csv": toCsv(scenario.tables.credits as unknown as CsvRow[]),
    "lifecycle_events.csv": toCsv(scenario.tables.lifecycleEvents as unknown as CsvRow[]),
  };
}
