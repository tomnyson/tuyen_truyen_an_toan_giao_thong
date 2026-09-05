"use client";

// Quiz theo lĩnh vực (US-035). Component chỉ hiển thị: đáp án đúng và giải
// thích do server trả về sau khi người chơi đã chọn, nên không thể xem trước.
import { useMemo, useState } from "react";
import type { PublicQuizQuestion, QuizGrade } from "@/lib/gamification";
import type { ContentTopic } from "@/lib/topics";

type QuizPanelProps = Readonly<{
  questions: readonly PublicQuizQuestion[];
  onAnswer(questionId: number, choiceIndex: number): Promise<QuizGrade | null>;
  disabled?: boolean;
}>;

type Answered = Readonly<{ choiceIndex: number; grade: QuizGrade }>;

export function QuizPanel({ questions, onAnswer, disabled }: QuizPanelProps) {
  const topics = useMemo(
    () =>
      Array.from(
        new Set(questions.map((question) => question.topic)),
      ) as ContentTopic[],
    [questions],
  );
  const [topic, setTopic] = useState<ContentTopic | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answered>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const activeTopic = topic ?? topics[0] ?? null;
  const visible = questions.filter(
    (question) => question.topic === activeTopic,
  );
  const answeredCount = visible.filter(
    (question) => answers[question.id],
  ).length;

  async function choose(question: PublicQuizQuestion, choiceIndex: number) {
    if (answers[question.id] || pendingId !== null || disabled) return;
    setPendingId(question.id);
    setError("");
    const grade = await onAnswer(question.id, choiceIndex);
    setPendingId(null);
    if (!grade) {
      setError("Chưa chấm được câu này. Bạn thử lại sau ít phút nhé.");
      return;
    }
    setAnswers((current) => ({
      ...current,
      [question.id]: { choiceIndex, grade },
    }));
  }

  if (visible.length === 0) {
    return <p className="game-empty">Chưa có câu hỏi cho lĩnh vực này.</p>;
  }

  return (
    <div className="quiz-panel">
      <div className="game-topics" role="tablist" aria-label="Lĩnh vực câu hỏi">
        {topics.map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={name === activeTopic}
            className={name === activeTopic ? "game-topic active" : "game-topic"}
            onClick={() => setTopic(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="game-progress-line">
        Đã trả lời {answeredCount}/{visible.length} câu ở lĩnh vực này.
      </p>
      {error && (
        <p className="game-error" role="alert">
          {error}
        </p>
      )}

      <ol className="quiz-list">
        {visible.map((question) => {
          const answered = answers[question.id];
          return (
            <li key={question.id} className="quiz-item">
              <p className="quiz-prompt">{question.prompt}</p>
              <div className="quiz-options">
                {question.options.map((option, index) => {
                  const state = !answered
                    ? ""
                    : index === answered.grade.correctIndex
                      ? "correct"
                      : index === answered.choiceIndex
                        ? "wrong"
                        : "";
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`quiz-option ${state}`.trim()}
                      disabled={Boolean(answered) || disabled}
                      aria-pressed={answered?.choiceIndex === index}
                      onClick={() => void choose(question, index)}
                    >
                      <span className="quiz-option-mark" aria-hidden="true">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
              {pendingId === question.id && (
                <p className="game-pending">Đang chấm…</p>
              )}
              {answered && (
                <div
                  className={`quiz-feedback ${answered.grade.correct ? "correct" : "wrong"}`}
                >
                  <p className="quiz-verdict">
                    {answered.grade.correct ? "Chính xác" : "Chưa đúng"}
                    {answered.grade.awardedPoints > 0 &&
                      ` · +${answered.grade.awardedPoints} điểm`}
                  </p>
                  <p>{answered.grade.explanation}</p>
                  <p className="quiz-basis">
                    <span>Căn cứ</span>
                    <strong>{answered.grade.legalBasis}</strong>
                    {answered.grade.sourceUrl && (
                      <a
                        href={answered.grade.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Xem văn bản gốc ↗
                      </a>
                    )}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
