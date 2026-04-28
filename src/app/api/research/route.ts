import { NextResponse } from "next/server";
import { z } from "zod";
import { scenarioInputSchema } from "@/lib/domain/schemas";
import { validationDetails } from "@/lib/domain/validation";
import { getLlmProvider, isLlmResearchEnabled } from "@/lib/model/providers";
import { buildResearchExtractionPrompt, researchExtractionSystemPrompt } from "@/lib/model/prompts";
import type { ResearchExtraction } from "@/lib/model/types";
import { buildProfileFromSources } from "@/lib/research/profile-builder";
import { collectResearchSources } from "@/lib/research/sources";

const researchExtractionSchema = z.object({
  productFamilies: z.array(z.string()).default([]),
  markets: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  geographies: z.array(z.string()).default([]),
  launches: z.array(z.string()).default([]),
  buyerSegments: z.array(z.string()).default([]),
  industryLanguage: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid research input" }, { status: 400 });
  }

  const parsedInput = scenarioInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "Invalid research input",
        details: validationDetails(parsedInput.error),
      },
      { status: 400 },
    );
  }

  try {
    const input = parsedInput.data;
    const sources = await collectResearchSources(input.companyName, input.companyUrl || undefined);
    const extraction = await extractPublicResearchSignals(sources);
    const profile = buildProfileFromSources(input, sources, extraction);

    return NextResponse.json({ profile, sources });
  } catch {
    return NextResponse.json({ error: "Research request failed" }, { status: 500 });
  }
}

async function extractPublicResearchSignals(
  sources: Awaited<ReturnType<typeof collectResearchSources>>,
): Promise<ResearchExtraction | undefined> {
  if (!isLlmResearchEnabled()) {
    return undefined;
  }

  const sourceText = sources
    .map((source) =>
      [`TITLE: ${source.title}`, source.url ? `URL: ${source.url}` : null, source.text]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n");
  const result = await getLlmProvider().extractJson<unknown>({
    system: researchExtractionSystemPrompt,
    prompt: buildResearchExtractionPrompt(sourceText),
    schemaName: "ResearchExtraction",
  });

  return researchExtractionSchema.parse(result.data);
}
