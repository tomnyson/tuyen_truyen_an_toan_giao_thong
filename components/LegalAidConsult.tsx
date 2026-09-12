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

  return (
    <div className="legal-aid">
      <form className="legal-aid-form" onSubmit={submit}>
        <label htmlFor="legal-aid-question">
          Bạn đang gặp chuyện gì? Kể ngắn gọn cũng được.
        </label>
        <textarea
          id="legal-aid-question"
          value={question}
          rows={3}
          maxLength={600}
          placeholder="Ví dụ: Em bị bạn cùng lớp đe dọa qua tin nhắn thì báo cho ai?"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="btn-gold" disabled={isLoading}>
          {isLoading ? "Đang tìm…" : "Tìm nơi tiếp nhận"}
        </button>
      </form>

      <AiDisclaimer variant="compact" />

      {state.error ? (
        <p className="legal-aid-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.answer ? <ChatAnswerBody answer={state.answer} /> : null}

      <ReferralChain steps={state.chain} degraded={state.degraded} />
    </div>
  );
}
