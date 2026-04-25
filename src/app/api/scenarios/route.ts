import { NextResponse } from "next/server";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import { getScenarioStore } from "@/lib/persistence/scenario-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ scenarios: getScenarioStore().list() });
  } catch {
    return NextResponse.json({ error: "Scenario list failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid scenario input" }, { status: 400 });
  }

  const parsedScenario = generatedScenarioSchema.safeParse(body);

  if (!parsedScenario.success) {
    return NextResponse.json({ error: "Invalid scenario input" }, { status: 400 });
  }

  try {
    return NextResponse.json({ scenario: getScenarioStore().save(parsedScenario.data) });
  } catch {
    return NextResponse.json({ error: "Scenario save failed" }, { status: 500 });
  }
}
