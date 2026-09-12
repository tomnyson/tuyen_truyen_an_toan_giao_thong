// Thân một câu trả lời của trợ lý (US-038, US-039). Thứ tự DOM là hợp đồng:
// nhãn nguồn → khuyến cáo độ chính xác → cảnh báo của server → nội dung →
// nguồn dẫn. Khuyến cáo phải đứng trước nội dung để người đọc thấy nó trước
// khi đọc kết luận. Hộp chat trang chủ và trang trợ giúp pháp lý dùng cùng
// component này nên không thể lệch thứ tự.
import { AiDisclaimer } from "./AiDisclaimer";
import { SparkleIcon } from "./icons";
import { answerOriginCopyOf } from "@/lib/answer-origin";
import { chatAnswerSectionTitle } from "@/lib/chat-answer-presentation";
import { publicSourceUiCopy } from "@/lib/official-source-url";
import type { ChatAnswerView } from "@/lib/chat-answer-view";

export function ChatAnswerBody({
  answer,
}: Readonly<{ answer: ChatAnswerView }>) {
  const sourceCopy = publicSourceUiCopy(
    answer.sourceKind,
    Boolean(answer.warning),
  );
  const originCopy = answer.answerOrigin
    ? answerOriginCopyOf(answer.answerOrigin)
    : null;
  return (
    <>
      {originCopy && (
        <p
          className="chat-origin"
          data-origin={answer.answerOrigin}
          title={originCopy.detail}
        >
          <SparkleIcon />
          <span>Nguồn trả lời: {originCopy.label}</span>
        </p>
      )}
      <AiDisclaimer origin={answer.answerOrigin} variant="compact" />
      {answer.warning && (
        <p className="chat-warning" role="note">
          <strong>{sourceCopy.warningTitle}</strong>
          <span>{answer.warning}</span>
        </p>
      )}
      {answer.sections ? (
        <div className="chat-answer-sections">
          {answer.sections.map((section) => (
            <section
              key={section.kind}
              className={`chat-answer-section chat-answer-section-${section.kind.replaceAll("_", "-")}`}
              data-kind={section.kind}
            >
              <h3>{chatAnswerSectionTitle(section.kind)}</h3>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${section.kind}-p-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets.length > 0 && (
                <ul>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${section.kind}-b-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p>{answer.answer}</p>
      )}
      {answer.sources.length > 0 && (
        <div className="chat-source-group">
          <h3>{sourceCopy.groupTitle}</h3>
          <ul className="chat-sources">
            {answer.sources.map((source) => (
              <li key={source.url}>
                <span>{source.title || sourceCopy.fallbackTitle}</span>
                <small>{new URL(source.url).hostname}</small>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${sourceCopy.openAriaPrefix}: ${source.title || sourceCopy.fallbackTitle}`}
                >
                  {sourceCopy.openAction}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
