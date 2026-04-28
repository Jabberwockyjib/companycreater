import { NextResponse } from "next/server";
import { z } from "zod";
import { companyProfileSchema, scenarioInputSchema } from "@/lib/domain/schemas";
import type { GeneratedScenario, ScenarioInput } from "@/lib/domain/types";
import { generateScenario, type GenerateScenarioOptions } from "@/lib/sim/generate";

type ScenarioGenerator = (input: ScenarioInput, options?: GenerateScenarioOptions) => GeneratedScenario;

const generationRequestSchema = z.union([
  scenarioInputSchema.transform((input) => ({
    input,
    options: {},
  })),
  z
    .object({
      input: scenarioInputSchema,
      researchProfile: companyProfileSchema.optional(),
    })
    .transform(({ input, researchProfile }) => ({
      input,
      options: researchProfile ? { researchProfile } : {},
    })),
]);

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

  const parsedRequest = generationRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid generation input",
        details: validationDetails(parsedRequest.error),
      },
      { status: 400 },
    );
  }

  try {
    const scenario = generator(parsedRequest.data.input, parsedRequest.data.options);
    return NextResponse.json(scenario);
  } catch {
    return NextResponse.json({ error: "Generation request failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleGenerateRequest(request);
}

function validationDetails(error: z.ZodError): string[] {
  const details = new Set<string>();

  for (const issue of error.issues) {
    if (issue.code === "invalid_union") {
      for (const nestedError of issue.errors) {
        for (const nestedIssue of nestedError) {
          details.add(nestedIssue.message);
        }
      }
      continue;
    }

    details.add(issue.message);
  }

  return [...details].filter((message) => message !== "Invalid input");
}
