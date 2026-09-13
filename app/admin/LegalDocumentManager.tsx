"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import type {
  LegalDocumentRecord,
  LegalDocumentType,
  CreateLegalDocumentInput,
} from "@/lib/legal-document-store";

type StatusFilter = "all" | "published" | "draft" | "archived";
type LinkFilter = "all" | "ok" | "broken" | "redirect" | "timeout" | "unchecked";

const DOCUMENT_TYPES: Array<{ value: LegalDocumentType; label: string; badgeColor: string }> = [
  { value: "luat", label: "Luật", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "nghi_dinh", label: "Nghị định", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "thong_tu", label: "Thông tư", badgeColor: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "quyet_dinh", label: "Quyết định", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "van_ban_hop_nhat", label: "VB Hợp nhất", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "khac", label: "Khác", badgeColor: "bg-slate-50 text-slate-700 border-slate-200" },
];

const COMMON_TOPICS = [
  "Giao thông",
  "Mạng xã hội",
  "Bạo lực học đường",
  "An ninh trật tự",
  "Sở hữu trí tuệ",
  "Chuyên đề phòng chống ma túy",
  "Chuyên đề an ninh trật tự trường học",
  "Chuyên đề game và không gian mạng",
  "Tài chính - tín dụng đen",
  "Phòng chống tệ nạn xã hội",
];

const COMMON_AUTHORITIES = [
  "Quốc hội",
  "Chính phủ",
  "Thủ tướng Chính phủ",
  "Bộ Công an",
  "Bộ Giáo dục và Đào tạo",
  "Bộ Thông tin và Truyền thông",
  "Bộ Giao thông vận tải",
  "Bộ Tài chính",
  "Bộ Lao động - Thương binh và Xã hội",
];

const emptyForm = {
  title: "",
  documentNumber: "",
  documentType: "nghi_dinh" as LegalDocumentType,
  topic: "Giao thông",
  issuingAuthority: "Chính phủ",
  officialUrl: "",
  summary: "",
  effectivityStatus: "in_force" as "in_force" | "expired" | "superseded" | "draft",
  status: "published" as "published" | "draft" | "archived",
  displayOrder: 10,
};

export function LegalDocumentManager() {
  const [documents, setDocuments] = useState<LegalDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [urlCheckResult, setUrlCheckResult] = useState<{
    tested: boolean;
    checking: boolean;
    status?: "ok" | "broken" | "redirect" | "timeout" | "blocked_ssrf";
    statusCode?: number;
    message?: string;
  }>({ tested: false, checking: false });

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedAuthority, setSelectedAuthority] = useState("all");
  const [selectedLinkStatus, setSelectedLinkStatus] = useState<LinkFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function fetchDocuments() {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch("/admin/api/legal-documents?status=all", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.assign("/admin/login");
          return;
        }
        throw new Error("Không thể tải danh sách văn bản.");
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối khi tải văn bản.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  function handleStartCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      displayOrder: (documents.length + 1) * 10,
    });
    setUrlCheckResult({ tested: false, checking: false });
    setError("");
    setNotice("");
    setShowModal(true);
  }

  function handleStartEdit(doc: LegalDocumentRecord) {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      topic: doc.topic,
      issuingAuthority: doc.issuingAuthority,
      officialUrl: doc.officialUrl,
      summary: doc.summary,
      effectivityStatus: doc.effectivityStatus,
      status: doc.status,
      displayOrder: doc.displayOrder,
    });
    setUrlCheckResult({
      tested: doc.linkStatus !== "unchecked",
      checking: false,
      status: doc.linkStatus === "unchecked" ? undefined : (doc.linkStatus as any),
      statusCode: doc.httpStatus ?? undefined,
    });
    setError("");
    setNotice("");
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setUrlCheckResult({ tested: false, checking: false });
  }

  // Quick link check from inside modal form
  async function handleTestUrlInModal() {
    if (!form.officialUrl.trim()) {
      setError("Vui lòng nhập đường link để kiểm tra.");
      return;
    }
    try {
      setUrlCheckResult({ tested: false, checking: true });
      const res = await fetch("/admin/api/legal-documents/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.officialUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi kiểm tra đường link");

      const result = data.result;
      setUrlCheckResult({
        tested: true,
        checking: false,
        status: result.status,
        statusCode: result.statusCode,
        message:
          result.status === "ok"
            ? `Liên kết hoạt động tốt (HTTP ${result.statusCode})`
            : result.status === "broken"
            ? `Cảnh báo: Liên kết không tồn tại hoặc lỗi 404 (HTTP ${result.statusCode || "N/A"})`
            : result.status === "redirect"
            ? `Liên kết chuyển hướng (HTTP ${result.statusCode})`
            : `Liên kết phản hồi chậm hoặc lỗi mạng`,
      });
    } catch (err: unknown) {
      setUrlCheckResult({
        tested: true,
        checking: false,
        status: "broken",
        message: err instanceof Error ? err.message : "Không thể kết nối đến máy chủ",
      });
    }
  }

  // Save Add/Edit Document
  async function handleSaveDocument(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Vui lòng nhập tên văn bản.");
      return;
    }
    if (!form.documentNumber.trim()) {
      setError("Vui lòng nhập số hiệu văn bản.");
      return;
    }
    if (!form.officialUrl.trim() || (!form.officialUrl.startsWith("http://") && !form.officialUrl.startsWith("https://"))) {
      setError("Đường dẫn liên kết phải bắt đầu bằng http:// hoặc https://");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const isEdit = editingId !== null;
      const url = "/admin/api/legal-documents";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit ? { ...form, id: editingId } : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể lưu văn bản.");
      }

      setNotice(isEdit ? "Đã cập nhật văn bản thành công." : "Đã thêm văn bản mới thành công.");
      handleCloseModal();
      await fetchDocuments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  }

  // Delete Document
  async function handleDeleteDocument(doc: LegalDocumentRecord) {
    if (!confirm(`Bạn có chắc muốn xóa văn bản "${doc.documentNumber} - ${doc.title}"?`)) {
      return;
    }

    try {
      setError("");
      const res = await fetch(`/admin/api/legal-documents?id=${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa văn bản.");
      }
      setNotice("Đã xóa văn bản thành công.");
      await fetchDocuments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa văn bản.");
    }
  }

  // Single Link Check from table
  async function handleCheckSingleLink(doc: LegalDocumentRecord) {
    try {
      setCheckingId(doc.id);
      setError("");
      const res = await fetch("/admin/api/legal-documents/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể kiểm tra liên kết.");
      }

      const status = data.result?.status;
      if (status === "ok") {
        setNotice(`Văn bản ${doc.documentNumber}: Liên kết hoạt động tốt (HTTP ${data.result?.statusCode}).`);
      } else if (status === "broken") {
        setError(`Cảnh báo: Văn bản ${doc.documentNumber} bị lỗi 404 hoặc không truy cập được!`);
      } else {
        setNotice(`Văn bản ${doc.documentNumber}: Trạng thái ${status} (HTTP ${data.result?.statusCode || "N/A"}).`);
      }

      // Update local state item
      if (data.document) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? data.document : d))
        );
      } else {
        await fetchDocuments();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi kiểm tra liên kết.");
    } finally {
      setCheckingId(null);
    }
  }

  // Check all links
  async function handleCheckAllLinks() {
    if (!confirm("Hệ thống sẽ tiến hành kiểm tra mã HTTP của toàn bộ liên kết văn bản. Tiếp tục?")) {
      return;
    }
    try {
      setIsCheckingAll(true);
      setError("");
      setNotice("Đang quét và kiểm tra tất cả liên kết...");
      const res = await fetch("/admin/api/legal-documents/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_all" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi kiểm tra toàn bộ liên kết.");
      }
      setNotice(data.message || "Hoàn tất kiểm tra liên kết.");
      await fetchDocuments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi quét liên kết.");
    } finally {
      setIsCheckingAll(false);
    }
  }

  // Seed default demo documents
  async function handleSeedDefaults() {
    if (!confirm("Đồng bộ các văn bản quy phạm pháp luật mẫu chuẩn Chính phủ vào hệ thống?")) {
      return;
    }
    try {
      setIsSeeding(true);
      setError("");
      const res = await fetch("/admin/api/legal-documents/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_default" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi nạp dữ liệu mẫu.");
      }
      setNotice(data.message || "Đã đồng bộ văn bản mẫu thành công.");
      await fetchDocuments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi nạp dữ liệu mẫu.");
    } finally {
      setIsSeeding(false);
    }
  }

  // Filtering
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          doc.title.toLowerCase().includes(q) ||
          doc.documentNumber.toLowerCase().includes(q) ||
          doc.issuingAuthority.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      // Topic
      if (selectedTopic !== "all" && doc.topic !== selectedTopic) return false;
      // Document Type
      if (selectedType !== "all" && doc.documentType !== selectedType) return false;
      // Authority
      if (selectedAuthority !== "all" && doc.issuingAuthority !== selectedAuthority) return false;
      // Link status
      if (selectedLinkStatus !== "all" && doc.linkStatus !== selectedLinkStatus) return false;
      // Status
      if (selectedStatus !== "all" && doc.status !== selectedStatus) return false;

      return true;
    });
  }, [documents, searchQuery, selectedTopic, selectedType, selectedAuthority, selectedLinkStatus, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const inForce = documents.filter((d) => d.effectivityStatus === "in_force").length;
    const okLinks = documents.filter((d) => d.linkStatus === "ok").length;
    const brokenLinks = documents.filter((d) => d.linkStatus === "broken").length;
    const uncheckedLinks = documents.filter((d) => d.linkStatus === "unchecked").length;
    return { total, inForce, okLinks, brokenLinks, uncheckedLinks };
  }, [documents]);

  // Render link status badge
  function renderLinkStatusBadge(doc: LegalDocumentRecord) {
    if (doc.linkStatus === "ok") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          200 OK
        </span>
      );
    }
    if (doc.linkStatus === "broken") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Lỗi / 404
        </span>
      );
    }
    if (doc.linkStatus === "redirect") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Chuyển hướng ({doc.httpStatus || 301})
        </span>
      );
    }
    if (doc.linkStatus === "timeout") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Timeout
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Chưa kiểm tra
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {notice && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Kho Văn Bản Quy Phạm Pháp Luật</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Tra cứu &amp; Quản trị Văn bản Chính thức
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Quản lý kho luật, nghị định, thông tư dẫn nguồn trực tiếp từ Cổng TTĐT Chính phủ (vanban.chinhphu.vn, vbpl.vn).
            Hệ thống tự động phát hiện liên kết 404 để kịp thời cập nhật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Nạp dữ liệu văn bản mẫu"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isSeeding ? "Đang đồng bộ..." : "Nạp văn bản mẫu"}
          </button>

          <button
            type="button"
            onClick={handleCheckAllLinks}
            disabled={isCheckingAll}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Quét mã phản hồi HTTP toàn bộ liên kết"
          >
            {isCheckingAll ? (
              <svg className="w-3.5 h-3.5 animate-spin text-amber-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            {isCheckingAll ? "Đang quét link..." : "Kiểm tra toàn bộ link"}
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Thêm văn bản mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tổng văn bản</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stats.inForce} văn bản đang có hiệu lực</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Link hoạt động</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.okLinks}</p>
          <p className="text-xs text-slate-500 mt-0.5">Trạng thái 200 OK bình thường</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Cảnh báo lỗi 404</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${stats.brokenLinks > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
            {stats.brokenLinks}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats.brokenLinks > 0 ? "Cần cập nhật lại liên kết ngay!" : "Không có link hỏng"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Chưa kiểm tra</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{stats.uncheckedLinks}</p>
          <p className="text-xs text-slate-500 mt-0.5">Bấm &quot;Kiểm tra link&quot; để quét</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm số hiệu, tên văn bản, cơ quan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Topic Select */}
          <div className="md:col-span-2">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {COMMON_TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div className="md:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả loại văn bản</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Link Status */}
          <div className="md:col-span-2">
            <select
              value={selectedLinkStatus}
              onChange={(e) => setSelectedLinkStatus(e.target.value as LinkFilter)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái link</option>
              <option value="ok">✔ Hoạt động (200 OK)</option>
              <option value="broken">✖ Lỗi (404/Broken)</option>
              <option value="redirect">🔀 Chuyển hướng</option>
              <option value="timeout">⏳ Timeout</option>
              <option value="unchecked">? Chưa kiểm tra</option>
            </select>
          </div>

          {/* Status Select */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả hiển thị</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <svg className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Đang tải kho văn bản pháp luật...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-slate-700">Không tìm thấy văn bản phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Thử điều chỉnh bộ lọc hoặc thêm văn bản mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-44">Số hiệu &amp; Loại</th>
                  <th className="py-3 px-4 min-w-[280px]">Tên văn bản &amp; Tóm tắt</th>
                  <th className="py-3 px-4 w-48">Lĩnh vực &amp; Cơ quan</th>
                  <th className="py-3 px-4 w-36">Hiệu lực</th>
                  <th className="py-3 px-4 w-40">Trạng thái Link</th>
                  <th className="py-3 px-4 w-44 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredDocuments.map((doc, idx) => {
                  const typeDef = DOCUMENT_TYPES.find((t) => t.value === doc.documentType) || {
                    label: doc.documentType,
                    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
                  };
                  const isCheckingThis = checkingId === doc.id;

                  return (
                    <tr key={doc.id} className="hover:bg-stone-50/75 transition-colors">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          {doc.documentNumber}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium border ${typeDef.badgeColor}`}>
                          {typeDef.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={doc.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5 group"
                          title="Mở liên kết gốc trong tab mới"
                        >
                          <span>{doc.title}</span>
                          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {doc.summary && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {doc.summary}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1 truncate max-w-md font-mono">
                          {doc.officialUrl}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium border border-sky-200">
                          {doc.topic}
                        </span>
                        <div className="text-xs text-slate-600 mt-1 font-medium">
                          {doc.issuingAuthority}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {doc.effectivityStatus === "in_force" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Còn hiệu lực
                          </span>
                        ) : doc.effectivityStatus === "expired" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Hết hiệu lực
                          </span>
                        ) : doc.effectivityStatus === "superseded" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Bị thay thế
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Dự thảo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {renderLinkStatusBadge(doc)}
                          {doc.lastCheckedAt && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Quét: {new Date(doc.lastCheckedAt).toLocaleTimeString("vi-VN")} {new Date(doc.lastCheckedAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Single check button */}
                          <button
                            type="button"
                            onClick={() => handleCheckSingleLink(doc)}
                            disabled={isCheckingThis}
                            className="p-1.5 text-xs font-medium rounded text-amber-700 hover:bg-amber-50 border border-amber-200 transition cursor-pointer"
                            title="Kiểm tra lại liên kết này"
                          >
                            {isCheckingThis ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(doc)}
                            className="p-1.5 text-xs font-medium rounded text-blue-700 hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
                            title="Chỉnh sửa văn bản"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            className="p-1.5 text-xs font-medium rounded text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            title="Xóa văn bản"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Document */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  {editingId ? "CHỈNH SỬA VĂN BẢN" : "THÊM VĂN BẢN MỚI"}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {editingId ? `Cập nhật văn bản #${editingId}` : "Thêm văn bản vào kho pháp luật"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Số hiệu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số hiệu văn bản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 168/2024/NĐ-CP hoặc 36/2024/QH15"
                    value={form.documentNumber}
                    onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Loại văn bản */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại văn bản <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.documentType}
                    onChange={(e) => setForm({ ...form, documentType: e.target.value as LegalDocumentType })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tên văn bản */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên / Trích yếu văn bản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự an toàn giao thông..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lĩnh vực / Chủ đề */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lĩnh vực / Chuyên đề <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {COMMON_TOPICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Cơ quan ban hành */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cơ quan ban hành <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="authority-suggestions"
                    placeholder="VD: Chính phủ, Quốc hội, Bộ Công an..."
                    value={form.issuingAuthority}
                    onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <datalist id="authority-suggestions">
                    {COMMON_AUTHORITIES.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Đường dẫn URL & Nút Check Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đường link chính thống <span className="text-rose-500">*</span>
                  <span className="font-normal text-slate-500 ml-1">
                    (Cổng TTĐT Chính phủ vanban.chinhphu.vn hoặc vbpl.vn)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://vanban.chinhphu.vn/?pageid=27160&docid=..."
                    value={form.officialUrl}
                    onChange={(e) => {
                      setForm({ ...form, officialUrl: e.target.value });
                      setUrlCheckResult({ tested: false, checking: false });
                    }}
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleTestUrlInModal}
                    disabled={urlCheckResult.checking}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {urlCheckResult.checking ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {urlCheckResult.checking ? "Đang check..." : "Kiểm tra link ngay"}
                  </button>
                </div>

                {/* URL test result banner */}
                {urlCheckResult.tested && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                      urlCheckResult.status === "ok"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : urlCheckResult.status === "broken"
                        ? "bg-rose-50 text-rose-800 border-rose-300 font-semibold"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {urlCheckResult.status === "ok" ? (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{urlCheckResult.message}</span>
                  </div>
                )}
              </div>

              {/* Tóm tắt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tóm tắt nội dung trọng tâm cho học sinh, phụ huynh
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú quy định quan trọng, mức phạt hành chính, đối tượng áp dụng..."
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tình trạng hiệu lực */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hiệu lực</label>
                  <select
                    value={form.effectivityStatus}
                    onChange={(e) => setForm({ ...form, effectivityStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="in_force">Còn hiệu lực</option>
                    <option value="expired">Hết hiệu lực</option>
                    <option value="superseded">Bị thay thế</option>
                    <option value="draft">Dự thảo</option>
                  </select>
                </div>

                {/* Trạng thái hiển thị */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="published">Đã xuất bản (Công khai)</option>
                    <option value="draft">Bản nháp</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>

                {/* Thứ tự hiển thị */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? "Đang lưu..." : editingId ? "Cập nhật văn bản" : "Lưu văn bản mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
