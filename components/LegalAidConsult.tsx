"use client";

// Mục trợ giúp pháp lý (US-039). Ô hỏi dùng lại đúng bộ phân tích và khối
// hiển thị của chat trang chủ (Task 3) nên khuyến cáo, nhãn nguồn và thứ tự
// DOM không thể lệch nhau. Phần riêng của trang này chỉ là chuỗi cơ quan.

import { useState, type FormEvent } from "react";

import { AiDisclaimer } from "@/components/AiDisclaimer";
import { ChatAnswerBody } from "@/components/ChatAnswerBody";
import { ReferralChain } from "@/components/ReferralChain";
import type { ReferralStep } from "@/lib/authority-referral";
import {
  chatAnswerNetworkErrorText,
  parseChatAnswerPayload,
  type ChatAnswerView,
} from "@/lib/chat-answer-view";

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

  async function loadChain(topic: string | null) {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    const response = await fetch(`/api/co-quan${query}`);
    if (!response.ok) return { chain: [], degraded: true } as const;
    const payload = (await response.json()) as {
      chain?: readonly ReferralStep[];
      degraded?: boolean;
    };
    return {
      chain: Array.isArray(payload.chain) ? payload.chain : [],
      degraded: payload.degraded === true,
    } as const;
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
      const referral = await loadChain(null).catch(() => ({
        chain: [] as readonly ReferralStep[],
        degraded: true,
      }));
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
