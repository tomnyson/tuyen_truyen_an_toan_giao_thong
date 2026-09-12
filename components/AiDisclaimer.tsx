// Khuyến cáo độ chính xác cho mọi nội dung do AI tạo (US-038, DEC-020).
// Component này KHÔNG tự viết câu chữ: toàn bộ nội dung đến từ
// `lib/ai-disclosure.ts` để một lần sửa câu là mọi bề mặt đổi theo.
import { disclosureFor } from "@/lib/ai-disclosure";
import type { AnswerOrigin } from "@/lib/answer-origin";
import { ArrowUpRightIcon, ShieldIcon } from "./icons";

type AiDisclaimerProps = Readonly<{
  // Nguồn của câu trả lời; không truyền nghĩa là chưa xác định và dùng mức
  // thận trọng mặc định.
  origin?: AnswerOrigin | null;
  // "compact" dùng ở chân hộp chat, nơi chỉ còn chỗ cho một dòng.
  variant?: "full" | "compact";
  // Link văn bản gốc, nếu bề mặt đó có. Rỗng thì không render link.
  sourceUrl?: string;
}>;

export function AiDisclaimer({
  origin = null,
  variant = "full",
  sourceUrl = "",
}: AiDisclaimerProps) {
  const disclosure = disclosureFor(origin);
  const trimmedUrl = sourceUrl.trim();
  return (
    <aside
      className="ai-disclaimer"
      role="note"
      data-level={disclosure.level}
      data-variant={variant}
    >
      <ShieldIcon aria-hidden="true" />
      <div>
        {variant === "full" && <strong>{disclosure.title}</strong>}
        <p>{disclosure.body}</p>
        {trimmedUrl.length > 0 && (
          <a href={trimmedUrl} target="_blank" rel="noopener noreferrer">
            {disclosure.actionLabel} <ArrowUpRightIcon />
          </a>
        )}
      </div>
    </aside>
  );
}
