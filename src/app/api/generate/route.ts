import { NextResponse } from "next/server";
import { scenarioInputSchema } from "@/lib/domain/schemas";
import type { GeneratedScenario, ScenarioInput } from "@/lib/domain/types";
import { generateScenario } from "@/lib/sim/generate";

type ScenarioGenerator = (input: ScenarioInput) => GeneratedScenario;

export async function handleGenerateRequest(
  request: Request,
  generator: ScenarioGenerator = generateScenario,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid generation input" }, { status: 400 });
  }

  const parsedInput = scenarioInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json({ error: "Invalid generation input" }, { status: 400 });
  }

  try {
    const scenario = generator(parsedInput.data);
    return NextResponse.json(scenario);
  } catch {
    return NextResponse.json({ error: "Generation request failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleGenerateRequest(request);
}
