export const CHAT_TOPIC_SCOPE_POLICY_VERSION = "chat-topic-scope-v1";

export const OUT_OF_SCOPE_ANSWER =
  "Câu hỏi này chưa thuộc phạm vi hỗ trợ của website. Bạn hãy hỏi về an toàn giao thông, ứng xử trên mạng hoặc bản quyền học đường.";

export const IN_SCOPE_NO_MATCH_ANSWER =
  "Mình chưa tìm thấy thông tin phù hợp và đủ tin cậy. Bạn hãy mô tả rõ hơn tình huống để mình tra cứu lại.";

export type ChatTopic = "traffic" | "online_safety" | "copyright";

export type ChatScopeDecision =
  | {
      inScope: true;
      topic: ChatTopic;
      policyVersion: typeof CHAT_TOPIC_SCOPE_POLICY_VERSION;
    }
  | {
      inScope: false;
      topic: null;
      policyVersion: typeof CHAT_TOPIC_SCOPE_POLICY_VERSION;
    };

const trafficPhrases = [
  "an toan giao thong",
  "mu bao hiem",
  "giay phep lai xe",
  "bang lai",
  "vuot den do",
  "den tin hieu",
  "xe may cho ba",
  "xe may kep ba",
  "xe may cho qua nguoi",
  "luat duong bo",
  "nong do con",
  "bien bao giao thong",
  "that day an toan",
  "di bo qua duong",
] as const;

const onlineSafetyPhrases = [
  "an toan mang",
  "ung xu tren mang",
  "bat nat mang",
  "bao luc mang",
  "lua dao truc tuyen",
  "lua dao online",
  "tin sai su that",
  "thong tin sai su that",
  "thong tin sai",
  "anh rieng tu",
  "anh nhay cam",
  "anh nong",
  "phat tan anh",
  "chuyen tiep anh",
  "xuc pham tren mang",
  "noi xau tren mang",
  "boi nho tren mang",
  "vu khong tren facebook",
  "chiem doat tai khoan",
  "tai khoan bi hack",
  "hack tai khoan",
  "bi chiem tai khoan",
  "mat tai khoan",
  "lo mat khau",
] as const;

const copyrightPhrases = [
  "ban quyen",
  "quyen tac gia",
  "vi pham ban quyen",
  "dao van",
  "giay phep su dung",
  "xin phep tac gia",
  "ghi nguon tac gia",
  "chu thich nguon",
  "dan nguon",
  "trich nguon",
  "trich bai cua nguoi khac",
  "trich dan dung cach",
  "dung tai lieu hoc tap co can xin phep",
  "dung anh tren mang",
  "lay anh nguoi khac cho website truong",
  "dang anh vao bai hoc",
  "dung nhac bieu dien",
] as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function phraseMatch(text: string, phrase: string) {
  return (` ${text} `).includes(` ${phrase} `);
}

function hasAnyPhrase(text: string, phrases: readonly string[]) {
  return phrases.some((phrase) => phraseMatch(text, phrase));
}

function hasAnyToken(tokens: Set<string>, values: readonly string[]) {
  return values.some((value) => tokens.has(value));
}

function decision(topic: ChatTopic | null): ChatScopeDecision {
  return Object.freeze(
    topic
      ? {
          inScope: true as const,
          topic,
          policyVersion: CHAT_TOPIC_SCOPE_POLICY_VERSION,
        }
      : {
          inScope: false as const,
          topic: null,
          policyVersion: CHAT_TOPIC_SCOPE_POLICY_VERSION,
        },
  );
}

export function classifyChatTopicScope(question: string): ChatScopeDecision {
  const text = normalize(question);
  if (!text) return decision(null);
  const tokens = new Set(text.split(" "));

  if (hasAnyPhrase(text, onlineSafetyPhrases)) {
    return decision("online_safety");
  }
  if (
    hasAnyPhrase(text, ["tai khoan"]) &&
    (hasAnyToken(tokens, ["hack", "chiem"]) ||
      hasAnyPhrase(text, ["bi mat", "khong dang nhap duoc"]))
  ) {
    return decision("online_safety");
  }
  if (hasAnyPhrase(text, copyrightPhrases)) {
    return decision("copyright");
  }

  const creativeAsset =
    hasAnyToken(tokens, [
      "anh",
      "hinh",
      "nhac",
      "video",
      "sach",
      "tranh",
    ]) ||
      hasAnyPhrase(text, [
        "tac gia",
        "tac pham",
        "bai viet",
        "bai cua nguoi khac",
        "bai hat",
        "bai hoc",
        "phan mem",
      ]);
  const rightsAction =
    hasAnyPhrase(text, [
      "xin phep",
      "ghi nguon",
      "dan nguon",
      "trich nguon",
      "chu thich nguon",
      "sao chep",
      "lay dung",
      "dang lai",
      "remix",
      "phoi lai",
      "che lai",
      "tai su dung",
    ]) ||
    ((hasAnyToken(tokens, ["dung"]) || hasAnyPhrase(text, ["su dung"])) &&
      hasAnyPhrase(text, ["tac gia", "cua nguoi khac"]));
  const copyrightContext = creativeAsset && rightsAction;
  if (copyrightContext) return decision("copyright");

  const privacyContext =
    (hasAnyPhrase(text, [
      "phat tan",
      "chuyen tiep",
      "dang lai",
      "chia se",
      "xuc pham",
      "boi nho",
    ])) &&
      (hasAnyToken(tokens, [
        "anh",
        "hinh",
        "tin",
        "bai",
        "thong",
        "tai",
        "khoan",
      ]) ||
        hasAnyPhrase(text, [
          "nhom lop",
          "nhom chat",
          "ban hoc",
          "tren mang",
        ])) &&
    hasAnyPhrase(text, [
      "khong dong y",
      "chua dong y",
      "chua kiem chung",
      "sai su that",
      "nhom lop",
      "nhom chat",
      "ban hoc",
      "tren mang",
      "mang xa hoi",
      "rieng tu",
      "nhay cam",
    ]);
  if (privacyContext) return decision("online_safety");

  if (hasAnyPhrase(text, trafficPhrases)) return decision("traffic");

  const trafficObject = hasAnyPhrase(text, [
    "xe may",
    "xe may dien",
    "xe dap dien",
    "xe dap",
    "xe dien",
    "mo to",
    "o to",
    "50cc",
    "phan khoi",
    "qua duong",
    "duong bo",
  ]);
  const trafficIntent =
    hasAnyToken(tokens, [
      "di",
      "lai",
      "chay",
      "dieu",
      "khien",
      "tong",
      "doi",
      "giu",
    ]) ||
    hasAnyPhrase(text, [
      "duoc khong",
      "bao nhieu tuoi",
      "quy dinh",
      "vi pham",
      "bi phat",
      "muc phat",
      "xu phat",
      "an toan",
      "toc do",
      "tai nan",
    ]);
  const vehicleContext =
    trafficObject &&
    trafficIntent &&
    !hasAnyPhrase(text, ["toc do internet", "tai nan lao dong"]);
  if (vehicleContext) return decision("traffic");

  const generalTrafficContext =
    hasAnyPhrase(text, ["giao thong", "tai nan", "toc do"]) &&
    (trafficIntent ||
      trafficObject ||
      hasAnyPhrase(text, [
        "bien bao",
        "den do",
        "qua duong",
        "tham gia giao thong",
      ])) &&
    !hasAnyPhrase(text, ["toc do internet", "tai nan lao dong"]);
  if (generalTrafficContext) return decision("traffic");

  const onlineContext =
    hasAnyPhrase(text, [
      "nhom lop",
      "nhom chat",
      "tren mang",
      "mang xa hoi",
      "facebook",
      "tiktok",
      "zalo",
    ]) &&
    (hasAnyToken(tokens, [
      "dang",
      "chia",
      "gui",
      "xuc",
      "pham",
      "sai",
      "lua",
      "dao",
    ]) ||
      hasAnyPhrase(text, [
        "tai khoan",
        "mat khau",
        "rieng tu",
        "nhay cam",
        "quy dinh",
        "vi pham",
        "an toan",
      "ung xu",
      "noi xau",
      "chui",
      "boi nho",
    ]));
  if (onlineContext) return decision("online_safety");

  return decision(null);
}

export function chatTopicLabel(topic: ChatTopic) {
  switch (topic) {
    case "traffic":
      return "Giao thông" as const;
    case "online_safety":
      return "Mạng xã hội" as const;
    case "copyright":
      return "Sở hữu trí tuệ" as const;
  }
}

export function matchesChatTopic(
  expectedTopic: ChatTopic,
  ...values: string[]
) {
  const result = classifyChatTopicScope(values.join(" "));
  return result.inScope && result.topic === expectedTopic;
}
