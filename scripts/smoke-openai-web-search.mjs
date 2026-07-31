import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
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
  readOpenAiWebSearchConfig,
  searchAllowedLegalSources,
} = await import("../lib/openai-web-search.ts");

const technicalQuestion =
  "Theo nguồn chính thức của Chính phủ Việt Nam, người điều khiển xe mô tô có phải đội mũ bảo hiểm không?";

try {
  const result = await searchAllowedLegalSources(
    readOpenAiWebSearchConfig(process.env),
    technicalQuestion,
  );
  if (!result.ok) {
    console.log(JSON.stringify({ ok: false, code: result.code }));
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify({
        ok: true,
        model: result.model,
        sourceHosts: result.sources.map(
          (source) => new URL(source.url).hostname,
        ),
        sourceCount: result.sources.length,
        usage: result.usage,
      }),
    );
  }
} catch {
  console.log(JSON.stringify({ ok: false, code: "UNEXPECTED" }));
  process.exitCode = 1;
}
