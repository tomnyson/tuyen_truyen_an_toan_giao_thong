import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__webSearchWorkerEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const env = globalThis.__webSearchWorkerEnv",
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(
          specifier === "@/db" ? "../db/index.ts" : `../${specifier.slice(2)}.ts`,
          import.meta.url,
        ).href,
      };
    }
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (
      specifier.startsWith(".") &&
      !specifier.match(/\.[a-z]+$/i) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  DISCOVERY_ONLY_SEARCH_DOMAINS,
  WEB_SEARCH_DOMAINS,
  canonicalOfficialSourceUrl,
  canonicalReferenceSourceUrl,
  containsUnverifiedLegalClaim,
  readOpenAiWebSearchConfig,
  sanitizeWebSearchQuestion,
  searchAllowedLegalSources,
  searchReferenceLegalSources,
} = await import("../lib/openai-web-search.ts");
const {
  parseChatAnswerSections,
  projectPublicWebSearchAnswer,
  reviewedCitationsToLegalBasisSection,
} = await import("../lib/chat-answer-presentation.ts");
const {
  parseOfficialSourceLinks,
  parsePublicSourceLinks,
  parseReferenceSourceLinks,
  publicSourceUiCopy,
} = await import("../lib/official-source-url.ts");
const { createChatHandler } = await import("../app/api/chat/route.ts");

function providerResponse({
  url = "https://vanban.chinhphu.vn/?pageid=27160&docid=123#section",
  title = "Văn bản Chính phủ",
  annotations,
  consultedSources,
  model = "gpt-5.4-mini",
  text = "Theo nguồn Chính phủ, quy định này cần được kiểm tra theo trường hợp cụ thể.",
  overrides = {},
} = {}) {
  return new Response(
    JSON.stringify({
      id: "resp_web_test",
      status: "completed",
      model,
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: {
            type: "search",
            sources:
              consultedSources ??
              [
                { type: "url", url },
                {
                  type: "url",
                  url: "https://thuvienphapluat.vn/discovery-only",
                },
              ],
          },
        },
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text,
              annotations:
                annotations ??
                [
                  {
                    type: "url_citation",
                    url,
                    title,
                    start_index: 0,
                    end_index: 18,
                  },
                ],
            },
          ],
        },
      ],
      usage: {
        input_tokens: 80,
        output_tokens: 40,
        total_tokens: 120,
      },
      ...overrides,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

function assertFailureCode(result, code) {
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
}

test("reads the web-search flag strictly and never exposes key defaults", () => {
  assert.deepEqual(
    readOpenAiWebSearchConfig({
      AI_WEB_SEARCH_ENABLED: "true",
      OPENAI_API_KEY: "fake-secret",
      OPENAI_MODEL: "",
      AI_PROVIDER_TIMEOUT_MS: "2500",
    }),
    {
      enabled: true,
      apiKey: "fake-secret",
      model: "",
      timeoutMs: 2500,
    },
  );
  assert.equal(
    readOpenAiWebSearchConfig({ AI_WEB_SEARCH_ENABLED: "TRUE" }).enabled,
    false,
  );
});

test("redacts contact details and URLs before provider search", () => {
  const sanitized = sanitizeWebSearchQuestion(
    "  Liên hệ Test@Example.com, 0912 345 678 hoặc https://evil.test/a\nđể hỏi luật ",
  );
  assert.equal(
    sanitized,
    "Liên hệ [email đã ẩn], [số điện thoại đã ẩn] hoặc [đường dẫn đã ẩn] để hỏi luật",
  );
  assert.doesNotMatch(sanitized, /example\.com|0912|evil\.test/i);
});

test("projects provider Markdown and long inline citations into readable public sections", () => {
  const raw = [
    "## Kết luận",
    "Nếu **không đội mũ bảo hiểm**, bạn có thể bị xử lý. ([xaydungchinhphu.vn](https://xaydungchinhsach.chinhphu.vn/duong-dan-rat-dai.htm?utm_source=openai))",
    "",
    "### Giải thích:",
    "Mức áp dụng còn phụ thuộc độ tuổi và loại xe.",
    "",
    "### Bạn nên làm gì:",
    "- Đội mũ đạt chuẩn và cài quai đúng cách.",
    "- Mở [văn bản chính thức](https://vbpl.vn/document?utm_source=openai) để kiểm tra.",
  ].join("\n");

  const presentation = projectPublicWebSearchAnswer(raw);
  assert.ok(presentation);
  assert.deepEqual(
    presentation.sections.map((section) => section.kind),
    ["summary", "details", "next_steps"],
  );
  assert.doesNotMatch(
    presentation.answer,
    /\*\*|#{1,6}|\[[^\]]+\]\(|https?:\/\/|chinhphu\.vn|vbpl\.vn/i,
  );
  assert.match(presentation.answer, /không đội mũ bảo hiểm/i);
  assert.match(presentation.answer, /Đội mũ đạt chuẩn/i);
  assert.deepEqual(
    parseChatAnswerSections(presentation.sections),
    presentation.sections,
  );
  assert.deepEqual(
    projectPublicWebSearchAnswer(presentation.answer),
    presentation,
  );
});

test("builds reviewed legal-basis cards from canonical citation metadata", () => {
  const section = reviewedCitationsToLegalBasisSection([
    {
      title: "Quy định xử phạt vi phạm hành chính về giao thông đường bộ",
      documentNumber: "168/2024/NĐ-CP",
      issuedAt: "2024-12-26",
      article: "7",
      clause: "2",
      point: "h",
      effectiveFrom: "2025-01-01",
      lastVerifiedAt: "2026-07-31",
    },
  ]);
  assert.deepEqual(section, {
    kind: "legal_basis",
    paragraphs: [
      "168/2024/NĐ-CP — Quy định xử phạt vi phạm hành chính về giao thông đường bộ. Điểm h, khoản 2, Điều 7. Ban hành ngày 26/12/2024. Có hiệu lực từ 01/01/2025. Kiểm tra gần nhất 31/07/2026.",
    ],
    bullets: [],
  });
  assert.deepEqual(parseChatAnswerSections([section]), [section]);

  const consolidated = reviewedCitationsToLegalBasisSection([
    {
      title: "Văn bản hợp nhất Luật Sở hữu trí tuệ",
      documentNumber: "155/VBHN-VPQH",
      issuedAt: "2025-09-09",
      article: "25",
      effectiveFrom: "2023-01-01",
      effectivityNote:
        "Văn bản hợp nhất được xác lập ngày 09/09/2025; ngày 01/01/2023 là hiệu lực của các sửa đổi liên quan.",
      lastVerifiedAt: "2026-07-31",
    },
  ]);
  assert.match(
    consolidated.paragraphs[0],
    /Văn bản hợp nhất được xác lập ngày 09\/09\/2025/,
  );
  assert.doesNotMatch(
    consolidated.paragraphs[0],
    /Có hiệu lực từ 01\/01\/2023/,
  );
});

test("detects legal amounts, provisions, document numbers, dates and ages in direct web prose", () => {
  for (const claim of [
    "Mức phạt là 400.000 đồng.",
    "Áp dụng theo điểm h khoản 2 Điều 7.",
    "Nghị định 168/2024/NĐ-CP quy định việc này.",
    "Văn bản có hiệu lực từ 01/01/2025.",
    "Người từ đủ 16 tuổi có thể bị xử lý.",
    "Mức tham khảo là 400.000–600.000đ.",
    "Mức tham khảo là 400k.",
    "Mức tham khảo là năm triệu đồng.",
    "Theo 168/2024/NĐ-CP, hành vi này bị xử lý.",
    "Văn bản có hiệu lực từ 2025-01-01.",
    "Văn bản có hiệu lực từ ngày một tháng một năm hai nghìn không trăm hai mươi lăm.",
    "Điều bảy quy định hành vi này.",
    "Điều thứ bảy quy định hành vi này.",
    "Khoản thứ hai có nội dung liên quan.",
    "Văn bản có hiệu lực từ ngày mùng một tháng một năm hai nghìn không trăm hai mươi lăm.",
    "Văn bản có hiệu lực ngày 1 tháng 1 năm 2025.",
    "Điều 7a quy định hành vi này.",
    "Nghị định số 168 năm 2024 có nội dung liên quan.",
    "Chỉ được chở hai người.",
    "Giới hạn tốc độ là năm mươi km/h.",
    "Mỗi xe chỉ chở 2 người.",
    "Không được chở quá hai người.",
    "Xe được chở hai người.",
    "Có hiệu lực từ 01 tháng 01 năm 2025.",
    "Xe có dung tích 50 cm³.",
    "Xe có dung tích 50 phân khối.",
    "Giới hạn tốc độ 50 km/giờ.",
  ]) {
    assert.equal(containsUnverifiedLegalClaim(claim), true, claim);
  }
  assert.equal(
    containsUnverifiedLegalClaim(
      "Bạn nên mở nguồn Chính phủ bên dưới và nhờ người lớn hỗ trợ kiểm tra trường hợp cụ thể.",
    ),
    false,
  );
  assert.equal(
    containsUnverifiedLegalClaim(
      "Bạn đang hỏi về tình huống đi xe máy tống 3; nên dừng xe và chọn cách di chuyển an toàn hơn.",
    ),
    false,
  );
  assert.equal(
    containsUnverifiedLegalClaim(
      "Theo quy định chỉ được chở tối đa 2 người.",
    ),
    true,
  );
});

test("public answer projector rejects active content and section parser fails closed", () => {
  for (const value of [
    "Kết luận: an toàn <script>alert('x')</script>",
    'Kết luận: {"answer":"Đội mũ"}',
    "---\nKết luận: Đội mũ",
    "> Kết luận: Đội mũ",
    "```json\n{\"answer\":\"Đội mũ\"}\n```",
    "| Kết luận | Căn cứ |\n|---|---|",
  ]) {
    assert.equal(projectPublicWebSearchAnswer(value), null);
  }
  assert.equal(
    parseChatAnswerSections([
      {
        kind: "summary",
        paragraphs: ["Nội dung"],
        bullets: [],
        href: "https://evil.example",
      },
    ]),
    null,
  );
});

test("chat UI keeps warning, structured text and canonical source actions in safe DOM order", async () => {
  const [pageSource, cssSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const warningIndex = pageSource.indexOf(
    '{message.warning && (',
  );
  const sectionsIndex = pageSource.indexOf(
    "{message.sections ? (",
  );
  const sourcesIndex = pageSource.indexOf(
    "{message.sources && (",
  );
  assert.ok(warningIndex >= 0);
  assert.ok(warningIndex < sectionsIndex);
  assert.ok(sectionsIndex < sourcesIndex);
  assert.match(pageSource, /parseChatAnswerSections\(data\.sections\)/);
  assert.match(
    pageSource,
    /parsePublicSourceLinks\(data\.sources, sourceKind\)/,
  );
  assert.match(pageSource, /publicSourceUiCopy\(/);
  assert.match(pageSource, /target="_blank"/);
  assert.match(pageSource, /rel="noopener noreferrer"/);
  assert.match(pageSource, /role="note"/);
  assert.match(pageSource, /data-kind=\{section\.kind\}/);
  assert.match(cssSource, /\.chat-answer-section-legal-basis/);
  assert.match(cssSource, /\.chat-answer-section-sanctions/);
  assert.doesNotMatch(pageSource, /dangerouslySetInnerHTML/);
  assert.match(cssSource, /@media \(max-width: 420px\)/);
  assert.match(cssSource, /\.chat-message \{[^}]*overflow-wrap: anywhere;/);
  assert.match(cssSource, /\.chat-panel \{[^}]*width: calc\(100vw - 24px\)/);
});

test("reference UI copy and parsing are selected by runtime sourceKind", () => {
  const referenceSources = [
    {
      title: "Bài viết tham khảo",
      url: "https://thuvienphapluat.vn/van-ban/giao-thong",
    },
  ];
  assert.deepEqual(
    parsePublicSourceLinks(referenceSources, "reference"),
    referenceSources,
  );
  assert.deepEqual(publicSourceUiCopy("reference", true), {
    warningTitle: "Thông tin tham khảo — chưa xác minh",
    groupTitle: "Nguồn tham khảo ngoài — cần xác minh",
    fallbackTitle: "Nguồn tham khảo",
    openAction: "Mở nguồn tham khảo ↗",
    openAriaPrefix: "Mở nguồn tham khảo cần xác minh",
  });

  // Missing or malformed sourceKind defaults to the stricter official parser,
  // so a reference URL cannot be mislabeled as official.
  assert.deepEqual(parsePublicSourceLinks(referenceSources, undefined), []);
  assert.deepEqual(parsePublicSourceLinks(referenceSources, "external"), []);
  assert.equal(
    publicSourceUiCopy(undefined, true).groupTitle,
    "Nguồn chính thức đã tra cứu",
  );
});

test("accepts and canonicalizes only exact official HTTPS authorities", () => {
  assert.equal(
    canonicalOfficialSourceUrl(
      "https://vanban.chinhphu.vn/?pageid=1&docid=2#fragment",
    ),
    "https://vanban.chinhphu.vn/?pageid=1&docid=2",
  );
  for (const invalid of [
    "http://vbpl.vn/document",
    "https://vbpl.vn.evil.test/document",
    "https://evil.test/vbpl.vn/document",
    "https://user@vbpl.vn/document",
    "https://vbpl.vn:8443/document",
    "https://thuvienphapluat.vn/document",
  ]) {
    assert.equal(canonicalOfficialSourceUrl(invalid), null);
  }
});

test("the UI source parser keeps only deduplicated official links", () => {
  assert.deepEqual(
    parseOfficialSourceLinks([
      {
        title: "  Văn bản Chính phủ  ",
        url: "https://vanban.chinhphu.vn/document#fragment",
      },
      {
        title: "Bản trùng",
        url: "https://vanban.chinhphu.vn/document",
      },
      {
        title: "Discovery only",
        url: "https://thuvienphapluat.vn/document",
      },
      {
        title: "Giả mạo",
        url: "https://vbpl.vn.evil.test/document",
      },
    ]),
    [
      {
        title: "Văn bản Chính phủ",
        url: "https://vanban.chinhphu.vn/document",
      },
    ],
  );
});

test("the reference parser accepts only exact HTTPS reference authorities", () => {
  assert.equal(
    canonicalReferenceSourceUrl(
      "https://thuvienphapluat.vn/van-ban/giao-thong#noi-dung",
    ),
    "https://thuvienphapluat.vn/van-ban/giao-thong",
  );
  assert.deepEqual(
    parseReferenceSourceLinks([
      {
        title: "Thư Viện Pháp Luật",
        url: "https://thuvienphapluat.vn/van-ban/giao-thong",
      },
      {
        title: "Tên miền giả",
        url: "https://thuvienphapluat.vn.evil.test/van-ban",
      },
      {
        title: "Nguồn Chính phủ không thuộc reference allowlist",
        url: "https://vbpl.vn/document",
      },
    ]),
    [
      {
        title: "Thư Viện Pháp Luật",
        url: "https://thuvienphapluat.vn/van-ban/giao-thong",
      },
    ],
  );
  for (const invalid of [
    "http://thuvienphapluat.vn/van-ban",
    "https://user@thuvienphapluat.vn/van-ban",
    "https://thuvienphapluat.vn:8443/van-ban",
    "https://thuvienphapluat.vn.evil.test/van-ban",
  ]) {
    assert.equal(canonicalReferenceSourceUrl(invalid), null);
  }
});

test("sends a required, store-false, server-allowlisted search and returns official citations", async () => {
  let requestBody;
  const result = await searchAllowedLegalSources(
    {
      enabled: true,
      apiKey: "fake-secret",
      model: "gpt-5.4-mini",
      timeoutMs: 1_000,
    },
    "Số điện thoại 0912 345 678 hỏi quy định này thế nào?",
    {
      fetch: async (_url, init) => {
        requestBody = JSON.parse(init.body);
        return providerResponse();
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.sourceKind, "official");
  assert.deepEqual(requestBody.tools, [
    {
      type: "web_search",
      search_context_size: "low",
      filters: { allowed_domains: WEB_SEARCH_DOMAINS },
    },
  ]);
  assert.equal(requestBody.tool_choice, "required");
  assert.equal(requestBody.store, false);
  assert.deepEqual(requestBody.include, [
    "web_search_call.action.sources",
  ]);
  assert.doesNotMatch(requestBody.input, /0912 345 678/);
  assert.deepEqual(result.sources, [
    {
      title: "Văn bản Chính phủ",
      url: "https://vanban.chinhphu.vn/?pageid=27160&docid=123",
    },
  ]);
  assert.deepEqual(result.sections, [
    {
      kind: "summary",
      paragraphs: [
        "Theo nguồn Chính phủ, quy định này cần được kiểm tra theo trường hợp cụ thể.",
      ],
      bullets: [],
    },
  ]);
  assert.doesNotMatch(result.answer, /\*\*|\[[^\]]+\]\(|https?:\/\//);
  assert.equal(result.usage.totalTokens, 120);
});

test("reference search is separately allowlisted and visibly unverified", async () => {
  let requestBody;
  const result = await searchReferenceLegalSources(
    {
      enabled: true,
      apiKey: "fake-secret",
      model: "gpt-5.4-mini",
      timeoutMs: 1_000,
    },
    "đi xe máy tống 3",
    {
      fetch: async (_url, init) => {
        requestBody = JSON.parse(init.body);
        return providerResponse({
          url: "https://thuvienphapluat.vn/van-ban/giao-thong",
          title: "Bài viết tham khảo",
          text: "Kết luận: Bạn đang hỏi về tình huống đi xe máy tống 3.\nBạn nên làm gì: Hãy chọn cách di chuyển an toàn hơn và xác minh bằng nguồn chính thức.",
        });
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.sourceKind, "reference");
  assert.deepEqual(requestBody.tools[0].filters.allowed_domains, [
    ...DISCOVERY_ONLY_SEARCH_DOMAINS,
  ]);
  assert.match(result.warning, /không phải nguồn chính thống/i);
  assert.match(result.warning, /xác minh/i);
  assert.deepEqual(result.sources, [
    {
      title: "Bài viết tham khảo",
      url: "https://thuvienphapluat.vn/van-ban/giao-thong",
    },
  ]);
});

test("reference search can expose exact-guarded consulted sources with safe prose", async () => {
  const result = await searchReferenceLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "đi xe máy tống 3",
    {
      fetch: async () =>
        providerResponse({
          annotations: [],
          consultedSources: [
            {
              type: "url",
              url: "https://thuvienphapluat.vn/van-ban/giao-thong",
              title: "Bài viết đã tra cứu",
            },
          ],
          text: "Kết luận: Đã tìm thấy nội dung tham khảo về tình huống bạn nêu.",
        }),
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.sources, [
    {
      title: "Bài viết đã tra cứu",
      url: "https://thuvienphapluat.vn/van-ban/giao-thong",
    },
  ]);
});

test("reference search rejects deceptive domains and replaces unverified legal details", async () => {
  const deceptive = await searchReferenceLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "đi xe máy tống 3",
    {
      fetch: async () =>
        providerResponse({
          url: "https://thuvienphapluat.vn.evil.test/van-ban",
          text: "Kết luận: Hãy chọn cách di chuyển an toàn hơn.",
        }),
    },
  );
  assertFailureCode(deceptive, "UNTRUSTED_CITATION");

  const legalDetail = await searchReferenceLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "đi xe máy tống 3",
    {
      fetch: async () =>
        providerResponse({
          url: "https://thuvienphapluat.vn/van-ban/giao-thong",
          text: "Kết luận: Mức phạt là 400.000 đồng.",
        }),
    },
  );
  assert.equal(legalDetail.ok, true);
  assert.equal(legalDetail.answerOrigin, "server_safe_fallback");
  assert.doesNotMatch(legalDetail.answer, /400|đồng|mức phạt/i);
  assert.match(legalDetail.answer, /không hiển thị chi tiết pháp lý/i);
  assert.match(legalDetail.warning, /không phải nguồn chính thống/i);

  const missingCitation = await searchReferenceLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "đi xe máy tống 3",
    {
      fetch: async () =>
        providerResponse({
          annotations: [],
          consultedSources: [
            { type: "url", url: "https://evil.test/not-allowed" },
          ],
          text: "Kết luận: Hãy chọn cách di chuyển an toàn hơn.",
        }),
    },
  );
  assertFailureCode(missingCitation, "MISSING_REFERENCE_CITATION");
});

test("fails closed when final citation is discovery-only or authority is deceptive", async () => {
  for (const [url, code] of [
    [
      "https://thuvienphapluat.vn/van-ban/giao-thong",
      "UNTRUSTED_CITATION",
    ],
    ["https://vbpl.vn.evil.test/document", "UNTRUSTED_CITATION"],
    ["https://evil.test/path/vbpl.vn", "UNTRUSTED_CITATION"],
  ]) {
    const result = await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret" },
      "Quy định này là gì?",
      { fetch: async () => providerResponse({ url }) },
    );
    assertFailureCode(result, code);
  }
});

test("fails closed when the final answer has no official citation", async () => {
  const result = await searchAllowedLegalSources(
    { enabled: true, apiKey: "fake-secret" },
    "Quy định này là gì?",
    { fetch: async () => providerResponse({ annotations: [] }) },
  );
  assertFailureCode(result, "MISSING_OFFICIAL_CITATION");
});

test("fails closed when direct web prose contains unreviewed legal claims", async () => {
  for (const text of [
    "Kết luận: Mức phạt tham khảo là 400.000 đồng.",
    "Giải thích: Áp dụng theo khoản 2 Điều 7.",
    "Lưu ý: Văn bản có hiệu lực từ 01/01/2025.",
    "Căn cứ pháp lý: Xem văn bản tại nguồn bên dưới.",
    "Kết luận: Mức tham khảo là năm triệu đồng.",
    "Giải thích: Điều bảy có quy định liên quan.",
    "Giải thích: Điều thứ bảy có quy định liên quan.",
  ]) {
    const result = await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret" },
      "Quy định này là gì?",
      { fetch: async () => providerResponse({ text }) },
    );
    assertFailureCode(result, "UNVERIFIED_LEGAL_CLAIM");
  }
});

test("flag-off, missing key and unknown model do not call the provider", async () => {
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    return providerResponse();
  };
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: false, apiKey: "fake-secret" },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "DISABLED" },
  );
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: true },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "MISSING_API_KEY" },
  );
  assert.deepEqual(
    await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret", model: "unknown" },
      "Câu hỏi?",
      { fetch },
    ),
    { ok: false, code: "INVALID_CONFIG" },
  );
  assert.equal(calls, 0);
});

test("provider timeout fails closed", async () => {
  const result = await searchAllowedLegalSources(
    { enabled: true, apiKey: "fake-secret", timeoutMs: 5 },
    "Câu hỏi?",
    {
      fetch: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    },
  );
  assert.deepEqual(result, { ok: false, code: "PROVIDER_TIMEOUT" });
});

test("HTTP, refusal, malformed, oversized and model mismatch all fail closed", async () => {
  const oversized = "x".repeat(1_000_001);
  const cases = [
    {
      expected: "PROVIDER_ERROR",
      response: new Response("upstream unavailable", { status: 503 }),
    },
    {
      expected: "PROVIDER_REFUSAL",
      response: providerResponse({
        overrides: {
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "refusal", refusal: "cannot answer" }],
            },
          ],
        },
      }),
    },
    {
      expected: "INVALID_OUTPUT",
      response: new Response("{not-json", { status: 200 }),
    },
    {
      expected: "PROVIDER_ERROR",
      response: new Response(oversized, { status: 200 }),
    },
    {
      expected: "INVALID_OUTPUT",
      response: providerResponse({ model: "unreviewed-model" }),
    },
  ];

  for (const item of cases) {
    const result = await searchAllowedLegalSources(
      { enabled: true, apiKey: "fake-secret" },
      "Câu hỏi?",
      { fetch: async () => item.response },
    );
    assert.deepEqual(result, { ok: false, code: item.expected });
  }
});

const allowed = {
  allowed: true,
  status: 200,
  retryAfter: 0,
};

function chatRequest(question) {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: question }],
    }),
  });
}

test("chat remains curated-first and does not search on a local match", async () => {
  let webCalls = 0;
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => "Câu trả lời đã duyệt.",
    curatedAnswer: () => null,
    webSearch: async () => {
      webCalls += 1;
      return { ok: false, code: "PROVIDER_ERROR" };
    },
  });
  const response = await chat(chatRequest("Em cần đội mũ bảo hiểm không?"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    answer: "Câu trả lời đã duyệt.",
    mode: "knowledge",
  });
  assert.equal(webCalls, 0);
});

test("legacy reviewed candidate without issuedAt stays usable but omits legal-basis card", async () => {
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => ({
      answer: "Kết luận: Hãy mở nguồn chính thức và kiểm tra trường hợp cụ thể.",
      sources: [
        {
          title: "Nguồn Chính phủ",
          url: "https://vbpl.vn/document",
        },
      ],
      citations: [
        {
          title: "Văn bản cũ đã duyệt",
          url: "https://vbpl.vn/document",
          documentNumber: "Văn bản legacy",
          effectiveFrom: "2026-01-01",
          lastVerifiedAt: "2026-07-31",
        },
      ],
      candidateId: "33333333-3333-4333-8333-333333333333",
      policyVersion: "reviewed-web-candidate-v1",
    }),
  });
  const response = await chat(
    chatRequest("Quy định giao thông đã duyệt là gì?"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.mode, "knowledge");
  assert.deepEqual(body.sections.map((section) => section.kind), ["summary"]);
});

test("chat uses guarded web search only after retrieval no-match", async () => {
  let webCalls = 0;
  let persisted = 0;
  let persistedResult;
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    persistWebCandidate: async (_requestId, result) => {
      persisted += 1;
      persistedResult = result;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async (_config, question) => {
      webCalls += 1;
      assert.equal(question, "Một quy định giao thông mới là gì?");
      return {
        ok: true,
        sourceKind: "official",
        answer:
          "Kết quả tra cứu về việc đội mũ bảo hiểm khi đi xe máy có căn cứ Chính phủ.",
        warning: "Chưa kiểm duyệt.",
        sources: [
          {
            title: "Nguồn Chính phủ",
            url: "https://vbpl.vn/document",
          },
        ],
        model: "gpt-5.4-mini",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
      };
    },
  });
  const response = await chat(
    chatRequest("Một quy định giao thông mới là gì?"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    answer:
      "Trả lời ngắn\nKết quả tra cứu về việc đội mũ bảo hiểm khi đi xe máy có căn cứ Chính phủ.",
    sections: [
      {
        kind: "summary",
        paragraphs: [
          "Kết quả tra cứu về việc đội mũ bảo hiểm khi đi xe máy có căn cứ Chính phủ.",
        ],
        bullets: [],
      },
    ],
    mode: "web_search",
    sourceKind: "official",
    warning: "Chưa kiểm duyệt.",
    sources: [
      {
        title: "Nguồn Chính phủ",
        url: "https://vbpl.vn/document",
      },
    ],
  });
  assert.equal(webCalls, 1);
  assert.equal(persisted, 1);
  assert.equal(
    persistedResult.answer,
    "Trả lời ngắn\nKết quả tra cứu về việc đội mũ bảo hiểm khi đi xe máy có căn cứ Chính phủ.",
  );
  assert.deepEqual(persistedResult.sections, [
    {
      kind: "summary",
      paragraphs: [
        "Kết quả tra cứu về việc đội mũ bảo hiểm khi đi xe máy có căn cứ Chính phủ.",
      ],
      bullets: [],
    },
  ]);
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});

test("chat falls back to a non-persisted reference for đi xe máy tống 3", async () => {
  let officialCalls = 0;
  let referenceCalls = 0;
  let reserveCalls = 0;
  let settleCalls = 0;
  const settledTokenCounts = [];
  let persisted = 0;
  const events = [];
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit: (event) => events.push(event) },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => {
      reserveCalls += 1;
      return {
        dayStart: reserveCalls,
        reservedTokens: 12_000,
      };
    },
    settleWebBudget: async (_reservation, actualTokens) => {
      settleCalls += 1;
      settledTokenCounts.push(actualTokens);
      return true;
    },
    persistWebCandidate: async () => {
      persisted += 1;
      return "33333333-3333-4333-8333-333333333333";
    },
    webSearch: async (_config, question) => {
      officialCalls += 1;
      assert.equal(question, "đi xe máy tống 3");
      return {
        ok: false,
        code: "MISSING_OFFICIAL_CITATION",
        model: "gpt-5.4-mini",
        usage: {
          inputTokens: 10,
          outputTokens: 4,
          totalTokens: 14,
        },
      };
    },
    referenceWebSearch: async (_config, question) => {
      referenceCalls += 1;
      assert.equal(question, "đi xe máy tống 3");
      return {
        ok: true,
        sourceKind: "reference",
        answer:
          "Kết luận: Bạn đang hỏi về tình huống đi xe máy tống 3.\nBạn nên làm gì: Hãy chọn cách di chuyển an toàn hơn và xác minh bằng nguồn chính thức.",
        warning:
          "Nguồn tham khảo ngoài, không phải nguồn chính thống; cần xác minh.",
        sources: [
          {
            title: "Bài viết tham khảo",
            url: "https://thuvienphapluat.vn/van-ban/giao-thong",
          },
        ],
        model: "gpt-5.4-mini",
        usage: {
          inputTokens: 2,
          outputTokens: 2,
          totalTokens: 4,
        },
      };
    },
  });

  const response = await chat(chatRequest("đi xe máy tống 3"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.mode, "web_search");
  assert.equal(body.sourceKind, "reference");
  assert.match(body.warning, /không phải nguồn chính thống/i);
  assert.match(body.warning, /xác minh/i);
  assert.deepEqual(body.sources, [
    {
      title: "Bài viết tham khảo",
      url: "https://thuvienphapluat.vn/van-ban/giao-thong",
    },
  ]);
  assert.equal(officialCalls, 1);
  assert.equal(referenceCalls, 1);
  assert.equal(reserveCalls, 2);
  assert.equal(settleCalls, 2);
  assert.deepEqual(settledTokenCounts, [14, 4]);
  assert.equal(persisted, 0);
  assert.equal(events[0].providerRequestCount, 2);
  assert.equal(events[0].providerInputTokens, 12);
  assert.equal(events[0].providerOutputTokens, 6);
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});

test("chat retries an unsafe official answer through the stricter reference policy", async () => {
  let referenceCalls = 0;
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    webSearch: async () => ({
      ok: false,
      code: "UNVERIFIED_LEGAL_CLAIM",
      model: "gpt-5.4-mini",
      usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
    }),
    referenceWebSearch: async () => {
      referenceCalls += 1;
      return { ok: false, code: "MISSING_REFERENCE_CITATION" };
    },
  });

  const response = await chat(chatRequest("đi xe máy tống 3"));
  assert.equal((await response.json()).mode, "unavailable");
  assert.equal(referenceCalls, 1);
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});

test("chat fails closed when a successful web result cannot be persisted", async () => {
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit() {} },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    persistWebCandidate: async () => null,
    webSearch: async () => ({
      ok: true,
      sourceKind: "official",
      answer: "Có nguồn giao thông nhưng D1 đang lỗi.",
      warning: "Chưa kiểm duyệt.",
      sources: [{ title: "Nguồn", url: "https://vbpl.vn/document" }],
      model: "gpt-5.4-mini",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  });
  const response = await chat(chatRequest("Quy định giao thông mới?"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, "unavailable");
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});

test("chat records rejected direct legal claims as invalid provider output", async () => {
  const events = [];
  Object.assign(globalThis.__webSearchWorkerEnv, {
    AI_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-5.4-mini",
  });
  const chat = createChatHandler({
    limiter: () => ({ consumeChat: async () => allowed }),
    telemetry: { emit: (event) => events.push(event) },
    managedAnswer: async () => null,
    curatedAnswer: () => null,
    reviewedWebAnswer: async () => null,
    reserveWebBudget: async () => ({
      dayStart: 1,
      reservedTokens: 12_000,
    }),
    settleWebBudget: async () => true,
    webSearch: async () => ({
      ok: false,
      code: "UNVERIFIED_LEGAL_CLAIM",
    }),
    referenceWebSearch: async () => ({
      ok: false,
      code: "UNVERIFIED_LEGAL_CLAIM",
    }),
  });
  const response = await chat(
    chatRequest("Không đội mũ bảo hiểm có mức xử lý gì?"),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, "unavailable");
  assert.equal(events[0].providerOutcome, "invalid_output");
  for (const key of Object.keys(globalThis.__webSearchWorkerEnv)) {
    delete globalThis.__webSearchWorkerEnv[key];
  }
});
