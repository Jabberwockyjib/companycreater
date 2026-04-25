import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GeneratedScenario } from "@/lib/domain/types";

export interface ScenarioSummary {
  id: string;
  companyName: string;
  industry: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  customerCount: number;
  orderCount: number;
  bookedRevenue: number;
}

export interface StoredScenario extends ScenarioSummary {
  scenario: GeneratedScenario;
}

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "scenarios.sqlite");

export class ScenarioStore {
  private database: DatabaseSync;

  constructor(databasePath = process.env.SCENARIO_DB_PATH || DEFAULT_DB_PATH) {
    const directory = path.dirname(databasePath);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        mode TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        customer_count INTEGER NOT NULL,
        order_count INTEGER NOT NULL,
        booked_revenue REAL NOT NULL,
        scenario_json TEXT NOT NULL
      );
    `);
  }

  save(scenario: GeneratedScenario): StoredScenario {
    const now = new Date().toISOString();
    const existing = this.find(scenario.metadata.scenarioId);
    const createdAt = existing?.createdAt ?? now;
    const summary = summarizeScenario(scenario, createdAt, now);
    const statement = this.database.prepare(`
      INSERT INTO scenarios (
        id, company_name, industry, mode, created_at, updated_at,
        customer_count, order_count, booked_revenue, scenario_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company_name = excluded.company_name,
        industry = excluded.industry,
        mode = excluded.mode,
        updated_at = excluded.updated_at,
        customer_count = excluded.customer_count,
        order_count = excluded.order_count,
        booked_revenue = excluded.booked_revenue,
        scenario_json = excluded.scenario_json;
    `);

    statement.run(
      summary.id,
      summary.companyName,
      summary.industry,
      summary.mode,
      summary.createdAt,
      summary.updatedAt,
      summary.customerCount,
      summary.orderCount,
      summary.bookedRevenue,
      JSON.stringify(scenario),
    );

    return { ...summary, scenario };
  }

  list(): ScenarioSummary[] {
    const rows = this.database
      .prepare(
        `
        SELECT id, company_name, industry, mode, created_at, updated_at,
          customer_count, order_count, booked_revenue
        FROM scenarios
        ORDER BY updated_at DESC;
      `,
      )
      .all() as unknown as StoredScenarioRow[];

    return rows.map(rowToSummary);
  }

  find(id: string): StoredScenario | null {
    const row = this.database
      .prepare(
        `
        SELECT id, company_name, industry, mode, created_at, updated_at,
          customer_count, order_count, booked_revenue, scenario_json
        FROM scenarios
        WHERE id = ?;
      `,
      )
      .get(id) as StoredScenarioRow | undefined;

    if (!row) {
      return null;
    }

    return {
      ...rowToSummary(row),
      scenario: JSON.parse(row.scenario_json) as GeneratedScenario,
    };
  }

  close() {
    this.database.close();
  }
}

interface StoredScenarioRow {
  id: string;
  company_name: string;
  industry: string;
  mode: string;
  created_at: string;
  updated_at: string;
  customer_count: number;
  order_count: number;
  booked_revenue: number;
  scenario_json: string;
}

function summarizeScenario(
  scenario: GeneratedScenario,
  createdAt: string,
  updatedAt: string,
): ScenarioSummary {
  return {
    id: scenario.metadata.scenarioId,
    companyName: scenario.profile.companyName,
    industry: scenario.profile.industry,
    mode: scenario.metadata.mode,
    createdAt,
    updatedAt,
    customerCount: scenario.tables.customers.length,
    orderCount: scenario.tables.orders.length,
    bookedRevenue: scenario.tables.monthlyRevenue.reduce(
      (sum, month) => sum + month.bookedRevenue,
      0,
    ),
  };
}

function rowToSummary(row: StoredScenarioRow): ScenarioSummary {
  return {
    id: row.id,
    companyName: row.company_name,
    industry: row.industry,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerCount: row.customer_count,
    orderCount: row.order_count,
    bookedRevenue: row.booked_revenue,
  };
}

let store: ScenarioStore | null = null;

export function getScenarioStore() {
  store ??= new ScenarioStore();
  return store;
}

export function resetScenarioStoreForTests() {
  store?.close();
  store = null;
}
