"use client";

// Game nhập vai (US-036). Component chỉ đi trên đồ thị kịch bản: mọi nhánh và
// mọi kết cục đều nằm trong dữ liệu truyền vào, không có nội dung nào hardcode.
import { useState } from "react";
import {
  findRoleplayNode,
  roleplayOutcomeCopy,
  type RoleplayScenario,
} from "@/lib/roleplay";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";

type RoleplayPanelProps = Readonly<{
  scenarios: readonly RoleplayScenario[];
  onOutcome(scenarioId: number, nodeKey: string): Promise<number | null>;
  disabled?: boolean;
}>;

export function RoleplayPanel({
  scenarios,
  onOutcome,
  disabled,
}: RoleplayPanelProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [nodeKey, setNodeKey] = useState("");
  const [path, setPath] = useState<readonly string[]>([]);
  const [awarded, setAwarded] = useState<number | null>(null);

  const scenario = scenarios.find((item) => item.id === activeId) ?? null;
  const node = scenario ? findRoleplayNode(scenario, nodeKey) : null;

  function start(next: RoleplayScenario) {
    setActiveId(next.id);
    setNodeKey(next.startKey);
    setPath([]);
    setAwarded(null);
  }

  async function go(nextKey: string) {
    if (!scenario) return;
    const target = findRoleplayNode(scenario, nextKey);
    if (!target) return;
    setPath((current) => [...current, nodeKey]);
    setNodeKey(nextKey);
    if (target.kind !== "outcome" || disabled) return;
    // Điểm chỉ được cộng khi server xác nhận đây đúng là nút kết cục.
    setAwarded(await onOutcome(scenario.id, target.key));
  }

  if (!scenario || !node) {
    return (
      <div className="roleplay-list">
        {scenarios.map((item) => (
          <article key={item.id} className="roleplay-card">
            <p className="roleplay-topic">{item.topic}</p>
            <h3>{item.title}</h3>
            <p>{item.intro}</p>
            <button type="button" onClick={() => start(item)}>
              Vào vai <ArrowRightIcon />
            </button>
          </article>
        ))}
      </div>
    );
  }

  const outcome = node.kind === "outcome" && node.outcomeKind
    ? roleplayOutcomeCopy(node.outcomeKind)
    : null;

  return (
    <article className="roleplay-stage" data-outcome={node.outcomeKind ?? ""}>
      <header className="roleplay-stage-head">
        <div>
          <p className="roleplay-topic">{scenario.topic}</p>
          <h3>{scenario.title}</h3>
        </div>
        <button
          type="button"
          className="roleplay-reset"
          onClick={() => setActiveId(null)}
        >
          Chọn kịch bản khác
        </button>
      </header>

      <p className="roleplay-step-count">
        Bước {path.length + 1}
        {node.kind === "outcome" ? " · kết cục" : ""}
      </p>
      <p className="roleplay-text">{node.text}</p>

      {node.kind === "step" ? (
        <div className="roleplay-choices">
          {node.choices.map((choice) => (
            <button
              key={choice.next}
              type="button"
              onClick={() => void go(choice.next)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="roleplay-outcome">
          {outcome && (
            <p className="roleplay-outcome-label">
              <strong>{outcome.label}</strong>
              <span>{outcome.detail}</span>
            </p>
          )}
          <p>{node.consequence}</p>
          <p className="quiz-basis">
            <span>Căn cứ</span>
            <strong>{node.legalBasis}</strong>
            {node.sourceUrl && (
              <a href={node.sourceUrl} target="_blank" rel="noreferrer noopener">
                Xem văn bản gốc <ArrowUpRightIcon />
              </a>
            )}
          </p>
          {awarded !== null && awarded > 0 && (
            <p className="roleplay-award">+{awarded} điểm cho lượt này.</p>
          )}
          <div className="roleplay-choices">
            <button type="button" onClick={() => start(scenario)}>
              Chơi lại kịch bản này
            </button>
            <button
              type="button"
              className="roleplay-reset"
              onClick={() => setActiveId(null)}
            >
              Kịch bản khác
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
