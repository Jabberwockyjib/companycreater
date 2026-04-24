export interface ResearchSource {
  id: string;
  title: string;
  retrievedAt: string;
  text: string;
  sourceType: "public_web" | "fallback";
  url?: string;
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;
const FETCH_TIMEOUT_MS = 5_000;

function stripHtml(html: string) {
  return html
    .slice(0, MAX_SOURCE_TEXT_LENGTH)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_TEXT_LENGTH);
}

function isUnsafeIPv4(hostname: string) {
  const octets = hostname.split(".");

  if (octets.length !== 4) {
    return false;
  }

  const numbers = octets.map((part) => Number(part));

  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = numbers;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isUnsafeIPv6(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  return (
    normalizedHostname === "::" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fe80:") ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd")
  );
}

function parseSafePublicUrl(companyUrl: string): URL | undefined {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(companyUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return undefined;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // This is a syntactic SSRF prefilter. DNS resolution and post-resolution IP checks are out of scope.
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isUnsafeIPv4(hostname) ||
    isUnsafeIPv6(hostname)
  ) {
    return undefined;
  }

  return parsedUrl;
}

function buildFallbackSource(companyName: string, companyUrl?: string): ResearchSource {
  const reason = companyUrl
    ? `${companyName} public web research at the provided URL was unavailable or blocked by the URL safety prefilter.`
    : `${companyName} public web research was not provided with a URL.`;

  return {
    id: companyUrl ? "source_company_homepage_unavailable" : "source_user_company_name",
    title: companyName,
    retrievedAt: new Date().toISOString(),
    sourceType: "fallback",
    text: `${reason} The app will use a conservative inferred profile from user assumptions and will not claim private internal data.`,
  };
}

function buildTimeoutSignal() {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(FETCH_TIMEOUT_MS);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return controller.signal;
}

export async function collectResearchSources(
  companyName: string,
  companyUrl?: string,
): Promise<ResearchSource[]> {
  if (!companyUrl) {
    return [buildFallbackSource(companyName)];
  }

  const safeUrl = parseSafePublicUrl(companyUrl);

  if (!safeUrl) {
    return [buildFallbackSource(companyName, companyUrl)];
  }

  try {
    const response = await fetch(safeUrl.href, {
      headers: { "user-agent": "sales-data-generator/0.1" },
      signal: buildTimeoutSignal(),
    });

    if (!response.ok) {
      return [buildFallbackSource(companyName, safeUrl.href)];
    }

    const text = stripHtml(await response.text());

    return [
      {
        id: "source_company_homepage",
        url: safeUrl.href,
        title: companyName,
        retrievedAt: new Date().toISOString(),
        sourceType: "public_web",
        text: text || buildFallbackSource(companyName, safeUrl.href).text,
      },
    ];
  } catch {
    return [buildFallbackSource(companyName, safeUrl.href)];
  }
}
