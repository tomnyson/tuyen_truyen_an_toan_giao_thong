"use client";

// CMS cho phần rèn luyện (US-035 ngân hàng câu hỏi + quy đổi huy hiệu,
// US-036 kịch bản nhập vai). Component chỉ dựng biểu mẫu; mọi kiểm tra hợp lệ
// — kể cả tính đúng đắn của đồ thị kịch bản — do `/admin/api/game` quyết định.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { contentTopics } from "@/lib/topics";

type Status = "draft" | "published";
type GameEntity = "question" | "badge" | "scenario";

type QuestionRow = {
  id: number;
  topic: string;
  prompt: string;
  options: string;
  correctIndex: number;
  explanation: string;
  legalBasis: string;
  sourceUrl: string;
  points: number;
  status: Status;
};
type BadgeRow = {
  code: string;
  name: string;
  icon: string;
  description: string;
  thresholdPoints: number;
};
type ScenarioRow = {
  id: number;
  topic: string;
  title: string;
  intro: string;
  startKey: string;
  status: Status;
};
type NodeRow = {
  scenarioId: number;
  nodeKey: string;
  kind: "step" | "outcome";
  text: string;
  choices: string;
  consequence: string;
  legalBasis: string;
  sourceUrl: string;
  outcomeKind: "safe" | "risky" | "harmful" | null;
  points: number;
};

const emptyQuestion = {
  topic: String(contentTopics[0]?.name ?? "Giao thông"),
  prompt: "",
  options: "",
  correctIndex: 0,
  explanation: "",
  legalBasis: "",
  sourceUrl: "",
  points: 10,
  status: "draft" as Status,
};
const emptyBadge = {
  code: "",
  name: "",
  icon: "★",
  description: "",
  thresholdPoints: 20,
};
const emptyScenario = {
  topic: String(contentTopics[0]?.name ?? "Giao thông"),
  title: "",
  intro: "",
  startKey: "bat-dau",
  status: "draft" as Status,
  nodes: "",
};

const nodeTemplate = `[
  {
    "key": "bat-dau",
    "kind": "step",
    "text": "Mô tả tình huống mở đầu.",
    "choices": [
      { "label": "Lựa chọn an toàn", "next": "ket-cuc-an-toan" },
      { "label": "Lựa chọn rủi ro", "next": "ket-cuc-rui-ro" }
    ]
  },
  {
    "key": "ket-cuc-an-toan",
    "kind": "outcome",
    "outcomeKind": "safe",
    "text": "Điều gì xảy ra.",
    "consequence": "Phân tích hậu quả pháp lý hoặc an toàn.",
    "legalBasis": "Căn cứ đã duyệt",
    "sourceUrl": "",
    "points": 15
  },
  {
    "key": "ket-cuc-rui-ro",
    "kind": "outcome",
    "outcomeKind": "risky",
    "text": "Điều gì xảy ra.",
    "consequence": "Phân tích hậu quả pháp lý hoặc an toàn.",
    "legalBasis": "Căn cứ đã duyệt",
    "sourceUrl": "",
    "points": 8
  }
]`;

function optionsToLines(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return "";
  }
}

function linesToOptions(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function nodesToJson(rows: readonly NodeRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      key: row.nodeKey,
      kind: row.kind,
      text: row.text,
      choices: JSON.parse(row.choices || "[]") as unknown,
      consequence: row.consequence,
      legalBasis: row.legalBasis,
      sourceUrl: row.sourceUrl,
      outcomeKind: row.outcomeKind,
      points: row.points,
    })),
    null,
    2,
  );
}

type GameContent = {
  questions?: QuestionRow[];
  badges?: BadgeRow[];
  scenarios?: ScenarioRow[];
  nodes?: NodeRow[];
  error?: string;
};

// Tách phần gọi mạng ra khỏi component: hiệu ứng khởi tạo và lần tải lại sau
// khi lưu dùng chung một đường đọc dữ liệu.
async function fetchGameContent(): Promise<GameContent | null> {
  const response = await fetch("/admin/api/game", { cache: "no-store" });
  if (response.status === 401) {
    window.location.assign("/admin/login");
    return null;
  }
  const body = (await response.json()) as GameContent;
  if (!response.ok) throw new Error(body.error ?? "Không thể tải dữ liệu.");
  return body;
}

export function GameManager() {
  const [entity, setEntity] = useState<GameEntity>("question");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [badgeForm, setBadgeForm] = useState(emptyBadge);
  const [scenarioForm, setScenarioForm] = useState(emptyScenario);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const apply = useCallback((body: GameContent | null) => {
    if (!body) return;
    setQuestions(body.questions ?? []);
    setBadges(body.badges ?? []);
    setScenarios(body.scenarios ?? []);
    setNodes(body.nodes ?? []);
  }, []);

  const load = useCallback(async () => {
    apply(await fetchGameContent());
  }, [apply]);

  useEffect(() => {
    let active = true;
    fetchGameContent()
      .then((body) => {
        if (active) apply(body);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải dữ liệu.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apply]);

  function reset() {
    setEditingId(null);
    setEditingCode(null);
    setQuestionForm(emptyQuestion);
    setBadgeForm(emptyBadge);
    setScenarioForm(emptyScenario);
  }

  function payloadOf(): Record<string, unknown> | string {
    if (entity === "question") {
      const options = linesToOptions(questionForm.options);
      if (options.length < 2) return "Cần ít nhất 2 đáp án, mỗi dòng một đáp án.";
      if (questionForm.correctIndex >= options.length) {
        return "Số thứ tự đáp án đúng vượt quá số đáp án đã nhập.";
      }
      return { entity, id: editingId, ...questionForm, options };
    }
    if (entity === "badge") return { entity, ...badgeForm };
    let parsedNodes: unknown;
    try {
      parsedNodes = JSON.parse(scenarioForm.nodes || "[]");
    } catch {
      return "Danh sách nút chưa đúng định dạng JSON.";
    }
    return { entity, id: editingId, ...scenarioForm, nodes: parsedNodes };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = payloadOf();
    if (typeof payload === "string") {
      setError(payload);
      return;
    }
    const editing = entity === "badge" ? editingCode !== null : editingId !== null;
    const response = await fetch("/admin/api/game", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Không thể lưu nội dung.");
      return;
    }
    setNotice(editing ? "Đã cập nhật." : "Đã tạo mới.");
    reset();
    await load();
  }

  async function remove(body: Record<string, unknown>) {
    if (!window.confirm("Xóa vĩnh viễn mục này?")) return;
    const response = await fetch("/admin/api/game", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const parsed = (await response.json()) as { error?: string };
      setError(parsed.error ?? "Không thể xóa mục này.");
      return;
    }
    reset();
    await load();
  }

  function editQuestion(item: QuestionRow) {
    setEntity("question");
    setEditingId(item.id);
    setEditingCode(null);
    setQuestionForm({
      topic: item.topic,
      prompt: item.prompt,
      options: optionsToLines(item.options),
      correctIndex: item.correctIndex,
      explanation: item.explanation,
      legalBasis: item.legalBasis,
      sourceUrl: item.sourceUrl ?? "",
      points: item.points,
      status: item.status,
    });
  }

  function editBadge(item: BadgeRow) {
    setEntity("badge");
    setEditingId(null);
    setEditingCode(item.code);
    setBadgeForm({
      code: item.code,
      name: item.name,
      icon: item.icon,
      description: item.description ?? "",
      thresholdPoints: item.thresholdPoints,
    });
  }

  function editScenario(item: ScenarioRow) {
    setEntity("scenario");
    setEditingId(item.id);
    setEditingCode(null);
    setScenarioForm({
      topic: item.topic,
      title: item.title,
      intro: item.intro,
      startKey: item.startKey,
      status: item.status,
      nodes: nodesToJson(nodes.filter((row) => row.scenarioId === item.id)),
    });
  }

  const editing = entity === "badge" ? editingCode !== null : editingId !== null;

  return (
    <>
      <nav className="admin-tabs" aria-label="Nội dung rèn luyện">
        <button
          className={entity === "question" ? "active" : ""}
          onClick={() => {
            setEntity("question");
            reset();
          }}
        >
          Ngân hàng câu hỏi
        </button>
        <button
          className={entity === "scenario" ? "active" : ""}
          onClick={() => {
            setEntity("scenario");
            reset();
          }}
        >
          Kịch bản nhập vai
        </button>
        <button
          className={entity === "badge" ? "active" : ""}
          onClick={() => {
            setEntity("badge");
            reset();
          }}
        >
          Quy đổi huy hiệu
        </button>
      </nav>

      <div className="admin-grid">
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-section-title">
            <div>
              <p className="admin-kicker">{editing ? "CHỈNH SỬA" : "THÊM MỚI"}</p>
              <h2>
                {entity === "question"
                  ? "Câu hỏi trắc nghiệm"
                  : entity === "scenario"
                    ? "Kịch bản nhập vai"
                    : "Mốc quy đổi huy hiệu"}
              </h2>
            </div>
            {editing && (
              <button type="button" className="admin-link-button" onClick={reset}>
                Hủy sửa
              </button>
            )}
          </div>

          {entity === "question" && (
            <>
              <div className="admin-form-grid">
                <label>
                  Lĩnh vực
                  <select
                    value={questionForm.topic}
                    onChange={(event) =>
                      setQuestionForm({ ...questionForm, topic: event.target.value })
                    }
                  >
                    {contentTopics.map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Trạng thái
                  <select
                    value={questionForm.status}
                    onChange={(event) =>
                      setQuestionForm({
                        ...questionForm,
                        status: event.target.value as Status,
                      })
                    }
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                  </select>
                </label>
              </div>
              <label>
                Câu hỏi
                <textarea
                  rows={3}
                  value={questionForm.prompt}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, prompt: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Đáp án — mỗi dòng một đáp án (2 đến 4 dòng)
                <textarea
                  rows={4}
                  value={questionForm.options}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, options: event.target.value })
                  }
                  required
                />
              </label>
              <div className="admin-form-grid compact">
                <label>
                  Đáp án đúng — đếm từ 0
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={questionForm.correctIndex}
                    onChange={(event) =>
                      setQuestionForm({
                        ...questionForm,
                        correctIndex: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Điểm thưởng
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={questionForm.points}
                    onChange={(event) =>
                      setQuestionForm({
                        ...questionForm,
                        points: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Giải thích đúng/sai
                <textarea
                  rows={4}
                  value={questionForm.explanation}
                  onChange={(event) =>
                    setQuestionForm({
                      ...questionForm,
                      explanation: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                Căn cứ đã duyệt
                <input
                  value={questionForm.legalBasis}
                  onChange={(event) =>
                    setQuestionForm({
                      ...questionForm,
                      legalBasis: event.target.value,
                    })
                  }
                  required
                />
                <small>Chỉ dùng căn cứ đã có trong kho nội dung đã duyệt.</small>
              </label>
              <label>
                URL văn bản gốc (nếu có)
                <input
                  type="url"
                  placeholder="https://vbpl.vn/..."
                  value={questionForm.sourceUrl}
                  onChange={(event) =>
                    setQuestionForm({
                      ...questionForm,
                      sourceUrl: event.target.value,
                    })
                  }
                />
              </label>
            </>
          )}

          {entity === "scenario" && (
            <>
              <div className="admin-form-grid">
                <label>
                  Lĩnh vực
                  <select
                    value={scenarioForm.topic}
                    onChange={(event) =>
                      setScenarioForm({ ...scenarioForm, topic: event.target.value })
                    }
                  >
                    {contentTopics.map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Trạng thái
                  <select
                    value={scenarioForm.status}
                    onChange={(event) =>
                      setScenarioForm({
                        ...scenarioForm,
                        status: event.target.value as Status,
                      })
                    }
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                  </select>
                </label>
              </div>
              <label>
                Tên kịch bản
                <input
                  value={scenarioForm.title}
                  onChange={(event) =>
                    setScenarioForm({ ...scenarioForm, title: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Giới thiệu
                <textarea
                  rows={3}
                  value={scenarioForm.intro}
                  onChange={(event) =>
                    setScenarioForm({ ...scenarioForm, intro: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Mã nút bắt đầu
                <input
                  value={scenarioForm.startKey}
                  onChange={(event) =>
                    setScenarioForm({ ...scenarioForm, startKey: event.target.value })
                  }
                  required
                />
                <small>Chữ thường, số và dấu gạch ngang, tối đa 40 ký tự.</small>
              </label>
              <label>
                Các nút của kịch bản — JSON
                <textarea
                  rows={16}
                  value={scenarioForm.nodes}
                  onChange={(event) =>
                    setScenarioForm({ ...scenarioForm, nodes: event.target.value })
                  }
                  required
                />
                <small>
                  Nút <code>step</code> cần ít nhất 2 lựa chọn; nút{" "}
                  <code>outcome</code> cần <code>consequence</code> và{" "}
                  <code>legalBasis</code>. Hệ thống từ chối lưu nếu đồ thị có ngõ
                  cụt hoặc nút không tới được.
                </small>
              </label>
              {!scenarioForm.nodes && (
                <button
                  type="button"
                  className="admin-link-button"
                  onClick={() =>
                    setScenarioForm({ ...scenarioForm, nodes: nodeTemplate })
                  }
                >
                  Chèn mẫu kịch bản
                </button>
              )}
            </>
          )}

          {entity === "badge" && (
            <>
              <div className="admin-form-grid compact">
                <label>
                  Mã huy hiệu
                  <input
                    value={badgeForm.code}
                    onChange={(event) =>
                      setBadgeForm({ ...badgeForm, code: event.target.value })
                    }
                    disabled={editingCode !== null}
                    required
                  />
                </label>
                <label>
                  Biểu tượng
                  <input
                    maxLength={8}
                    value={badgeForm.icon}
                    onChange={(event) =>
                      setBadgeForm({ ...badgeForm, icon: event.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Tên huy hiệu
                <input
                  value={badgeForm.name}
                  onChange={(event) =>
                    setBadgeForm({ ...badgeForm, name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Mốc điểm quy đổi
                <input
                  type="number"
                  min={1}
                  value={badgeForm.thresholdPoints}
                  onChange={(event) =>
                    setBadgeForm({
                      ...badgeForm,
                      thresholdPoints: Number(event.target.value),
                    })
                  }
                  required
                />
              </label>
              <label>
                Mô tả
                <textarea
                  rows={3}
                  value={badgeForm.description}
                  onChange={(event) =>
                    setBadgeForm({ ...badgeForm, description: event.target.value })
                  }
                />
              </label>
              <small>
                Khi chưa cấu hình mốc nào, hệ thống dùng bộ huy hiệu mặc định.
              </small>
            </>
          )}

          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="admin-success" role="status">
              {notice}
            </div>
          )}
          <button className="admin-primary" type="submit">
            {editing ? "Lưu thay đổi" : "Tạo mới"}
          </button>
        </form>

        <section className="admin-list">
          <div className="admin-section-title">
            <div>
              <p className="admin-kicker">ĐANG CÓ</p>
              <h2>
                {entity === "question"
                  ? `${questions.length} câu hỏi`
                  : entity === "scenario"
                    ? `${scenarios.length} kịch bản`
                    : `${badges.length} mốc huy hiệu`}
              </h2>
            </div>
          </div>
          {loading && <p>Đang tải dữ liệu…</p>}

          {!loading &&
            entity === "question" &&
            questions.map((item) => (
              <article className="admin-item" key={item.id}>
                <div className="admin-item-head">
                  <span className={`admin-status ${item.status}`}>
                    {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                  <small>
                    {item.topic} · {item.points} điểm
                  </small>
                </div>
                <h3>{item.prompt}</h3>
                <p>{item.legalBasis}</p>
                <div className="admin-actions">
                  <button onClick={() => editQuestion(item)}>Chỉnh sửa</button>
                  <button
                    className="danger"
                    onClick={() => void remove({ entity: "question", id: item.id })}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}

          {!loading &&
            entity === "scenario" &&
            scenarios.map((item) => (
              <article className="admin-item" key={item.id}>
                <div className="admin-item-head">
                  <span className={`admin-status ${item.status}`}>
                    {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                  <small>
                    {item.topic} ·{" "}
                    {nodes.filter((row) => row.scenarioId === item.id).length} nút
                  </small>
                </div>
                <h3>{item.title}</h3>
                <p>{item.intro}</p>
                <div className="admin-actions">
                  <button onClick={() => editScenario(item)}>Chỉnh sửa</button>
                  <button
                    className="danger"
                    onClick={() => void remove({ entity: "scenario", id: item.id })}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}

          {!loading &&
            entity === "badge" &&
            badges.map((item) => (
              <article className="admin-item" key={item.code}>
                <div className="admin-item-head">
                  <span className="admin-status published">
                    {item.thresholdPoints} điểm
                  </span>
                  <small>{item.code}</small>
                </div>
                <h3>
                  {item.icon} {item.name}
                </h3>
                <p>{item.description}</p>
                <div className="admin-actions">
                  <button onClick={() => editBadge(item)}>Chỉnh sửa</button>
                  <button
                    className="danger"
                    onClick={() => void remove({ entity: "badge", code: item.code })}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}

          {!loading &&
            (entity === "question"
              ? questions.length === 0
              : entity === "scenario"
                ? scenarios.length === 0
                : badges.length === 0) && (
              <div className="admin-empty">
                <strong>Chưa có mục nào</strong>
                <p>
                  Nội dung seed vẫn hiển thị cho người chơi; phần thêm ở đây sẽ
                  xuất hiện cùng với nội dung seed sau khi xuất bản.
                </p>
              </div>
            )}
        </section>
      </div>
    </>
  );
}
