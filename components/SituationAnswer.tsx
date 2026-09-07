// Khối trả lời ba phần cho một tình huống (US-030). Thứ tự hiển thị do
// `buildSituationAnswer` quyết định: xử lý nhanh → nguy cơ/mức phạt → trích
// dẫn luật, kể cả khi dữ liệu đầu vào thiếu phần nào.
import {
  buildSituationAnswer,
  type SituationAnswerInput,
  type SituationAnswerPart,
} from "@/lib/situation-answer";
import { ArrowUpRightIcon, BoltIcon, ScalesIcon, WarningIcon } from "./icons";

const partIcons: Record<SituationAnswerPart, typeof BoltIcon> = {
  handling: BoltIcon,
  risk: WarningIcon,
  citation: ScalesIcon,
};

export function SituationAnswer(props: SituationAnswerInput) {
  const blocks = buildSituationAnswer(props);
  return (
    <ol className="situation-answer">
      {blocks.map((block) => {
        const PartIcon = partIcons[block.part];
        return (
          <li key={block.part} className="situation-part" data-part={block.part}>
            <span className="situation-step">
              <PartIcon />
            </span>
            <div>
              <h4>{block.title}</h4>
              <p>{block.body}</p>
              {block.url && (
                <a href={block.url} target="_blank" rel="noopener noreferrer">
                  Mở nguồn chính thức <ArrowUpRightIcon />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
