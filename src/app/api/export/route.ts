import { NextResponse } from "next/server";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import type { ExportProfileId, ExportTemplate, TemplateSourceTable } from "@/lib/export/profiles";
import { EXPORT_PROFILES } from "@/lib/export/profiles";
import { scenarioToZip } from "@/lib/export/zip";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid export input" }, { status: 400 });
  }

  const exportRequest = normalizeExportRequest(body);
  const parsedScenario = generatedScenarioSchema.safeParse(exportRequest.scenario);

  if (!parsedScenario.success) {
    return NextResponse.json({ error: "Invalid export input" }, { status: 400 });
  }

  try {
    const zip = await scenarioToZip(parsedScenario.data, {
      profileId: exportRequest.profileId,
      templates: exportRequest.templates,
    });

    return new NextResponse(zip, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${parsedScenario.data.metadata.scenarioId}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export request failed" }, { status: 500 });
  }
}

function normalizeExportRequest(body: unknown): {
  scenario: unknown;
  profileId: ExportProfileId;
  templates: ExportTemplate[];
} {
  if (!isObject(body) || !("scenario" in body)) {
    return { scenario: body, profileId: "standard", templates: [] };
  }

  return {
    scenario: body.scenario,
    profileId: parseProfileId(body.profileId),
    templates: parseTemplates(body.templates),
  };
}

function parseProfileId(value: unknown): ExportProfileId {
  if (
    typeof value === "string" &&
    EXPORT_PROFILES.some((profile) => profile.id === value)
  ) {
    return value as ExportProfileId;
  }

  return "standard";
}

function parseTemplates(value: unknown): ExportTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((template): ExportTemplate | null => {
      if (!isObject(template) || typeof template.fileName !== "string") {
        return null;
      }

      const sourceTable = parseSourceTable(template.sourceTable);
      if (!sourceTable || !Array.isArray(template.columns)) {
        return null;
      }

      const columns = template.columns
        .map((column): ExportTemplate["columns"][number] | null => {
          if (!isObject(column) || typeof column.header !== "string") {
            return null;
          }

          const parsedColumn: ExportTemplate["columns"][number] = {
            header: column.header,
          };

          if (typeof column.source === "string") {
            parsedColumn.source = column.source;
          }

          if (
            typeof column.constant === "string" ||
            typeof column.constant === "number" ||
            typeof column.constant === "boolean" ||
            column.constant === null
          ) {
            parsedColumn.constant = column.constant;
          }

          return parsedColumn;
        })
        .filter((column): column is ExportTemplate["columns"][number] => column !== null);

      return {
        fileName: template.fileName,
        sourceTable,
        columns,
      };
    })
    .filter((template): template is ExportTemplate => template !== null);
}

function parseSourceTable(value: unknown): TemplateSourceTable | null {
  const sourceTables: TemplateSourceTable[] = [
    "customers",
    "products",
    "orders",
    "order_lines",
    "invoices",
    "payments",
    "opportunities",
    "returns",
    "monthly_revenue",
  ];

  return typeof value === "string" && sourceTables.includes(value as TemplateSourceTable)
    ? (value as TemplateSourceTable)
    : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
