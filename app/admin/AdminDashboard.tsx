"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  engagementCountKey,
  formatEngagementCount,
  parseEngagementCounts,
  toEngagementCountMap,
  type EngagementCount,
} from "@/lib/engagement";
import Link from "next/link";
import { contentTopics } from "@/lib/topics";
import { GameManager } from "./GameManager";
import { LinkHealthManager } from "./LinkHealthManager";
import { TopicManager } from "./TopicManager";
import { LegalDocumentManager } from "./LegalDocumentManager";
import { AccountManager } from "./AccountManager";
import { AuditLogManager } from "./AuditLogManager";

type Status = "draft" | "published";
type Entity = "law" | "showcase" | "candidate" | "game" | "link_health" | "topics" | "documents" | "accounts" | "audit_logs";
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
  mediaUrl: string;
  status: Status;
  updatedAt: string;
};
type ShowcaseRow = {
  id: number;
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  mediaUrl: string;
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

const emptyLaw = { topic: "Giao thông", icon: "§", title: "", legalBasis: "", penalty: "", remedy: "", caseStudy: "", tags: "", mediaUrl: "", status: "draft" as Status };
const emptyShowcase = { topic: "Mạng xã hội", title: "", summary: "", sourceUrl: "", mediaUrl: "", status: "draft" as Status };

type SessionActor = {
  username: string;
  principalId: string;
  role?: "admin" | "editor" | "viewer" | string;
  allowedTopics?: string[];
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Entity>("law");
  const [laws, setLaws] = useState<LawRow[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseRow[]>([]);
  const [sessionActor, setSessionActor] = useState<SessionActor | null>(null);
  const [lawForm, setLawForm] = useState(emptyLaw);
  const [showcaseForm, setShowcaseForm] = useState(emptyShowcase);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [engagement, setEngagement] = useState<
    ReadonlyMap<string, EngagementCount>
  >(() => new Map());

  const loadContent = useCallback(async () => {
    const response = await fetch("/admin/api/content", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/admin/login");
      return;
    }
    const body = (await response.json()) as {
      laws?: LawRow[];
      showcases?: ShowcaseRow[];
      actor?: SessionActor;
      error?: string;
    };
    if (!response.ok) throw new Error(body.error ?? "Không thể tải dữ liệu.");
    setLaws(body.laws ?? []);
    setShowcases(body.showcases ?? []);
    if (body.actor) setSessionActor(body.actor);
  }, []);

  useEffect(() => {
    fetch("/admin/api/content", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/admin/login");
          return null;
        }
        const body = (await response.json()) as {
          laws?: LawRow[];
          showcases?: ShowcaseRow[];
          actor?: SessionActor;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Không thể tải dữ liệu.");
        return body;
      })
      .then((body) => {
        if (!body) return;
        setLaws(body.laws ?? []);
        setShowcases(body.showcases ?? []);
        if (body.actor) setSessionActor(body.actor);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("admin_engagement_cache");
    if (!raw) return;
    try {
      const counts = parseEngagementCounts(JSON.parse(raw));
      if (counts) setEngagement(toEngagementCountMap(counts));
    } catch {
      // cache corrupted
    }
  }, []);

  useEffect(() => {
    fetch("/api/engagement", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const counts = parseEngagementCounts(data);
        if (counts) {
          sessionStorage.setItem("admin_engagement_cache", JSON.stringify(counts));
          setEngagement(toEngagementCountMap(counts));
        }
      })
      .catch(() => {
        // non-blocking
      });
  }, []);

  function engagementLabel(entityType: "law" | "showcase", entityId: number): string {
    const key = engagementCountKey(entityType, entityId);
    const count = engagement.get(key);
    if (!count || count.viewCount === 0) return "Chưa có lượt xem";
    return `${formatEngagementCount(count.viewCount)} lượt xem · ${formatEngagementCount(count.favoriteCount)} thích`;
  }

  const isAdmin = !sessionActor?.role || sessionActor.role === "admin";
  const isEditor = sessionActor?.role === "editor";
  const isViewer = sessionActor?.role === "viewer";
  const isReadOnly = isViewer;

  const accessibleTopics: string[] = useMemo(() => {
    if (isAdmin) return contentTopics.map((t) => t.name as string);
    const allowed = Array.isArray(sessionActor?.allowedTopics) ? sessionActor.allowedTopics : [];
    if (allowed.includes("*")) return contentTopics.map((t) => t.name as string);
    return contentTopics.map((t) => t.name as string).filter((name) => allowed.includes(name));
  }, [isAdmin, sessionActor]);

  const visibleLaws: LawRow[] = useMemo(() => {
    return laws.filter((l) => accessibleTopics.includes(l.topic));
  }, [laws, accessibleTopics]);

  const visibleShowcases: ShowcaseRow[] = useMemo(() => {
    return showcases.filter((s) => accessibleTopics.includes(s.topic));
  }, [showcases, accessibleTopics]);

  useEffect(() => {
    if (accessibleTopics.length > 0) {
      if (!accessibleTopics.includes(lawForm.topic)) {
        setLawForm((prev) => ({ ...prev, topic: accessibleTopics[0] }));
      }
      if (!accessibleTopics.includes(showcaseForm.topic)) {
        setShowcaseForm((prev) => ({ ...prev, topic: accessibleTopics[0] }));
      }
    }
  }, [accessibleTopics]);

  useEffect(() => {
    if (sessionActor && !isAdmin) {
      const adminOnlyTabs: Entity[] = ["candidate", "game", "link_health", "topics", "accounts", "audit_logs"];
      if (adminOnlyTabs.includes(tab)) {
        setTab("law");
      }
    }
  }, [sessionActor, isAdmin, tab]);

  function resetForm() {
    const defaultTopic = accessibleTopics[0] ?? contentTopics[0].name;
    setEditingId(null);
    setLawForm({ ...emptyLaw, topic: defaultTopic });
    setShowcaseForm({ ...emptyShowcase, topic: defaultTopic });
    setError("");
    setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (isReadOnly) {
      setError("Tài khoản chỉ có quyền xem, không thể thay đổi dữ liệu.");
      return;
    }

    const currentTopic = tab === "law" ? lawForm.topic : showcaseForm.topic;
    if (!accessibleTopics.includes(currentTopic)) {
      setError("Bạn không có quyền thao tác trên chuyên mục này.");
      return;
    }

    const isLaw = tab === "law";
    const payload = isLaw
      ? {
          entity: "law",
          id: editingId ?? undefined,
          ...lawForm,
          tags: JSON.stringify(lawForm.tags.split(",").map((item) => item.trim()).filter(Boolean)),
        }
      : {
          entity: "showcase",
          id: editingId ?? undefined,
          ...showcaseForm,
        };

    const response = await fetch("/admin/api/content", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Thao tác thất bại.");
      return;
    }
    setNotice(editingId ? "Đã cập nhật nội dung." : "Đã thêm nội dung mới.");
    resetForm();
    await loadContent();
  }

  async function remove(entity: "law" | "showcase", id: number) {
    if (isReadOnly) {
      setError("Tài khoản chỉ có quyền xem, không thể xóa dữ liệu.");
      return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục này?")) return;
    setError("");
    setNotice("");
    const response = await fetch(`/admin/api/content?entity=${entity}&id=${id}`, { method: "DELETE" });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Không thể xóa nội dung.");
      return;
    }
    setNotice("Đã xóa mục thành công.");
    if (editingId === id) resetForm();
    await loadContent();
  }

  function editLaw(item: LawRow) {
    setTab("law");
    setEditingId(item.id);
    setLawForm({
      ...item,
      tags: JSON.parse(item.tags || "[]").join(", "),
      mediaUrl: item.mediaUrl ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editShowcase(item: ShowcaseRow) {
    setTab("showcase");
    setEditingId(item.id);
    setShowcaseForm({
      topic: item.topic,
      title: item.title,
      summary: item.summary,
      sourceUrl: item.sourceUrl ?? "",
      mediaUrl: item.mediaUrl ?? "",
      status: item.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    await fetch("/admin/api/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  const publishedCount =
    visibleLaws.filter((item) => item.status === "published").length +
    visibleShowcases.filter((item) => item.status === "published").length;

  const tabTitleMap: Record<Entity, string> = {
    law: "Điều luật & mức phạt",
    showcase: "Case study & Tình huống",
    candidate: "Bản nháp từ AI",
    game: "Rèn luyện & huy hiệu",
    link_health: "Liên kết & Tên miền",
    topics: "Chủ đề & Lĩnh vực",
    documents: "Kho văn bản pháp luật",
    accounts: "Tài khoản & Phân quyền",
    audit_logs: "Lịch sử hệ thống",
  };

  return (
    <div className="flex w-full h-full overflow-hidden text-slate-800 antialiased font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* BEGIN: LeftSidebarNavigation */}
      <aside
        className={`w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-40 shadow-sm transition-transform duration-200 lg:static fixed inset-y-0 left-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-purpose="left-navigation"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center font-bold text-black text-xl shadow-sm">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
                  TRỢ GIÚP PHÁP LÝ
                </span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  HSSV
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Hệ thống quản trị số
              </span>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu Items */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3.5 space-y-6">
          {/* Group 1: Tổng quan */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tổng quan
            </p>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setTab("law");
                  resetForm();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                  tab === "law" && !editingId
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span>Bảng tin chung</span>
              </button>
            </nav>
          </div>

          {/* Group 2: Quản lý nội dung */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                Quản lý nội dung
              </p>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            </div>
            <nav className="space-y-1">
              {/* Level 1: Điều luật & mức phạt */}
              <button
                type="button"
                onClick={() => {
                  setTab("law");
                  resetForm();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                  tab === "law"
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 ${tab === "law" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Điều luật &amp; mức phạt</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {visibleLaws.length}
                </span>
              </button>

              {/* Level 1: Case study & Tình huống */}
              <button
                type="button"
                onClick={() => {
                  setTab("showcase");
                  resetForm();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                  tab === "showcase"
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 ${tab === "showcase" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Case study &amp; Tình huống</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {visibleShowcases.length}
                </span>
              </button>

              {/* ITEM: Kho văn bản pháp luật */}
              <button
                type="button"
                onClick={() => {
                  setTab("documents");
                  resetForm();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-colors text-left ${
                  tab === "documents"
                    ? "bg-sky-50 text-sky-700 border-l-4 border-sky-600 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <svg className={`w-4 h-4 ${tab === "documents" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Kho văn bản pháp luật</span>
              </button>

              {isAdmin && (
                <>
                  {/* Level 1: Bản nháp từ AI */}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("candidate");
                      resetForm();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                      tab === "candidate"
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <span>Bản nháp từ AI</span>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase">
                      Mới
                    </span>
                  </button>

                  {/* Level 1: Rèn luyện & huy hiệu */}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("game");
                      resetForm();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                      tab === "game"
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <svg className={`w-4 h-4 ${tab === "game" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Rèn luyện &amp; huy hiệu</span>
                  </button>

                  {/* ACTIVE ITEM: Liên kết & Tên miền with Level 3 Sub-menu */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTab("link_health");
                        resetForm();
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition-all text-left ${
                        tab === "link_health"
                          ? "bg-sky-50 text-sky-700 border-l-4 border-sky-600 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className={`w-4 h-4 ${tab === "link_health" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                        <span>Liên kết &amp; Tên miền</span>
                      </div>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${tab === "link_health" ? "rotate-90 text-sky-600" : "text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>

                    {/* Level 3 Nested Submenu items */}
                    {tab === "link_health" && (
                      <div className="ml-6 pl-3 border-l-2 border-slate-200 mt-1.5 space-y-1">
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-sky-700 bg-sky-100/60 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                          <span>Danh sách liên kết</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 rounded transition-colors cursor-default">
                          <span className="w-1.5 h-1.5 rounded-full bg-transparent"></span>
                          <span>Cấu hình tên miền</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 rounded transition-colors cursor-default">
                          <span className="w-1.5 h-1.5 rounded-full bg-transparent"></span>
                          <span>Lịch sử quét hệ thống</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ITEM: Chủ đề & Lĩnh vực */}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("topics");
                      resetForm();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-colors text-left ${
                      tab === "topics"
                        ? "bg-sky-50 text-sky-700 border-l-4 border-sky-600 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <svg className={`w-4 h-4 ${tab === "topics" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                    <span>Chủ đề &amp; Lĩnh vực</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Group 3: Người dùng & Phân quyền (Chỉ quản trị viên) */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Người dùng &amp; Phân quyền
              </p>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("accounts");
                    resetForm();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    tab === "accounts"
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <svg className={`w-4 h-4 ${tab === "accounts" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Phân quyền &amp; Tài khoản</span>
                </button>
              </nav>
            </div>
          )}

          {/* Group 4: Hệ thống (Chỉ quản trị viên) */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Hệ thống
              </p>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("audit_logs");
                    resetForm();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    tab === "audit_logs"
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <svg className={`w-4 h-4 ${tab === "audit_logs" ? "text-sky-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                  <span>Lịch sử hệ thống</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer with User Profile and Logout */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {sessionActor?.username ? sessionActor.username.slice(0, 2).toUpperCase() : "QTV"}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">
                  @{sessionActor?.username || "admin"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {isAdmin
                    ? "Toàn quyền hệ thống"
                    : isEditor
                    ? `Biên tập viên (${accessibleTopics.length} CĐ)`
                    : `Người xem (${accessibleTopics.length} CĐ)`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>
          </div>
        </div>
      </aside>
      {/* END: LeftSidebarNavigation */}

      {/* BEGIN: MainContentWrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* BEGIN: TopHeader */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 z-10 flex-shrink-0" data-purpose="top-header">
          {/* Breadcrumb & mobile toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium hover:text-slate-800 cursor-pointer hidden sm:inline">
                Bảng điều khiển
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span className="font-medium hover:text-slate-800 cursor-pointer">
                Quản lý kho nội dung
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {tabTitleMap[tab]}
              </span>
            </nav>
          </div>

          {/* Header Global Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Website Button */}
            <Link
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition"
              href="/"
              target="_blank"
            >
              <span>Xem website</span>
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </Link>

            {/* Notifications button */}
            <button
              type="button"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Thông báo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>
        {/* END: TopHeader */}

        {/* BEGIN: DashboardBodyArea */}
        <main className="flex-1 overflow-y-auto custom-scroll bg-[#FBF9F5] p-6 lg:p-8 space-y-6" data-purpose="main-content">
          {/* Top Title & Global Counter Summary */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                BẢNG ĐIỀU KHIỂN
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Quản lý kho nội dung
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Nội dung chỉ xuất hiện công khai sau khi chuyển sang trạng thái{" "}
                <span className="font-medium text-slate-700">"Đã xuất bản"</span>.
              </p>
            </div>

            {/* 3 Header Metric Cards */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="bg-white border border-stone-200 rounded-xl px-4 sm:px-5 py-3 text-center shadow-xs min-w-[95px] sm:min-w-[105px]">
                <span className="text-2xl font-black text-slate-800 block">{visibleLaws.length}</span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Điều luật</span>
              </div>
              <div className="bg-white border border-stone-200 rounded-xl px-4 sm:px-5 py-3 text-center shadow-xs min-w-[95px] sm:min-w-[105px]">
                <span className="text-2xl font-black text-slate-800 block">{visibleShowcases.length}</span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Tình huống</span>
              </div>
              <div className="bg-white border border-stone-200 rounded-xl px-4 sm:px-5 py-3 text-center shadow-xs min-w-[95px] sm:min-w-[105px]">
                <span className="text-2xl font-black text-slate-800 block">{publishedCount}</span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Đã xuất bản</span>
              </div>
            </div>
          </section>

          {/* Sub Navigation Pills */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm font-medium" aria-label="Loại nội dung">
            <button
              type="button"
              onClick={() => { setTab("law"); resetForm(); }}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                tab === "law"
                  ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                  : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
              }`}
            >
              Điều luật &amp; mức phạt
            </button>
            <button
              type="button"
              onClick={() => { setTab("showcase"); resetForm(); }}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                tab === "showcase"
                  ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                  : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
              }`}
            >
              Case study
            </button>
            <button
              type="button"
              onClick={() => { setTab("documents"); resetForm(); }}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                tab === "documents"
                  ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                  : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
              }`}
            >
              Kho văn bản pháp luật
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => { setTab("candidate"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "candidate"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Bản nháp từ AI
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("game"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "game"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Rèn luyện &amp; huy hiệu
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("link_health"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "link_health"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Liên kết &amp; Tên miền
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("topics"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "topics"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Chủ đề &amp; Lĩnh vực
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("accounts"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "accounts"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Tài khoản &amp; Phân quyền
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("audit_logs"); resetForm(); }}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    tab === "audit_logs"
                      ? "bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-2xs"
                  }`}
                >
                  Lịch sử hệ thống
                </button>
              </>
            )}
          </nav>

          {/* Active Tab Content Rendering */}
          {tab === "candidate" && isAdmin ? (
            <CandidatePanel />
          ) : tab === "game" && isAdmin ? (
            <GameManager />
          ) : tab === "link_health" && isAdmin ? (
            <LinkHealthManager />
          ) : tab === "topics" && isAdmin ? (
            <TopicManager />
          ) : tab === "documents" ? (
            <LegalDocumentManager />
          ) : tab === "accounts" && isAdmin ? (
            <AccountManager />
          ) : tab === "audit_logs" && isAdmin ? (
            <AuditLogManager />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Editor Card */}
              {isReadOnly ? (
                <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CHẾ ĐỘ XEM</p>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">Quyền Người xem (Viewer)</h2>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs space-y-2">
                    <p className="font-semibold">Tài khoản chỉ có quyền đọc dữ liệu.</p>
                    <p className="text-amber-700 leading-relaxed">
                      Bạn có thể tra cứu và xem toàn bộ nội dung trong các chuyên mục được cấp phép. Để thêm mới hoặc chỉnh sửa dữ liệu, vui lòng liên hệ Quản trị viên để được cấp quyền Biên tập viên.
                    </p>
                  </div>
                </div>
              ) : accessibleTopics.length === 0 ? (
                <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">CHƯA PHÂN QUYỀN</p>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">Không có chuyên mục</h2>
                    </div>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-2">
                    <p className="font-semibold">Bạn chưa được phân quyền phụ trách bất kỳ chuyên mục nào.</p>
                    <p className="text-rose-700 leading-relaxed">
                      Vui lòng liên hệ Quản trị viên hệ thống để gán các chuyên mục phù hợp cho tài khoản của bạn.
                    </p>
                  </div>
                </div>
              ) : (
                <form className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4" onSubmit={save}>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                        {editingId ? "CHỈNH SỬA NỘI DUNG" : "THÊM NỘI DUNG MỚI"}
                      </p>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {tab === "law" ? "Nội dung pháp luật" : "Tình huống cảnh báo"}
                      </h2>
                    </div>
                    {editingId && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md"
                        onClick={resetForm}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Lĩnh vực</label>
                      <select
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                        value={tab === "law" ? lawForm.topic : showcaseForm.topic}
                        onChange={(event) =>
                          tab === "law"
                            ? setLawForm({ ...lawForm, topic: event.target.value })
                            : setShowcaseForm({ ...showcaseForm, topic: event.target.value })
                        }
                      >
                        {accessibleTopics.map((topicName) => (
                          <option key={topicName} value={topicName}>{topicName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Trạng thái</label>
                      <select
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                        value={tab === "law" ? lawForm.status : showcaseForm.status}
                        onChange={(event) =>
                          tab === "law"
                            ? setLawForm({ ...lawForm, status: event.target.value as Status })
                            : setShowcaseForm({ ...showcaseForm, status: event.target.value as Status })
                        }
                      >
                        <option value="draft">Bản nháp</option>
                        <option value="published">Đã xuất bản</option>
                      </select>
                    </div>
                  </div>

                  {tab === "law" ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Icon</label>
                          <input
                            maxLength={8}
                            className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                            value={lawForm.icon}
                            onChange={(event) => setLawForm({ ...lawForm, icon: event.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Tiêu đề</label>
                          <input
                            required
                            className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                            value={lawForm.title}
                            onChange={(event) => setLawForm({ ...lawForm, title: event.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Căn cứ pháp lý</label>
                        <input
                          required
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.legalBasis}
                          onChange={(event) => setLawForm({ ...lawForm, legalBasis: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Mức phạt</label>
                        <input
                          required
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.penalty}
                          onChange={(event) => setLawForm({ ...lawForm, penalty: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Biện pháp khắc phục</label>
                        <textarea
                          required
                          rows={3}
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.remedy}
                          onChange={(event) => setLawForm({ ...lawForm, remedy: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Tình huống minh họa</label>
                        <textarea
                          required
                          rows={4}
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.caseStudy}
                          onChange={(event) => setLawForm({ ...lawForm, caseStudy: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Thẻ (cách nhau dấu phẩy)</label>
                        <input
                          placeholder="giao-thong, mu-bao-hiem"
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.tags}
                          onChange={(event) => setLawForm({ ...lawForm, tags: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Ảnh / Video minh họa (nếu có)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={lawForm.mediaUrl}
                          onChange={(event) => setLawForm({ ...lawForm, mediaUrl: event.target.value })}
                        />
                        <span className="text-[11px] text-slate-400 block mt-1">Link YouTube hoặc ảnh .jpg/.png/.webp.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Tiêu đề</label>
                        <input
                          required
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={showcaseForm.title}
                          onChange={(event) => setShowcaseForm({ ...showcaseForm, title: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Nội dung tình huống</label>
                        <textarea
                          required
                          rows={6}
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={showcaseForm.summary}
                          onChange={(event) => setShowcaseForm({ ...showcaseForm, summary: event.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">URL nguồn chính thức</label>
                        <input
                          type="url"
                          placeholder="https://vbpl.vn/..."
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={showcaseForm.sourceUrl}
                          onChange={(event) => setShowcaseForm({ ...showcaseForm, sourceUrl: event.target.value })}
                        />
                        <span className="text-[11px] text-slate-400 block mt-1">Chỉ nhận vbpl.vn, chinhphu.vn...</span>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Ảnh / Video minh họa (nếu có)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          className="w-full border border-stone-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                          value={showcaseForm.mediaUrl}
                          onChange={(event) => setShowcaseForm({ ...showcaseForm, mediaUrl: event.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">{error}</div>}
                  {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium">{notice}</div>}

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    {editingId ? "Lưu thay đổi" : "Tạo nội dung"}
                  </button>
                </form>
              )}

              {/* Content List Card */}
              <section className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KHO NỘI DUNG</p>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      {tab === "law" ? `${visibleLaws.length} điều luật` : `${visibleShowcases.length} tình huống`}
                    </h2>
                  </div>
                </div>

                {isLoading ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Đang tải dữ liệu…</p>
                ) : tab === "law" ? (
                  visibleLaws.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
                      <p className="text-xs text-slate-500">Chưa có nội dung điều luật.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleLaws.map((item) => (
                        <article key={item.id} className="p-4 rounded-xl border border-stone-200 hover:border-slate-300 transition bg-white space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.topic}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                          <p className="text-[11px] text-slate-400">{engagementLabel("law", item.id)}</p>
                          <p className="text-xs text-slate-600 line-clamp-2">{item.legalBasis}</p>
                          {!isReadOnly && (
                            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => editLaw(item)}
                                className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs"
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove("law", item.id)}
                                className="px-3 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 shadow-2xs"
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )
                ) : (
                  visibleShowcases.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
                      <p className="text-xs text-slate-500">Chưa có nội dung tình huống.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleShowcases.map((item) => (
                        <article key={item.id} className="p-4 rounded-xl border border-stone-200 hover:border-slate-300 transition bg-white space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.topic}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                          <p className="text-[11px] text-slate-400">{engagementLabel("showcase", item.id)}</p>
                          <p className="text-xs text-slate-600 line-clamp-3">{item.summary}</p>
                          {!isReadOnly && (
                            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => editShowcase(item)}
                                className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs"
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove("showcase", item.id)}
                                className="px-3 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 shadow-2xs"
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )
                )}
              </section>
            </div>
          )}
        </main>
        {/* END: DashboardBodyArea */}
      </div>
      {/* END: MainContentWrapper */}
    </div>
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
    <section className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">QUY TRÌNH BỐN MẮT</p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">{candidates.length} bản nháp từ tra cứu AI</h2>
        <p className="text-xs text-slate-500 mt-1">
          Đang đăng nhập: <span className="font-mono text-slate-700">{principalId || "chưa gắn principal"}</span> — Quyền: <span className="font-semibold text-slate-700">{roles.join(", ") || "không có"}</span>
        </p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium">{notice}</div>}

      {editing && draft && (
        <form className="p-6 rounded-xl border border-stone-200 bg-stone-50 space-y-4" onSubmit={saveRevision}>
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Tạo revision kiểm duyệt</h3>
            <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setEditing(null)}>
              Hủy
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Lĩnh vực</label>
              <select
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white"
                value={draft.topic}
                onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
              >
                {contentTopics.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tiêu đề</label>
              <input
                required
                className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Câu trả lời đã biên tập</label>
            <textarea
              rows={8}
              required
              className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white"
              value={draft.answer}
              onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Tags (cách nhau dấu phẩy)</label>
            <input
              className="w-full border border-stone-300 rounded-lg p-2 text-xs bg-white"
              value={draft.tags.join(", ")}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                })
              }
            />
          </div>

          {draft.citations.map((citation, index) => (
            <fieldset className="p-4 rounded-lg border border-stone-300 bg-white space-y-3" key={citation.url}>
              <legend className="text-xs font-bold text-slate-700 px-2">Nguồn {index + 1}</legend>
              <a href={citation.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-600 hover:underline break-all">
                {citation.title}
              </a>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Số hiệu văn bản</label>
                  <input
                    required
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.documentNumber}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, documentNumber: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày ban hành</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.issuedAt ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, issuedAt: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày hiệu lực</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.effectiveFrom}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, effectiveFrom: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày hết hiệu lực</label>
                  <input
                    type="date"
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.effectiveTo ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, effectiveTo: event.target.value || undefined } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ngày kiểm chứng</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.lastVerifiedAt}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, lastVerifiedAt: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Điều</label>
                  <input
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={citation.article ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, article: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Khoản / Điểm</label>
                  <input
                    className="w-full border border-stone-300 rounded p-1.5 text-xs"
                    value={[citation.clause, citation.point].filter(Boolean).join(" / ")}
                    onChange={(event) => {
                      const [clause, point] = event.target.value.split("/").map((value) => value.trim());
                      setDraft({
                        ...draft,
                        citations: draft.citations.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, clause, point } : item,
                        ),
                      });
                    }}
                  />
                </div>
              </div>
            </fieldset>
          ))}

          <button type="submit" className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition shadow-xs">
            Lưu revision
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 py-8 text-center">Đang tải…</p>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <article key={candidate.id} className="p-5 rounded-xl border border-stone-200 bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  candidate.status === "published"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : candidate.status === "pending_review"
                    ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {candidate.status}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {candidate.providerModel} · {candidate.totalTokens ?? "?"} tokens
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {candidate.snapshot?.title || "Bản nháp chưa được biên tập"}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3">
                {candidate.snapshot?.answer || candidate.initialAnswer}
              </p>
              {candidate.reviewReason && (
                <p className="text-xs text-rose-600 font-medium">
                  <strong>Lý do từ chối:</strong> {candidate.reviewReason}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                {canEdit && (candidate.status === "draft" || candidate.status === "rejected") && (
                  <button
                    type="button"
                    onClick={() => startEdit(candidate)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs"
                  >
                    Biên tập
                  </button>
                )}
                {canEdit && candidate.status === "draft" && candidate.snapshot && candidate.editorPrincipalId === principalId && (
                  <button
                    type="button"
                    onClick={() => void action(candidate, "submit")}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 shadow-2xs"
                  >
                    Gửi duyệt
                  </button>
                )}
                {canReview && candidate.status === "pending_review" && candidate.editorPrincipalId !== principalId && (
                  <button
                    type="button"
                    onClick={() => void action(candidate, "approve")}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 shadow-2xs"
                  >
                    Duyệt &amp; đưa vào RAG
                  </button>
                )}
                {canReview && candidate.status === "pending_review" && candidate.editorPrincipalId !== principalId && (
                  <button
                    type="button"
                    onClick={() => void action(candidate, "reject")}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 shadow-2xs"
                  >
                    Từ chối
                  </button>
                )}
                {canReview && candidate.status === "published" && (
                  <button
                    type="button"
                    onClick={() => void action(candidate, "archive")}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 shadow-2xs"
                  >
                    Lưu trữ
                  </button>
                )}
              </div>

              <details className="text-xs text-slate-500 pt-1">
                <summary className="cursor-pointer font-medium hover:text-slate-700">
                  Lịch sử ({candidate.history.length})
                </summary>
                <ul className="mt-2 space-y-1 pl-4 list-disc">
                  {candidate.history.map((event, index) => (
                    <li key={`${event.action}-${event.occurredAt}-${index}`}>
                      {event.occurredAt}: {event.action} — {event.actorPrincipalId ?? "system"}
                      {event.reason ? ` (${event.reason})` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}

      {!loading && candidates.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
          <strong className="text-xs font-bold text-slate-700 block">Chưa có candidate</strong>
          <p className="text-xs text-slate-500 mt-1">
            Kết quả web-search thành công sẽ xuất hiện ở đây dưới dạng bản nháp.
          </p>
        </div>
      )}
    </section>
  );
}
