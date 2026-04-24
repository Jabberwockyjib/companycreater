import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { scenarioInputSchema } from "@/lib/domain/schemas";
import { buildProfileFromSources } from "@/lib/research/profile-builder";
import { collectResearchSources } from "@/lib/research/sources";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = scenarioInputSchema.parse(body);
    const sources = await collectResearchSources(input.companyName, input.companyUrl || undefined);
    const profile = buildProfileFromSources(input, sources);

    return NextResponse.json({ profile, sources });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid research input" }, { status: 400 });
    }

    return NextResponse.json({ error: "Research request failed" }, { status: 500 });
  }
}
