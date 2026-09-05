"use client";

// Khu vực game hóa của trang công khai (US-035, US-036).
//
// Toàn bộ nội dung (câu hỏi, kịch bản, huy hiệu) tải từ `/api/game`; component
// không giữ bản sao nội dung nào. Token nhận dạng trình duyệt dùng chung với
// bộ đếm tương tác: server chỉ nhận bản hash, không có định danh cá nhân.
import { useCallback, useEffect, useState } from "react";
import {
  gameProgressOf,
  parseBadgeDefinitions,
  parseGameProgress,
  parsePublicQuizQuestions,
  parseQuizGrade,
  pointsToNextBadge,
  type BadgeDefinition,
  type GameProgress,
  type PublicQuizQuestion,
  type QuizGrade,
} from "@/lib/gamification";
import { parseRoleplayScenarios, type RoleplayScenario } from "@/lib/roleplay";
import { ensureClientId } from "./EngagementProvider";
import { QuizPanel } from "./QuizPanel";
import { RoleplayPanel } from "./RoleplayPanel";

type Mode = "quiz" | "roleplay";

const emptyProgress = gameProgressOf(0);

async function postGame(body: Record<string, unknown>): Promise<unknown> {
  try {
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, clientId: ensureClientId() }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function GameZone() {
  const [mode, setMode] = useState<Mode>("quiz");
  const [questions, setQuestions] = useState<readonly PublicQuizQuestion[]>([]);
  const [scenarios, setScenarios] = useState<readonly RoleplayScenario[]>([]);
  const [badges, setBadges] = useState<readonly BadgeDefinition[]>([]);
  const [progress, setProgress] = useState<GameProgress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/game", { cache: "no-store" });
        if (!response.ok) throw new Error("game content unavailable");
        const body = (await response.json()) as Record<string, unknown>;
        if (!active) return;
        setQuestions(parsePublicQuizQuestions(body.questions) ?? []);
        setScenarios(parseRoleplayScenarios(body.scenarios) ?? []);
        setBadges(parseBadgeDefinitions(body.badges) ?? []);
      } catch {
        if (active) setOffline(true);
      } finally {
        if (active) setReady(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProgress() {
      const body = (await postGame({ kind: "progress" })) as {
        progress?: unknown;
      } | null;
      const parsed = body ? parseGameProgress(body.progress) : null;
      if (active && parsed) setProgress(parsed);
    }
    void loadProgress();
    return () => {
      active = false;
    };
  }, []);

  const answer = useCallback(
    async (questionId: number, choiceIndex: number): Promise<QuizGrade | null> => {
      const body = (await postGame({
        kind: "quiz-answer",
        questionId,
        choiceIndex,
      })) as { grade?: unknown } | null;
      const grade = body ? parseQuizGrade(body.grade) : null;
      if (grade) setProgress(grade.progress);
      return grade;
    },
    [],
  );

  const outcome = useCallback(
    async (scenarioId: number, nodeKey: string): Promise<number | null> => {
      const body = (await postGame({
        kind: "roleplay-outcome",
        scenarioId,
        nodeKey,
      })) as { outcome?: Record<string, unknown> } | null;
      if (!body?.outcome) return null;
      const parsed = parseGameProgress(body.outcome.progress);
      if (parsed) setProgress(parsed);
      const awarded = Number(body.outcome.awardedPoints);
      return Number.isSafeInteger(awarded) ? awarded : null;
    },
    [],
  );

  const remaining = pointsToNextBadge(progress);
  const ladder = badges.length > 0 ? badges : progress.badges;

  return (
    <section className="game-section" id="ren-luyen">
      <div className="section-head">
        <div>
          <p className="eyebrow"><span>●</span> RÈN LUYỆN</p>
          <h2>Thử thách và nhập vai</h2>
        </div>
        <p className="game-points" aria-live="polite">
          <span>Điểm tích lũy</span>
          <strong>{progress.points}</strong>
        </p>
      </div>

      <p className="game-intro">
        Trả lời đúng để tích điểm, đi hết một kịch bản nhập vai để xem hậu quả
        của từng lựa chọn. Điểm gắn với trình duyệt của bạn, không cần đăng ký
        tài khoản.
      </p>

      <div className="game-badges">
        {ladder.map((badge) => {
          const earned = progress.points >= badge.thresholdPoints;
          return (
            <span
              key={badge.code}
              className={earned ? "game-badge earned" : "game-badge"}
              title={badge.description}
            >
              <span aria-hidden="true">{badge.icon}</span>
              {badge.name}
              <small>{badge.thresholdPoints} điểm</small>
            </span>
          );
        })}
      </div>
      {progress.nextBadge && (
        <p className="game-next-badge">
          Còn {remaining} điểm nữa để đạt huy hiệu{" "}
          <strong>{progress.nextBadge.name}</strong>.
        </p>
      )}

      <div className="game-modes" role="tablist" aria-label="Chế độ rèn luyện">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "quiz"}
          className={mode === "quiz" ? "game-mode active" : "game-mode"}
          onClick={() => setMode("quiz")}
        >
          Câu hỏi nhanh
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "roleplay"}
          className={mode === "roleplay" ? "game-mode active" : "game-mode"}
          onClick={() => setMode("roleplay")}
        >
          Nhập vai tình huống
        </button>
      </div>

      {!ready && <p className="game-pending">Đang tải nội dung rèn luyện…</p>}
      {ready && offline && (
        <p className="game-error" role="alert">
          Chưa tải được nội dung rèn luyện. Bạn thử tải lại trang sau ít phút nhé.
        </p>
      )}
      {ready && !offline && mode === "quiz" && (
        <QuizPanel questions={questions} onAnswer={answer} />
      )}
      {ready && !offline && mode === "roleplay" && (
        <RoleplayPanel scenarios={scenarios} onOutcome={outcome} />
      )}
    </section>
  );
}
