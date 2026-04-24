import { NextResponse } from "next/server";
import { generatedScenarioSchema } from "@/lib/domain/schemas";
import { scenarioToZip } from "@/lib/export/zip";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid export input" }, { status: 400 });
  }

  const parsedScenario = generatedScenarioSchema.safeParse(body);

  if (!parsedScenario.success) {
    return NextResponse.json({ error: "Invalid export input" }, { status: 400 });
  }

  try {
    const zip = await scenarioToZip(parsedScenario.data);

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
