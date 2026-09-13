"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import type { TopicRecord, CreateTopicInput, UpdateTopicInput } from "@/lib/topic-store";
import { TopicIcon, POPULAR_TOPIC_ICONS } from "@/components/TopicIcon";

type StatusFilter = "all" | "published" | "draft" | "archived";

const emptyForm = {
  name: "",
  icon: "FaSchool",
  detail: "",
  abbreviations: "",
  keywords: "",
  situations: "",
  displayOrder: 10,
  status: "published" as "published" | "draft" | "archived",
};

export function TopicManager() {
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function fetchTopics() {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch("/admin/api/topics", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.assign("/admin/login");
          return;
        }
        throw new Error("Không thể tải danh sách chủ đề.");
      }
      const data = await res.json();
      setTopics(data.topics ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối khi tải chủ đề.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTopics();
  }, []);

  function handleStartCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      displayOrder: (topics.length + 1) * 10,
    });
    setError("");
    setNotice("");
    setShowFormModal(true);
  }

  function handleStartEdit(topic: TopicRecord) {
    setEditingId(topic.id);
    setForm({
      name: topic.name,
      icon: topic.icon,
      detail: topic.detail,
      abbreviations: topic.abbreviations.join(", "),
      keywords: topic.keywords.join(", "),
      situations: topic.situations.join("\n"),
      displayOrder: topic.displayOrder,
      status: topic.status,
    });
    setError("");
    setNotice("");
    setShowFormModal(true);
  }

  function handleCloseModal() {
    setShowFormModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSaveTopic(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên chủ đề.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const payload: CreateTopicInput = {
        name: form.name.trim(),
        icon: form.icon.trim() || "◉",
        detail: form.detail.trim(),
        abbreviations: form.abbreviations
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        keywords: form.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        situations: form.situations
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        displayOrder: Number(form.displayOrder) || 0,
        status: form.status,
      };

      if (editingId) {
        const res = await fetch("/admin/api/topics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không thể cập nhật chủ đề.");
        setNotice(`Đã cập nhật thành công chủ đề "${form.name}".`);
      } else {
        const res = await fetch("/admin/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không thể tạo chủ đề.");
        setNotice(`Đã tạo thành công chủ đề "${form.name}".`);
      }

      handleCloseModal();
      await fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu chủ đề.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTopic(topic: TopicRecord) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chủ đề "${topic.name}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const res = await fetch(`/admin/api/topics?id=${topic.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa chủ đề.");
      setNotice(`Đã xóa chủ đề "${topic.name}".`);
      await fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa chủ đề.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSeedDefaults() {
    if (!window.confirm("Đồng bộ bộ chủ đề mặc định vào cơ sở dữ liệu? Dữ liệu hiện có sẽ được cập nhật an toàn.")) {
      return;
    }

    try {
      setIsSeeding(true);
      setError("");
      const res = await fetch("/admin/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể nạp chủ đề mặc định.");
      setNotice(data.message || "Đã đồng bộ thành công bộ chủ đề mặc định vào database.");
      await fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi đồng bộ dữ liệu.");
    } finally {
      setIsSeeding(false);
    }
  }

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.detail.toLowerCase().includes(query) ||
        t.abbreviations.some((a) => a.toLowerCase().includes(query)) ||
        t.keywords.some((k) => k.toLowerCase().includes(query));
      return matchStatus && matchSearch;
    });
  }, [topics, statusFilter, searchQuery]);

  const totalKeywords = useMemo(() => {
    return topics.reduce((acc, t) => acc + t.keywords.length, 0);
  }, [topics]);

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {notice && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
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
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
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
            <span>QUẢN LÝ NỘI DUNG</span>
            <span>/</span>
            <span>CHỦ ĐỀ &amp; LĨNH VỰC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chủ đề &amp; Lĩnh vực Pháp luật</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Quản lý các chuyên đề pháp lý, từ khóa nhận diện, từ viết tắt và các câu hỏi tình huống gợi ý cho học sinh sinh viên.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <svg className={`w-4 h-4 text-slate-500 ${isSeeding ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSeeding ? "Đang nạp..." : "Nạp chủ đề mặc định"}</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm chủ đề mới</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Tổng số chủ đề</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{topics.length}</span>
            <span className="text-xs font-medium text-slate-400">chuyên đề</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Đang hiển thị</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">
              {topics.filter((t) => t.status === "published").length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Công khai</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Bản nháp / Lưu trữ</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-600">
              {topics.filter((t) => t.status !== "published").length}
            </span>
            <span className="text-xs font-medium text-slate-400">chờ duyệt</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Tổng từ khóa tra cứu</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-sky-600">{totalKeywords}</span>
            <span className="text-xs font-medium text-slate-400">từ khóa</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "published", label: "Đang hiển thị" },
              { key: "draft", label: "Bản nháp" },
              { key: "archived", label: "Lưu trữ" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === filter.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chủ đề, từ khóa..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 focus:bg-white"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <svg className="w-8 h-8 mx-auto mb-2 animate-spin text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Đang tải dữ liệu chủ đề...
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <p className="font-semibold text-slate-700">Chưa có chủ đề nào.</p>
            <p className="text-xs text-slate-500 mt-1">Bấm "Nạp chủ đề mặc định" hoặc "+ Thêm chủ đề mới" để bắt đầu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">Thứ tự</th>
                  <th className="py-3 px-4 w-12 text-center">Icon</th>
                  <th className="py-3 px-4">Tên chủ đề &amp; Mô tả</th>
                  <th className="py-3 px-4">Từ viết tắt</th>
                  <th className="py-3 px-4">Từ khóa nhận diện</th>
                  <th className="py-3 px-4 text-center">Tình huống</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTopics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                      {topic.displayOrder}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm mx-auto border border-sky-100 shadow-2xs">
                        <TopicIcon icon={topic.icon} className="w-4 h-4 text-sky-700" />
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 text-sm">{topic.name}</p>
                      {topic.detail && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{topic.detail}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {topic.abbreviations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {topic.abbreviations.map((abbr) => (
                            <span key={abbr} className="px-1.5 py-0.5 rounded bg-stone-100 text-slate-700 font-mono text-[10px] font-semibold uppercase">
                              {abbr}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {topic.keywords.slice(0, 3).map((kw) => (
                          <span key={kw} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                            {kw}
                          </span>
                        ))}
                        {topic.keywords.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                            +{topic.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                        {topic.situations.length} câu
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {topic.status === "published" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          Công khai
                        </span>
                      ) : topic.status === "draft" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-slate-600">
                          Bản nháp
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                          Lưu trữ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(topic)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(topic)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Topic Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  {editingId ? "CHỈNH SỬA THÔNG TIN" : "THÊM MỚI"}
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? `Chỉnh sửa: ${form.name}` : "Tạo chủ đề pháp luật mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-stone-100 hover:text-slate-700 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tên chủ đề *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Chuyên đề phòng chống ma túy, Giao thông..."
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-12 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Biểu tượng đại diện (React Icons / Fa6)</label>
                    <span className="text-[11px] text-slate-500 font-mono">Đang chọn: <span className="font-bold text-sky-700">{form.icon || "Mặc định"}</span></span>
                  </div>

                  {/* Live Preview Box & Custom Code Input */}
                  <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-center shrink-0 text-sky-600">
                      <TopicIcon icon={form.icon} className="w-6 h-6 text-sky-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-800">Xem trước biểu tượng</p>
                      <p className="text-[11px] text-slate-500">
                        Bấm vào biểu tượng bên dưới để chọn nhanh hoặc nhập mã FontAwesome 6 / ký tự vào ô bên phải.
                      </p>
                    </div>
                    <div className="w-48 shrink-0">
                      <input
                        type="text"
                        value={form.icon}
                        onChange={(e) => setForm({ ...form, icon: e.target.value })}
                        placeholder="Mã icon (vd: FaCapsules)"
                        className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 font-mono text-center font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Icon Picker Grid */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600">Chọn nhanh biểu tượng theo chủ đề:</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 max-h-44 overflow-y-auto p-2 bg-stone-50/60 rounded-xl border border-stone-200/80">
                      {POPULAR_TOPIC_ICONS.map((opt) => {
                        const isSelected = form.icon === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setForm({ ...form, icon: opt.key })}
                            title={`${opt.label} (${opt.key})`}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-400/30 shadow-2xs font-bold"
                                : "bg-white border-stone-200 text-slate-600 hover:border-slate-300 hover:bg-stone-50"
                            }`}
                          >
                            <TopicIcon icon={opt.key} className="w-5 h-5 mb-1" />
                            <span className="text-[10px] truncate max-w-full leading-tight">{opt.label.split("/")[0].trim()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={form.detail}
                    onChange={(e) => setForm({ ...form, detail: e.target.value })}
                    placeholder="VD: Xe điện & xe máy, Tác hại mạng xã hội..."
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 bg-white"
                  >
                    <option value="published">Công khai (Published)</option>
                    <option value="draft">Bản nháp (Draft)</option>
                    <option value="archived">Lưu trữ (Archived)</option>
                  </select>
                </div>

                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Từ viết tắt (ngăn cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={form.abbreviations}
                    onChange={(e) => setForm({ ...form, abbreviations: e.target.value })}
                    placeholder="VD: atgt, gtdb"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">Dùng để tra cứu nhanh khi người dùng gõ tắt.</p>
                </div>

                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Từ khóa nhận diện &amp; mở rộng (ngăn cách bằng dấu phẩy)
                  </label>
                  <textarea
                    rows={3}
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="VD: xe máy điện, mũ bảo hiểm, vượt đèn đỏ..."
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Câu hỏi tình huống mẫu gợi ý (mỗi dòng 1 câu hỏi)
                  </label>
                  <textarea
                    rows={4}
                    value={form.situations}
                    onChange={(e) => setForm({ ...form, situations: e.target.value })}
                    placeholder="Chưa đủ tuổi mà đi xe máy điện thì sao?&#10;Không đội mũ bảo hiểm bị phạt thế nào?"
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-400">Các câu hỏi này sẽ xuất hiện ở chip gợi ý trên trang chủ.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu..." : editingId ? "Cập nhật thay đổi" : "Tạo chủ đề"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
