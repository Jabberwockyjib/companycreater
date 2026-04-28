import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GeneratedScenario } from "@/lib/domain/types";

export interface ScenarioSummary {
  id: string;
  scenarioGroupId: string;
  versionNumber: number;
  parentVersionId?: string;
  companyName: string;
  industry: string;
  mode: string;
  asOfDate?: string;
  historyStartDate?: string;
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
        scenario_id TEXT,
        source_scenario_id TEXT,
        version_number INTEGER,
        parent_version_id TEXT,
        company_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        mode TEXT NOT NULL,
        as_of_date TEXT,
        history_start_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        customer_count INTEGER NOT NULL,
        order_count INTEGER NOT NULL,
        booked_revenue REAL NOT NULL,
        scenario_json TEXT NOT NULL
      );
    `);
    this.ensureColumn("scenario_id", "TEXT");
    this.ensureColumn("source_scenario_id", "TEXT");
    this.ensureColumn("version_number", "INTEGER");
    this.ensureColumn("parent_version_id", "TEXT");
    this.ensureColumn("as_of_date", "TEXT");
    this.ensureColumn("history_start_date", "TEXT");
  }

  save(scenario: GeneratedScenario, options: { parentVersionId?: string } = {}): StoredScenario {
    const now = new Date().toISOString();
    const scenarioGroupId = scenario.metadata.scenarioGroupId ?? scenario.metadata.scenarioId;
    const versionNumber = this.nextVersionNumber(scenarioGroupId);
    const versionId = `${scenarioGroupId}_v${versionNumber}`;
    const createdAt =
      this.listVersions(scenarioGroupId).at(-1)?.createdAt ??
      now;
    const versionedScenario: GeneratedScenario = {
      ...scenario,
      metadata: {
        ...scenario.metadata,
        scenarioGroupId,
        versionId,
        versionNumber,
        previousVersionId: options.parentVersionId ?? scenario.metadata.previousVersionId,
      },
    };
    const summary = summarizeScenario(
      versionedScenario,
      createdAt,
      now,
      versionId,
      scenarioGroupId,
      versionNumber,
      options.parentVersionId ?? scenario.metadata.previousVersionId,
    );
    const statement = this.database.prepare(`
      INSERT INTO scenarios (
        id, scenario_id, source_scenario_id, version_number, parent_version_id,
        company_name, industry, mode, as_of_date, history_start_date, created_at, updated_at,
        customer_count, order_count, booked_revenue, scenario_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    statement.run(
      summary.id,
      summary.scenarioGroupId,
      versionedScenario.metadata.scenarioId,
      summary.versionNumber,
      summary.parentVersionId ?? null,
      summary.companyName,
      summary.industry,
      summary.mode,
      summary.asOfDate ?? null,
      summary.historyStartDate ?? null,
      summary.createdAt,
      summary.updatedAt,
      summary.customerCount,
      summary.orderCount,
      summary.bookedRevenue,
      JSON.stringify(versionedScenario),
    );

    return { ...summary, scenario: versionedScenario };
  }

  list(): ScenarioSummary[] {
    const rows = this.database
      .prepare(
        `
        SELECT id, scenario_id, version_number, parent_version_id,
          company_name, industry, mode, as_of_date, history_start_date, created_at, updated_at,
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
        SELECT id, scenario_id, version_number, parent_version_id,
          company_name, industry, mode, as_of_date, history_start_date, created_at, updated_at,
          customer_count, order_count, booked_revenue, scenario_json
        FROM scenarios
        WHERE id = ? OR scenario_id = ? OR source_scenario_id = ?
        ORDER BY version_number DESC, updated_at DESC
        LIMIT 1;
      `,
      )
      .get(id, id, id) as StoredScenarioRow | undefined;

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

  private listVersions(scenarioGroupId: string): ScenarioSummary[] {
    const rows = this.database
      .prepare(
        `
        SELECT id, scenario_id, version_number, parent_version_id,
          company_name, industry, mode, as_of_date, history_start_date, created_at, updated_at,
          customer_count, order_count, booked_revenue
        FROM scenarios
        WHERE scenario_id = ?
        ORDER BY version_number DESC;
      `,
      )
      .all(scenarioGroupId) as unknown as StoredScenarioRow[];

    return rows.map(rowToSummary);
  }

  private nextVersionNumber(scenarioGroupId: string): number {
    const row = this.database
      .prepare("SELECT MAX(version_number) as version_number FROM scenarios WHERE scenario_id = ?")
      .get(scenarioGroupId) as { version_number?: number } | undefined;

    return (row?.version_number ?? 0) + 1;
  }

  private ensureColumn(name: string, definition: string): void {
    const columns = this.database.prepare("PRAGMA table_info(scenarios);").all() as Array<{
      name: string;
    }>;

    if (columns.some((column) => column.name === name)) {
      return;
    }

    this.database.exec(`ALTER TABLE scenarios ADD COLUMN ${name} ${definition};`);
  }
}

interface StoredScenarioRow {
  id: string;
  scenario_id?: string;
  version_number?: number;
  parent_version_id?: string | null;
  company_name: string;
  industry: string;
  mode: string;
  as_of_date?: string | null;
  history_start_date?: string | null;
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
  versionId = scenario.metadata.versionId ?? scenario.metadata.scenarioId,
  scenarioGroupId = scenario.metadata.scenarioGroupId ?? scenario.metadata.scenarioId,
  versionNumber = scenario.metadata.versionNumber ?? 1,
  parentVersionId = scenario.metadata.previousVersionId,
): ScenarioSummary {
  return {
    id: versionId,
    scenarioGroupId,
    versionNumber,
    parentVersionId,
    companyName: scenario.profile.companyName,
    industry: scenario.profile.industry,
    mode: scenario.metadata.mode,
    asOfDate: scenario.metadata.asOfDate,
    historyStartDate: scenario.metadata.historyStartDate,
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
    scenarioGroupId: row.scenario_id ?? row.id,
    versionNumber: row.version_number ?? 1,
    parentVersionId: row.parent_version_id ?? undefined,
    companyName: row.company_name,
    industry: row.industry,
    mode: row.mode,
    asOfDate: row.as_of_date ?? undefined,
    historyStartDate: row.history_start_date ?? undefined,
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
