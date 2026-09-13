"use client";

// Mục trợ giúp pháp lý (US-039). Ô hỏi dùng lại đúng bộ phân tích và khối
// hiển thị của chat trang chủ (Task 3) nên khuyến cáo, nhãn nguồn và thứ tự
// DOM không thể lệch nhau. Phần riêng của trang này chỉ là chuỗi cơ quan.

import { useState, type FormEvent } from "react";

import { AiDisclaimer } from "@/components/AiDisclaimer";
import { ChatAnswerBody } from "@/components/ChatAnswerBody";
import { ReferralChain } from "@/components/ReferralChain";
import {
  buildReferralChain,
  fallbackReferralAuthorities,
  type ReferralStep,
} from "@/lib/authority-referral";
import {
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
  type ChatAnswerView,
} from "@/lib/chat-answer-view";
import type { ContentTopic } from "@/lib/topics";

type ConsultState = Readonly<{
  answer: ChatAnswerView | null;
  chain: readonly ReferralStep[];
  degraded: boolean;
  error: string;
}>;

const emptyState: ConsultState = {
  answer: null,
  chain: [],
  degraded: false,
  error: "",
};

const SUGGESTED_QUESTIONS = [
  "Bị đe dọa, xúc phạm hoặc bôi nhọ trên mạng xã hội",
  "Bị bạo lực, bắt nạt hoặc cô lập trong trường học",
  "Bị quay lén và phát tán hình ảnh riêng tư lên mạng",
  "Bị dụ dỗ vay tiền qua app với lãi suất cao",
];

export function LegalAidConsult() {
  const [question, setQuestion] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [state, setState] = useState<ConsultState>(emptyState);

  // Không bao giờ ném lỗi, không bao giờ trả chuỗi rỗng (Finding 3+4 của bản
  // rà soát cuối GĐ1): mọi nhánh hỏng — response lỗi, fetch ném, JSON hỏng,
  // `payload.chain` rỗng hoặc không phải mảng — đều rơi về ba đầu mối công
  // khai đã xác minh, giống cách HelpHotlines fail-safe.
  async function loadChain(topic: ContentTopic | null) {
    const fallback = {
      chain: buildReferralChain(fallbackReferralAuthorities, topic),
      degraded: true,
    } as const;
    try {
      const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
      const response = await fetch(`/api/co-quan${query}`);
      if (!response.ok) return fallback;
      const payload = (await response.json()) as {
        chain?: readonly ReferralStep[];
        degraded?: boolean;
      };
      if (!Array.isArray(payload.chain) || payload.chain.length === 0) {
        return fallback;
      }
      return {
        chain: payload.chain,
        degraded: payload.degraded === true,
      } as const;
    } catch {
      return fallback;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const asked = question.trim();
    if (asked === "" || isLoading) return;
    setLoading(true);
    setState(emptyState);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: asked }] }),
      });
      const answer = parseChatAnswerPayload(await response.json());
      const referral = await loadChain(answer.topic);
      setState({
        answer,
        chain: referral.chain,
        degraded: referral.degraded,
        error: "",
      });
    } catch {
      const referral = await loadChain(null);
      setState({
        answer: null,
        chain: referral.chain,
        degraded: referral.degraded,
        error: chatAnswerNetworkErrorText,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleReset = () => {
    setState(emptyState);
    setQuestion("");
  };

  return (
    <div className="legal-aid">
      <form className="legal-aid-form" onSubmit={submit}>
        <div className="flex items-center justify-between w-full">
          <label htmlFor="legal-aid-question" className="text-sm font-bold text-[var(--ink)]">
            Bạn hoặc bạn bè đang gặp chuyện gì? Kể ngắn gọn tình huống:
          </label>
          <span className="text-xs text-[var(--ink-mute)]">
            {question.length}/600 ký tự
          </span>
        </div>

        {/* Gợi ý tình huống nhanh */}
        <div className="w-full flex flex-wrap items-center gap-1.5 pt-1 pb-1">
          <span className="text-xs text-[var(--ink-soft)] font-semibold mr-1">
            Gợi ý nhanh:
          </span>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(q)}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--cream-warm)] hover:bg-[var(--gold-soft)] text-[var(--ink-soft)] hover:text-[var(--brick-deep)] border border-[var(--line-card)] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="relative w-full">
          <textarea
            id="legal-aid-question"
            value={question}
            rows={3}
            maxLength={600}
            placeholder="Ví dụ: Em bị bạn cùng lớp đe dọa qua tin nhắn và yêu cầu nộp tiền thì phải báo cho ai?"
            onChange={(event) => setQuestion(event.target.value)}
            className="w-full"
          />
          {question.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={() => setQuestion("")}
              className="absolute right-3 top-3 text-xs text-[var(--ink-mute)] hover:text-[var(--brick-deep)] cursor-pointer"
              aria-label="Xóa nội dung"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" className="btn-gold" disabled={isLoading || question.trim() === ""}>
            {isLoading ? "Đang phân tích thẩm quyền…" : "Tìm nơi tiếp nhận & Hỗ trợ"}
          </button>
          {state.answer && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--brick-deep)] hover:underline cursor-pointer"
            >
              Đặt lại câu hỏi
            </button>
          )}
        </div>
      </form>

      <AiDisclaimer variant="compact" />

      {state.error ? (
        <p className="legal-aid-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.answer ? (
        <div className="legal-aid-answer-wrapper p-5 rounded-2xl bg-[var(--cream-warm)] border border-[var(--line-card)]">
          <ChatAnswerBody answer={state.answer} />
        </div>
      ) : null}

      <ReferralChain steps={state.chain} degraded={state.degraded} />
    </div>
  );
}
