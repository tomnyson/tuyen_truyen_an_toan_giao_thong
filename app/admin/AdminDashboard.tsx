"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Status = "draft" | "published";
type Entity = "law" | "showcase";
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
      </nav>

      <div className="admin-grid">
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
      </div>
    </main>
  );
}
