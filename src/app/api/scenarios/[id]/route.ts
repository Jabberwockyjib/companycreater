import { NextResponse } from "next/server";
import { getScenarioStore } from "@/lib/persistence/scenario-store";
import { extendScenarioToDate } from "@/lib/sim/versioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const scenario = getScenarioStore().find(id);

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch {
    return NextResponse.json({ error: "Scenario load failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const asOfDate =
    isObject(body) && typeof body.asOfDate === "string"
      ? body.asOfDate
      : new Date().toISOString().slice(0, 10);

  try {
    const storedScenario = getScenarioStore().find(id);

    if (!storedScenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const updatedScenario = extendScenarioToDate(storedScenario.scenario, asOfDate);
    const savedScenario = getScenarioStore().save(updatedScenario, {
      parentVersionId: storedScenario.id,
    });

    return NextResponse.json({ scenario: savedScenario });
  } catch {
    return NextResponse.json({ error: "Scenario update failed" }, { status: 500 });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
