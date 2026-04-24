export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  retrievedAt: string;
  text: string;
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_TEXT_LENGTH);
}

function buildFallbackSource(companyName: string, companyUrl?: string): ResearchSource {
  const hasUrl = Boolean(companyUrl);

  return {
    id: hasUrl ? "source_company_homepage_unavailable" : "source_user_company_name",
    url: companyUrl || "about:blank",
    title: companyName,
    retrievedAt: new Date().toISOString(),
    text: hasUrl
      ? `${companyName} public web research at ${companyUrl} could not be retrieved. The app will use a conservative inferred profile from user assumptions and will not claim private internal data.`
      : `${companyName} public web research was not provided with a URL. The app will use a conservative inferred profile from user assumptions and will not claim private internal data.`,
  };
}

export async function collectResearchSources(
  companyName: string,
  companyUrl?: string,
): Promise<ResearchSource[]> {
  if (!companyUrl) {
    return [buildFallbackSource(companyName)];
  }

  try {
    const response = await fetch(companyUrl, {
      headers: { "user-agent": "sales-data-generator/0.1" },
    });

    if (!response.ok) {
      return [buildFallbackSource(companyName, companyUrl)];
    }

    const text = stripHtml(await response.text());

    return [
      {
        id: "source_company_homepage",
        url: companyUrl,
        title: companyName,
        retrievedAt: new Date().toISOString(),
        text: text || buildFallbackSource(companyName, companyUrl).text,
      },
    ];
  } catch {
    return [buildFallbackSource(companyName, companyUrl)];
  }
}
