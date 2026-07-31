import { readFile } from "node:fs/promises";
import { register } from "tsx/esm/api";

const unregisterTsx = register();
const {
  readAiShadowConfig,
  runAiShadowBatch,
} = await import("../lib/ai-shadow.ts");

const fixture = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/ai-shadow/cases.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const result = await runAiShadowBatch(
  readAiShadowConfig(process.env),
  fixture,
);

console.log(JSON.stringify(result));
if (result.outcome !== "COMPLETED" || result.failed > 0) {
  process.exitCode = 1;
}
await unregisterTsx();
