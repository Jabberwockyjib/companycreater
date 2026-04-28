export interface ResearchSource {
  id: string;
  title: string;
  retrievedAt: string;
  text: string;
  sourceType: "public_web" | "fallback";
  url?: string;
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;
const MAX_BODY_BYTES = 64_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESEARCH_SOURCES = 5;
const RESEARCH_LINK_KEYWORDS = [
  "product",
  "catalog",
  "service",
  "solution",
  "industry",
  "market",
  "application",
  "capability",
  "manufacturing",
  "engineering",
  "custom",
];

function stripHtml(html: string) {
  return html
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
  const ipv4MappedAddress = getIPv4MappedIPv6Address(normalizedHostname);

  if (ipv4MappedAddress) {
    return isUnsafeIPv4(ipv4MappedAddress);
  }

  return (
    normalizedHostname === "::" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fe80:") ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd")
  );
}

function getIPv4MappedIPv6Address(hostname: string) {
  if (!hostname.startsWith("::ffff:")) {
    return undefined;
  }

  const mappedAddress = hostname.slice("::ffff:".length);

  if (mappedAddress.includes(".")) {
    return mappedAddress;
  }

  const segments = mappedAddress.split(":");

  if (segments.length !== 2) {
    return undefined;
  }

  const high = Number.parseInt(segments[0] ?? "", 16);
  const low = Number.parseInt(segments[1] ?? "", 16);

  if (
    !Number.isInteger(high) ||
    !Number.isInteger(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return undefined;
  }

  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
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

function extractRelevantSameSiteUrls(html: string, baseUrl: URL) {
  const candidates = new Map<string, number>();
  const linkPattern =
    /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html))) {
    const href = match[1] ?? match[2] ?? match[3] ?? "";
    const anchorText = stripHtml(match[4] ?? "");
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(href, baseUrl);
    } catch {
      continue;
    }

    if (parsedUrl.origin !== baseUrl.origin || !parseSafePublicUrl(parsedUrl.href)) {
      continue;
    }

    parsedUrl.hash = "";
    const haystack = `${parsedUrl.pathname} ${anchorText}`.toLowerCase();
    const score = RESEARCH_LINK_KEYWORDS.reduce(
      (sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0),
      0,
    );

    if (score > 0) {
      candidates.set(parsedUrl.href, Math.max(candidates.get(parsedUrl.href) ?? 0, score));
    }
  }

  return [...candidates.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([href]) => href)
    .filter((href) => href !== baseUrl.href)
    .slice(0, MAX_RESEARCH_SOURCES - 1);
}

async function readBoundedResponseText(response: Response) {
  if (!response.body) {
    return (await response.text()).slice(0, MAX_BODY_BYTES);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let reachedLimit = false;

  try {
    while (bytesRead < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();

      if (done || !value) {
        break;
      }

      const remainingBytes = MAX_BODY_BYTES - bytesRead;
      const boundedChunk = value.byteLength > remainingBytes ? value.slice(0, remainingBytes) : value;

      chunks.push(boundedChunk);
      bytesRead += boundedChunk.byteLength;

      if (value.byteLength >= remainingBytes) {
        reachedLimit = true;
        break;
      }
    }

    if (reachedLimit) {
      await reader.cancel();
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(concatenateChunks(chunks, bytesRead));
}

function concatenateChunks(chunks: Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

async function fetchPublicResearchPage(url: URL) {
  const response = await fetch(url.href, {
    headers: { "user-agent": "sales-data-generator/0.1" },
    redirect: "manual",
    signal: buildTimeoutSignal(),
  });

  if (!response.ok) {
    return undefined;
  }

  const html = await readBoundedResponseText(response);
  const text = stripHtml(html);

  if (!text) {
    return undefined;
  }

  return { html, text };
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
    const firstPage = await fetchPublicResearchPage(safeUrl);

    if (!firstPage) {
      return [buildFallbackSource(companyName, safeUrl.href)];
    }

    const pages = [{ url: safeUrl.href, text: firstPage.text }];
    const discoveredUrls = extractRelevantSameSiteUrls(firstPage.html, safeUrl);

    for (const href of discoveredUrls) {
      const page = await fetchPublicResearchPage(new URL(href));

      if (page) {
        pages.push({ url: href, text: page.text });
      }
    }

    return pages.map((page, index) => ({
      id: index === 0 ? "source_company_homepage" : `source_company_page_${index + 1}`,
      url: page.url,
      title: companyName,
      retrievedAt: new Date().toISOString(),
      sourceType: "public_web" as const,
      text: page.text,
    }));
  } catch {
    return [buildFallbackSource(companyName, safeUrl.href)];
  }
}
