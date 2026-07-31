"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Status = "draft" | "published";
type Entity = "law" | "showcase" | "candidate";
type LawRow = {
  id: number;
  topic: string;
  icon: string;
  title: string;
  legalBasis: string;
  penalty: string;
  remedy: string;
  caseStudy: string;
  tags: string;
  status: Status;
  updatedAt: string;
};
type ShowcaseRow = {
  id: number;
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  status: Status;
  updatedAt: string;
};
type CandidateCitation = {
  title: string;
  url: string;
  documentNumber: string;
  article?: string;
  clause?: string;
  point?: string;
  issuedAt?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  lastVerifiedAt: string;
};
type CandidateSnapshot = {
  topic: string;
  title: string;
  answer: string;
  tags: string[];
  citations: CandidateCitation[];
};
type CandidateRow = {
  id: string;
  initialAnswer: string;
  providerModel: string;
  totalTokens: number | null;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  optimisticVersion: number;
  editorPrincipalId: string | null;
  reviewerPrincipalId: string | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  snapshot: CandidateSnapshot | null;
  sources: Array<{ title: string; url: string }>;
  history: Array<{
    action: string;
    actorPrincipalId: string | null;
    actorRole: string;
    reason: string | null;
    occurredAt: string;
  }>;
};

const emptyLaw = { topic: "Giao thông", icon: "§", title: "", legalBasis: "", penalty: "", remedy: "", caseStudy: "", tags: "", status: "draft" as Status };
const emptyShowcase = { topic: "Mạng xã hội", title: "", summary: "", sourceUrl: "", status: "draft" as Status };

export default function AdminDashboard() {
  const [tab, setTab] = useState<Entity>("law");
  const [laws, setLaws] = useState<LawRow[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseRow[]>([]);
  const [lawForm, setLawForm] = useState(emptyLaw);
  const [showcaseForm, setShowcaseForm] = useState(emptyShowcase);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadContent = useCallback(async () => {
    const response = await fetch("/admin/api/content", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/admin/login");
      return;
    }
    const body = (await response.json()) as { laws?: LawRow[]; showcases?: ShowcaseRow[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Không thể tải dữ liệu.");
    setLaws(body.laws ?? []);
    setShowcases(body.showcases ?? []);
  }, []);

  useEffect(() => {
    fetch("/admin/api/content", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/admin/login");
          return null;
        }
        const body = (await response.json()) as { laws?: LawRow[]; showcases?: ShowcaseRow[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Không thể tải dữ liệu.");
        return body;
      })
      .then((body) => {
        if (!body) return;
        setLaws(body.laws ?? []);
        setShowcases(body.showcases ?? []);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu."))
      .finally(() => setIsLoading(false));
  }, []);

  function resetForm() {
    setEditingId(null);
    setLawForm(emptyLaw);
    setShowcaseForm(emptyShowcase);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = tab === "law" ? lawForm : showcaseForm;
    const response = await fetch("/admin/api/content", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: tab, id: editingId, ...payload }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Không thể lưu nội dung.");
      return;
    }
    setNotice(editingId ? "Đã cập nhật nội dung." : "Đã tạo nội dung mới.");
    resetForm();
    await loadContent();
  }

  async function remove(entity: Entity, id: number) {
    if (!window.confirm("Xóa vĩnh viễn nội dung này?")) return;
    const response = await fetch("/admin/api/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, id }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Không thể xóa nội dung.");
      return;
    }
    resetForm();
    await loadContent();
  }

  function editLaw(item: LawRow) {
    setTab("law");
    setEditingId(item.id);
    setLawForm({ ...item, tags: JSON.parse(item.tags || "[]").join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editShowcase(item: ShowcaseRow) {
    setTab("showcase");
    setEditingId(item.id);
    setShowcaseForm(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    await fetch("/admin/api/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/"><span>L</span><strong>LUẬT HỌC ĐƯỜNG</strong></Link>
        <div><Link href="/" target="_blank">Xem website ↗</Link><button onClick={logout}>Đăng xuất</button></div>
      </header>

      <section className="admin-welcome">
        <div><p className="admin-kicker">BẢNG ĐIỀU KHIỂN</p><h1>Quản lý kho nội dung</h1><p>Nội dung chỉ xuất hiện công khai sau khi chuyển sang trạng thái “Đã xuất bản”.</p></div>
        <div className="admin-stats"><span><strong>{laws.length}</strong> điều luật</span><span><strong>{showcases.length}</strong> tình huống</span><span><strong>{laws.filter((item) => item.status === "published").length + showcases.filter((item) => item.status === "published").length}</strong> đã xuất bản</span></div>
      </section>

      <nav className="admin-tabs" aria-label="Loại nội dung">
        <button className={tab === "law" ? "active" : ""} onClick={() => { setTab("law"); resetForm(); }}>Điều luật & mức phạt</button>
        <button className={tab === "showcase" ? "active" : ""} onClick={() => { setTab("showcase"); resetForm(); }}>Case study</button>
        <button className={tab === "candidate" ? "active" : ""} onClick={() => { setTab("candidate"); resetForm(); }}>Bản nháp từ AI</button>
      </nav>

      {tab === "candidate" ? <CandidatePanel /> : <div className="admin-grid">
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-section-title"><div><p className="admin-kicker">{editingId ? "CHỈNH SỬA" : "THÊM MỚI"}</p><h2>{tab === "law" ? "Nội dung pháp luật" : "Tình huống cảnh báo"}</h2></div>{editingId && <button type="button" className="admin-link-button" onClick={resetForm}>Hủy sửa</button>}</div>
          <div className="admin-form-grid">
            <label>Lĩnh vực<select value={tab === "law" ? lawForm.topic : showcaseForm.topic} onChange={(event) => tab === "law" ? setLawForm({ ...lawForm, topic: event.target.value }) : setShowcaseForm({ ...showcaseForm, topic: event.target.value })}><option>Giao thông</option><option>Mạng xã hội</option><option>Sở hữu trí tuệ</option></select></label>
            <label>Trạng thái<select value={tab === "law" ? lawForm.status : showcaseForm.status} onChange={(event) => tab === "law" ? setLawForm({ ...lawForm, status: event.target.value as Status }) : setShowcaseForm({ ...showcaseForm, status: event.target.value as Status })}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
          </div>
          {tab === "law" ? (
            <>
              <div className="admin-form-grid compact"><label>Biểu tượng<input maxLength={8} value={lawForm.icon} onChange={(event) => setLawForm({ ...lawForm, icon: event.target.value })} /></label><label>Tiêu đề<input value={lawForm.title} onChange={(event) => setLawForm({ ...lawForm, title: event.target.value })} required /></label></div>
              <label>Căn cứ pháp lý<input value={lawForm.legalBasis} onChange={(event) => setLawForm({ ...lawForm, legalBasis: event.target.value })} required /></label>
              <label>Mức phạt<input value={lawForm.penalty} onChange={(event) => setLawForm({ ...lawForm, penalty: event.target.value })} required /></label>
              <label>Biện pháp khắc phục<textarea value={lawForm.remedy} onChange={(event) => setLawForm({ ...lawForm, remedy: event.target.value })} required /></label>
              <label>Tình huống minh họa<textarea rows={5} value={lawForm.caseStudy} onChange={(event) => setLawForm({ ...lawForm, caseStudy: event.target.value })} required /></label>
              <label>Thẻ — cách nhau bằng dấu phẩy<input placeholder="facebook, tin-sai" value={lawForm.tags} onChange={(event) => setLawForm({ ...lawForm, tags: event.target.value })} /></label>
            </>
          ) : (
            <>
              <label>Tiêu đề<input value={showcaseForm.title} onChange={(event) => setShowcaseForm({ ...showcaseForm, title: event.target.value })} required /></label>
              <label>Nội dung tình huống<textarea rows={8} value={showcaseForm.summary} onChange={(event) => setShowcaseForm({ ...showcaseForm, summary: event.target.value })} required /></label>
              <label>URL nguồn chính thức (nếu có)<input type="url" placeholder="https://..." value={showcaseForm.sourceUrl} onChange={(event) => setShowcaseForm({ ...showcaseForm, sourceUrl: event.target.value })} /></label>
            </>
          )}
          {error && <div className="admin-error" role="alert">{error}</div>}
          {notice && <div className="admin-success" role="status">{notice}</div>}
          <button className="admin-primary" type="submit">{editingId ? "Lưu thay đổi" : "Tạo nội dung"}</button>
        </form>

        <section className="admin-list">
          <div className="admin-section-title"><div><p className="admin-kicker">KHO NỘI DUNG</p><h2>{tab === "law" ? `${laws.length} điều luật` : `${showcases.length} tình huống`}</h2></div></div>
          {isLoading ? <p>Đang tải dữ liệu…</p> : tab === "law" ? laws.map((item) => (
            <article className="admin-item" key={item.id}><div className="admin-item-head"><span className={`admin-status ${item.status}`}>{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span><small>{item.topic}</small></div><h3>{item.title}</h3><p>{item.legalBasis}</p><div className="admin-actions"><button onClick={() => editLaw(item)}>Chỉnh sửa</button><button className="danger" onClick={() => void remove("law", item.id)}>Xóa</button></div></article>
          )) : showcases.map((item) => (
            <article className="admin-item" key={item.id}><div className="admin-item-head"><span className={`admin-status ${item.status}`}>{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span><small>{item.topic}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="admin-actions"><button onClick={() => editShowcase(item)}>Chỉnh sửa</button><button className="danger" onClick={() => void remove("showcase", item.id)}>Xóa</button></div></article>
          ))}
          {!isLoading && (tab === "law" ? laws.length === 0 : showcases.length === 0) && <div className="admin-empty"><strong>Chưa có nội dung</strong><p>Hãy dùng biểu mẫu bên trái để tạo mục đầu tiên.</p></div>}
        </section>
      </div>}
    </main>
  );
}

function CandidatePanel() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [principalId, setPrincipalId] = useState("");
  const [editing, setEditing] = useState<CandidateRow | null>(null);
  const [draft, setDraft] = useState<CandidateSnapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const canEdit = roles.includes("editor") || roles.includes("admin");
  const canReview = roles.includes("reviewer") || roles.includes("admin");

  const load = useCallback(async () => {
    const response = await fetch("/admin/api/web-search-candidates", {
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.assign("/admin/login");
      return;
    }
    const body = (await response.json()) as {
      error?: string;
      actor?: { principalId: string; roles: string[] };
      candidates?: CandidateRow[];
    };
    if (!response.ok) throw new Error(body.error ?? "Không thể tải bản nháp.");
    setCandidates(body.candidates ?? []);
    setRoles(body.actor?.roles ?? []);
    setPrincipalId(body.actor?.principalId ?? "");
  }, []);

  useEffect(() => {
    fetch("/admin/api/web-search-candidates", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/admin/login");
          return null;
        }
        const body = (await response.json()) as {
          error?: string;
          actor?: { principalId: string; roles: string[] };
          candidates?: CandidateRow[];
        };
        if (!response.ok) {
          throw new Error(body.error ?? "Không thể tải bản nháp.");
        }
        return body;
      })
      .then((body) => {
        if (!body) return;
        setCandidates(body.candidates ?? []);
        setRoles(body.actor?.roles ?? []);
        setPrincipalId(body.actor?.principalId ?? "");
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "Không thể tải bản nháp."),
      )
      .finally(() => setLoading(false));
  }, []);

  function startEdit(candidate: CandidateRow) {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(candidate);
    setDraft(
      candidate.snapshot ?? {
        topic: "Giao thông",
        title: "",
        answer: candidate.initialAnswer,
        tags: [],
        citations: candidate.sources.map((source) => ({
          ...source,
          documentNumber: "",
          issuedAt: "",
          effectiveFrom: "",
          lastVerifiedAt: today,
        })),
      },
    );
    setError("");
    setNotice("");
  }

  async function mutate(payload: Record<string, unknown>) {
    setError("");
    setNotice("");
    const response = await fetch("/admin/api/web-search-candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Không thể cập nhật.");
    setNotice("Đã cập nhật workflow.");
    setEditing(null);
    setDraft(null);
    await load();
  }

  async function action(
    candidate: CandidateRow,
    actionName: "submit" | "approve" | "reject" | "archive",
  ) {
    const reason =
      actionName === "reject"
        ? window.prompt("Lý do từ chối (bắt buộc):") ?? ""
        : undefined;
    if (actionName === "reject" && !reason?.trim()) return;
    try {
      await mutate({
        action: actionName,
        candidateId: candidate.id,
        expectedVersion: candidate.optimisticVersion,
        reason,
      });
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Không thể cập nhật.",
      );
    }
  }

  async function saveRevision(event: FormEvent) {
    event.preventDefault();
    if (!editing || !draft) return;
    try {
      await mutate({
        action: "save_revision",
        candidateId: editing.id,
        expectedVersion: editing.optimisticVersion,
        snapshot: draft,
      });
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Không thể lưu revision.",
      );
    }
  }

  return (
    <section className="admin-candidates">
      <div className="admin-section-title">
        <div>
          <p className="admin-kicker">QUY TRÌNH BỐN MẮT</p>
          <h2>{candidates.length} bản nháp từ tra cứu AI</h2>
          <p>Đang đăng nhập: {principalId || "chưa gắn principal"} — quyền: {roles.join(", ") || "không có"}</p>
        </div>
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {notice && <div className="admin-success" role="status">{notice}</div>}
      {editing && draft && (
        <form className="admin-editor candidate-editor" onSubmit={saveRevision}>
          <div className="admin-section-title">
            <h3>Tạo revision kiểm duyệt</h3>
            <button type="button" className="admin-link-button" onClick={() => setEditing(null)}>Hủy</button>
          </div>
          <div className="admin-form-grid">
            <label>Lĩnh vực<select value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })}><option>Giao thông</option><option>Mạng xã hội</option><option>Sở hữu trí tuệ</option></select></label>
            <label>Tiêu đề<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          </div>
          <label>Câu trả lời đã biên tập<textarea rows={8} required value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /></label>
          <label>Tags — cách nhau bằng dấu phẩy<input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
          {draft.citations.map((citation, index) => (
            <fieldset className="candidate-citation" key={citation.url}>
              <legend>Nguồn {index + 1}</legend>
              <a href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a>
              <div className="admin-form-grid">
                <label>Số hiệu văn bản<input required value={citation.documentNumber} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, documentNumber: event.target.value } : item) })} /></label>
                <label>Ngày ban hành<input type="date" required value={citation.issuedAt ?? ""} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, issuedAt: event.target.value } : item) })} /></label>
                <label>Ngày hiệu lực<input type="date" required value={citation.effectiveFrom} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, effectiveFrom: event.target.value } : item) })} /></label>
                <label>Ngày hết hiệu lực<input type="date" value={citation.effectiveTo ?? ""} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, effectiveTo: event.target.value || undefined } : item) })} /></label>
                <label>Ngày kiểm chứng<input type="date" required value={citation.lastVerifiedAt} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, lastVerifiedAt: event.target.value } : item) })} /></label>
                <label>Điều<input value={citation.article ?? ""} onChange={(event) => setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, article: event.target.value } : item) })} /></label>
                <label>Khoản / điểm<input value={[citation.clause, citation.point].filter(Boolean).join(" / ")} onChange={(event) => { const [clause, point] = event.target.value.split("/").map((value) => value.trim()); setDraft({ ...draft, citations: draft.citations.map((item, itemIndex) => itemIndex === index ? { ...item, clause, point } : item) }); }} /></label>
              </div>
            </fieldset>
          ))}
          <button className="admin-primary" type="submit">Lưu revision</button>
        </form>
      )}
      {loading ? <p>Đang tải…</p> : candidates.map((candidate) => (
        <article className="admin-item candidate-item" key={candidate.id}>
          <div className="admin-item-head">
            <span className={`admin-status ${candidate.status}`}>{candidate.status}</span>
            <small>{candidate.providerModel} · {candidate.totalTokens ?? "?"} tokens</small>
          </div>
          <h3>{candidate.snapshot?.title || "Bản nháp chưa được biên tập"}</h3>
          <p>{candidate.snapshot?.answer || candidate.initialAnswer}</p>
          {candidate.reviewReason && <p><strong>Lý do từ chối:</strong> {candidate.reviewReason}</p>}
          <div className="admin-actions">
            {canEdit && (candidate.status === "draft" || candidate.status === "rejected") && <button onClick={() => startEdit(candidate)}>Biên tập</button>}
            {canEdit && candidate.status === "draft" && candidate.snapshot && candidate.editorPrincipalId === principalId && <button onClick={() => void action(candidate, "submit")}>Gửi duyệt</button>}
            {canReview && candidate.status === "pending_review" && candidate.editorPrincipalId !== principalId && <button onClick={() => void action(candidate, "approve")}>Duyệt & đưa vào RAG</button>}
            {canReview && candidate.status === "pending_review" && candidate.editorPrincipalId !== principalId && <button className="danger" onClick={() => void action(candidate, "reject")}>Từ chối</button>}
            {canReview && candidate.status === "published" && <button onClick={() => void action(candidate, "archive")}>Lưu trữ</button>}
          </div>
          <details>
            <summary>Lịch sử ({candidate.history.length})</summary>
            <ul>{candidate.history.map((event, index) => <li key={`${event.action}-${event.occurredAt}-${index}`}>{event.occurredAt}: {event.action} — {event.actorPrincipalId ?? "system"}{event.reason ? ` (${event.reason})` : ""}</li>)}</ul>
          </details>
        </article>
      ))}
      {!loading && candidates.length === 0 && <div className="admin-empty"><strong>Chưa có candidate</strong><p>Kết quả web-search thành công sẽ xuất hiện ở đây dưới dạng bản nháp.</p></div>}
    </section>
  );
}
