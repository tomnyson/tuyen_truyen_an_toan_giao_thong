import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }
    if (
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  findRoleplayNode,
  isRoleplayOutcome,
  parseRoleplayScenarios,
  reachableNodeKeys,
  roleplayOutcomeCopy,
  roleplayStartNode,
  validateRoleplayScenario,
} = await import("../lib/roleplay.ts");
const { findRoleplayScenario, roleplayScenarios } = await import(
  "../lib/roleplay-content.ts"
);

function scenarioOf(nodes, startKey = "bat-dau") {
  return {
    id: 1,
    topic: "Giao thông",
    title: "Kich ban thu",
    intro: "Gioi thieu",
    startKey,
    nodes,
  };
}

const step = (key, choices) => ({
  key,
  kind: "step",
  text: "mo ta",
  choices,
  consequence: "",
  legalBasis: "",
  sourceUrl: "",
  outcomeKind: null,
  points: 1,
});

const outcome = (key) => ({
  key,
  kind: "outcome",
  text: "ket cuc",
  choices: [],
  consequence: "hau qua",
  legalBasis: "can cu da duyet",
  sourceUrl: "",
  outcomeKind: "safe",
  points: 10,
});

test("moi kich ban seed hop le va co nhieu nhanh", () => {
  assert.ok(roleplayScenarios.length >= 3);
  for (const scenario of roleplayScenarios) {
    assert.deepEqual(
      validateRoleplayScenario(scenario),
      [],
      `kich ban ${scenario.id}`,
    );
    const outcomes = scenario.nodes.filter(isRoleplayOutcome);
    assert.ok(outcomes.length >= 2, `kich ban ${scenario.id} thieu ket cuc`);
    const kinds = new Set(outcomes.map((node) => node.outcomeKind));
    assert.ok(kinds.size >= 2, `kich ban ${scenario.id} chi co mot loai ket cuc`);
    const start = roleplayStartNode(scenario);
    assert.equal(start?.kind, "step");
    assert.ok(start.choices.length >= 2);
  }
});

test("moi ket cuc phan tich hau qua kem can cu", () => {
  for (const scenario of roleplayScenarios) {
    for (const node of scenario.nodes.filter(isRoleplayOutcome)) {
      assert.ok(node.consequence.length > 10, `${scenario.id}:${node.key}`);
      assert.ok(node.legalBasis.length > 0, `${scenario.id}:${node.key}`);
      assert.equal(node.choices.length, 0);
      if (node.sourceUrl) assert.match(node.sourceUrl, /^https:\/\//);
    }
  }
});

test("moi nut deu toi duoc tu nut bat dau", () => {
  for (const scenario of roleplayScenarios) {
    const reachable = reachableNodeKeys(scenario);
    for (const node of scenario.nodes) {
      assert.ok(reachable.has(node.key), `${scenario.id}:${node.key}`);
    }
  }
});

test("validateRoleplayScenario bat do thi hong", () => {
  const dangling = scenarioOf([
    step("bat-dau", [
      { label: "a", next: "khong-ton-tai" },
      { label: "b", next: "ket-cuc" },
    ]),
    outcome("ket-cuc"),
  ]);
  assert.ok(validateRoleplayScenario(dangling).length > 0);

  const noStart = scenarioOf(
    [step("khac", [{ label: "a", next: "ket-cuc" }, { label: "b", next: "ket-cuc" }]), outcome("ket-cuc")],
    "bat-dau",
  );
  assert.ok(validateRoleplayScenario(noStart).length > 0);

  const orphan = scenarioOf([
    step("bat-dau", [
      { label: "a", next: "ket-cuc" },
      { label: "b", next: "ket-cuc" },
    ]),
    outcome("ket-cuc"),
    outcome("mo-coi"),
  ]);
  assert.ok(validateRoleplayScenario(orphan).length > 0);

  const oneChoice = scenarioOf([
    step("bat-dau", [{ label: "a", next: "ket-cuc" }]),
    outcome("ket-cuc"),
  ]);
  assert.ok(validateRoleplayScenario(oneChoice).length > 0);

  const noOutcome = scenarioOf([
    step("bat-dau", [
      { label: "a", next: "hai" },
      { label: "b", next: "hai" },
    ]),
    step("hai", [
      { label: "a", next: "bat-dau" },
      { label: "b", next: "bat-dau" },
    ]),
  ]);
  assert.ok(validateRoleplayScenario(noOutcome).length > 0);

  const outcomeWithoutBasis = scenarioOf([
    step("bat-dau", [
      { label: "a", next: "ket-cuc" },
      { label: "b", next: "ket-cuc" },
    ]),
    { ...outcome("ket-cuc"), legalBasis: "" },
  ]);
  assert.ok(validateRoleplayScenario(outcomeWithoutBasis).length > 0);
});

test("findRoleplayNode va findRoleplayScenario tra ve dung du lieu", () => {
  const scenario = roleplayScenarios[0];
  assert.equal(findRoleplayScenario(scenario.id)?.title, scenario.title);
  assert.equal(findRoleplayScenario(987_654), null);
  assert.equal(findRoleplayNode(scenario, scenario.startKey)?.key, scenario.startKey);
  assert.equal(findRoleplayNode(scenario, "khong-ton-tai"), null);
});

test("roleplayOutcomeCopy co ban dich cho ca ba loai ket cuc", () => {
  for (const kind of ["safe", "risky", "harmful"]) {
    const copy = roleplayOutcomeCopy(kind);
    assert.ok(copy.label.length > 0);
    assert.ok(copy.detail.length > 0);
  }
});

test("parseRoleplayScenarios loai bo payload hong", () => {
  assert.equal(parseRoleplayScenarios("khong phai mang"), null);
  const parsed = parseRoleplayScenarios(roleplayScenarios);
  assert.equal(parsed?.length, roleplayScenarios.length);
  assert.equal(parseRoleplayScenarios([{ id: 1, nodes: [] }]), null);
});
