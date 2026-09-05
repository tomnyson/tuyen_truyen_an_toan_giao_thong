// Tra cứu theo tình huống đời thực (US-030). Người dùng gõ nguyên câu hỏi
// ("bị ghép ảnh chế giễu đăng Facebook thì làm gì?") hoặc gõ tắt ("ATGT"),
// nên so khớp chuỗi con nguyên câu như trước là chắc chắn không ra kết quả.
import { normalizeVietnamese } from "./legal-content";
import { contentTopics } from "./topics";

// Từ đệm trong câu hỏi tiếng Việt: giữ lại chỉ làm nhiễu điểm khớp.
const stopWords = new Set([
  "thi",
  "la",
  "co",
  "khong",
  "duoc",
  "bi",
  "lam",
  "gi",
  "the",
  "nao",
  "cho",
  "voi",
  "khi",
  "cua",
  "nguoi",
  "em",
  "minh",
  "toi",
  "ban",
  "va",
  "hay",
  "nhu",
  "sao",
  "phai",
  "nen",
  "can",
  "ra",
  "vao",
  "den",
  "tren",
  "duoi",
  "mot",
  "nhung",
  "day",
  "do",
  "ay",
  "ma",
  "hoac",
  "neu",
]);

// Điểm cộng khi cả câu tra cứu xuất hiện nguyên vẹn trong nội dung — ưu tiên
// kết quả khớp chính xác trước các kết quả chỉ khớp vài từ khóa.
const exactPhraseScore = 5;
const minimumCompactLength = 4;
const maximumQueryLength = 300;

function compact(value: string): string {
  return normalizeVietnamese(value).replace(/[^a-z0-9]+/g, "");
}

function syllables(value: string): string[] {
  return normalizeVietnamese(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Bảng đồng nghĩa: viết tắt và từ khóa của từng lĩnh vực đều trỏ về tên lĩnh
// vực, nhờ đó gõ "BLHĐ" hay "bắt nạt" đều chạm tới "Bạo lực học đường".
function buildAliases(): ReadonlyMap<string, readonly string[]> {
  const aliases = new Map<string, string[]>();
  const add = (term: string, expansion: string) => {
    const key = compact(term);
    if (!key) return;
    const bucket = aliases.get(key) ?? [];
    const value = compact(expansion);
    if (value && value !== key && !bucket.includes(value)) bucket.push(value);
    aliases.set(key, bucket);
  };

  for (const topic of contentTopics) {
    for (const abbreviation of topic.abbreviations) {
      add(abbreviation, topic.name);
      for (const keyword of topic.keywords) add(abbreviation, keyword);
    }
    for (const keyword of topic.keywords) add(keyword, topic.name);
  }
  return aliases;
}

const searchAliases = buildAliases();

export function searchAliasExpansions(term: string): readonly string[] {
  return searchAliases.get(compact(term)) ?? [];
}

// Token tra cứu: bỏ từ đệm và ký tự đơn, giữ nguyên thứ tự người dùng gõ.
export function searchTokens(query: string): string[] {
  const tokens: string[] = [];
  for (const token of syllables(query.slice(0, maximumQueryLength))) {
    if (token.length < 2 || stopWords.has(token)) continue;
    if (!tokens.includes(token)) tokens.push(token);
  }
  return tokens;
}

function hasTerm(
  compactHaystack: string,
  haystackSyllables: ReadonlySet<string>,
  term: string,
): boolean {
  if (!term) return false;
  if (haystackSyllables.has(term)) return true;
  // Chuỗi con chỉ được tính khi đủ dài: "anh" mà so chuỗi con sẽ khớp cả
  // "đánh", "nhanh" và làm hỏng độ chính xác.
  return term.length >= minimumCompactLength && compactHaystack.includes(term);
}

// Điểm khớp: 0 nghĩa là loại khỏi kết quả. Câu hỏi đời thực hiếm khi khớp mọi
// từ, nên chấm điểm theo số từ khóa chạm được thay vì bắt khớp tất cả.
export function scoreSituationMatch(haystack: string, query: string): number {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return 1;

  const compactHaystack = compact(haystack);
  const haystackSyllables = new Set(syllables(haystack));
  if (!compactHaystack) return 0;

  let score = 0;
  const compactQuery = compact(query.slice(0, maximumQueryLength));
  if (
    compactQuery.length >= minimumCompactLength &&
    compactHaystack.includes(compactQuery)
  ) {
    score += exactPhraseScore;
  }

  for (const token of tokens) {
    const candidates = [token, ...searchAliasExpansions(token)];
    if (
      candidates.some((candidate) =>
        hasTerm(compactHaystack, haystackSyllables, candidate),
      )
    ) {
      score += 1;
    }
  }
  return score;
}

// Sắp xếp ổn định: điểm cao lên trước, cùng điểm thì giữ thứ tự gốc (đã sắp
// theo thời gian cập nhật) để kết quả không nhảy loạn giữa hai lần gõ.
export function rankBySituation<T>(
  items: readonly T[],
  query: string,
  toHaystack: (item: T) => string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [...items];
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreSituationMatch(toHaystack(item), trimmed),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      left.score === right.score
        ? left.index - right.index
        : right.score - left.score,
    )
    .map((entry) => entry.item);
}
