import { NextResponse } from "next/server";
import { getScenarioStore } from "@/lib/persistence/scenario-store";

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
