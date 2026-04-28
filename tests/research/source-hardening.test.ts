import { describe, expect, it, vi } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { getLlmProvider } from "@/lib/model/providers";
import { buildProfileFromSources } from "@/lib/research/profile-builder";
import { collectResearchSources } from "@/lib/research/sources";

describe("research source hardening", () => {
  it("does not expose about:blank for no-url fallback sources", async () => {
    const sources = await collectResearchSources("Acme Industrial Components", "");

    expect(sources[0]).toMatchObject({
      id: "source_user_company_name",
      sourceType: "fallback",
      title: "Acme Industrial Components",
    });
    expect(sources[0]).not.toHaveProperty("url");
  });

  it("does not fetch syntactically unsafe server-side URLs", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const unsafeUrls = [
      "ftp://example.com",
      "http://localhost:3000",
      "http://127.0.0.1",
      "http://10.1.2.3",
      "http://172.16.0.1",
      "http://192.168.1.10",
      "http://169.254.169.254",
      "http://[::1]",
      "http://[fe80::1]",
      "http://[::ffff:7f00:1]",
      "http://[::ffff:c0a8:010a]",
      "http://[::ffff:127.0.0.1]",
      "http://internal.local",
    ];

    for (const unsafeUrl of unsafeUrls) {
      const sources = await collectResearchSources("Acme", unsafeUrl);
      expect(sources[0]?.sourceType).toBe("fallback");
      expect(sources[0]).not.toHaveProperty("url");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("labels fallback profile claims as inferred without source URLs", () => {
    const profile = buildProfileFromSources(defaultScenarioInput, [
      {
        id: "source_company_homepage_unavailable",
        sourceType: "fallback",
        title: "Acme Industrial Components",
        retrievedAt: "2026-04-24T00:00:00.000Z",
        text: "Public web research was unavailable.",
      },
    ]);

    expect(profile.claims[0]).toMatchObject({
      field: "source",
      sourceType: "inferred",
      confidence: 0.2,
    });
    expect(profile.claims[0]?.value).toContain("Public research unavailable");
    expect(profile.claims[0]).not.toHaveProperty("sourceUrl");
  });

  it("bounds fetched response text before and after HTML stripping", async () => {
    const longHtml = `<main>${"A".repeat(25_000)}</main>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(longHtml, { status: 200 })),
    );

    const sources = await collectResearchSources("Acme", "https://example.com");

    expect(sources[0]).toMatchObject({
      sourceType: "public_web",
      url: "https://example.com/",
    });
    expect(sources[0]?.text.length).toBeLessThanOrEqual(20_000);
    expect(sources[0]?.text).not.toContain("<main>");
    vi.unstubAllGlobals();
  });

  it("strips markup before applying the source text limit", async () => {
    const longStyle = `<style>${".theme{color:red;}".repeat(1_400)}</style>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(`${longStyle}<main>Enclosed Drives Open Gearing Custom Drives</main>`, {
          status: 200,
        }),
      ),
    );

    const sources = await collectResearchSources("Cleveland Gear Company", "https://example.com");

    expect(sources[0]?.text).toContain("Enclosed Drives");
    expect(sources[0]?.text).toContain("Open Gearing");
    expect(sources[0]?.text).not.toContain(".theme");
    expect(sources[0]?.text.length).toBeLessThanOrEqual(20_000);
    vi.unstubAllGlobals();
  });

  it("discovers and fetches relevant same-site research pages", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url === "https://example.com/") {
        return new Response(
          `
            <main>
              <p>General manufacturer overview.</p>
              <a href="/products-services/">Products and Services</a>
              <a href="/contact/">Contact</a>
              <a href="https://other.example.com/products/">Other site products</a>
            </main>
          `,
          { status: 200 },
        );
      }

      if (url === "https://example.com/products-services/") {
        return new Response(
          "<main>Precision gears, enclosed drives, speed reducers, and custom industrial gearing.</main>",
          { status: 200 },
        );
      }

      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const sources = await collectResearchSources("Cleveland Gear Company", "https://example.com");

    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.url)).toEqual([
      "https://example.com/",
      "https://example.com/products-services/",
    ]);
    expect(sources[1]?.text).toContain("Precision gears");
    expect(fetchSpy).not.toHaveBeenCalledWith(
      "https://other.example.com/products/",
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it("stops reading streamed response bodies after the byte limit", async () => {
    const encoder = new TextEncoder();
    let pullCount = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1;
        controller.enqueue(encoder.encode("A".repeat(1024)));

        if (pullCount >= 100) {
          controller.close();
        }
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );

    const sources = await collectResearchSources("Acme", "https://example.com");

    expect(sources[0]?.text.length).toBeLessThanOrEqual(20_000);
    expect(pullCount).toBeLessThan(100);
    vi.unstubAllGlobals();
  });

  it("passes a timeout signal to fetch", async () => {
    const fetchSpy = vi.fn(async () => new Response("<p>ok</p>", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await collectResearchSources("Acme", "https://example.com");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    vi.unstubAllGlobals();
  });

  it("does not follow redirects server-side", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1" },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const sources = await collectResearchSources("Acme", "https://example.com");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(sources[0]?.sourceType).toBe("fallback");
    expect(sources[0]).not.toHaveProperty("url");
    vi.unstubAllGlobals();
  });

  it("throws for unknown non-none LLM providers", () => {
    vi.stubEnv("LLM_PROVIDER", "unsupported");

    expect(() => getLlmProvider()).toThrow("Unsupported LLM_PROVIDER");
    vi.unstubAllEnvs();
  });

  it("requires Gemini configuration when the Gemini provider is enabled", () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("LLM_MODEL", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    expect(() => getLlmProvider()).toThrow("LLM_MODEL is required");
    vi.unstubAllEnvs();
  });

  it("requires a Gemini API key when the Gemini model is configured", () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("LLM_MODEL", "gemini-test-model");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    expect(() => getLlmProvider()).toThrow("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
    vi.unstubAllEnvs();
  });

  it("extracts structured JSON through the Gemini provider with GEMINI_API_KEY", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("LLM_MODEL", "gemini-test-model");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ productFamilies: ["Sealants"] }) }],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7 },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getLlmProvider().extractJson<{ productFamilies: string[] }>({
      system: "system",
      prompt: "prompt",
      schemaName: "ResearchExtraction",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/v1beta/models/gemini-test-model:generateContent"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toMatchObject({
      provider: "gemini",
      model: "gemini-test-model",
      data: { productFamilies: ["Sealants"] },
      usage: { inputTokens: 11, outputTokens: 7 },
    });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
