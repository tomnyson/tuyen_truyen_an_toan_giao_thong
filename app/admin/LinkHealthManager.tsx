"use client";

import { useEffect, useState, useMemo } from "react";
import type { DomainHealthResult } from "@/lib/canonical-url";
import type { LinkHealthItem, LinkHealthSummary } from "@/lib/link-health";

type FilterStatus = "all" | "broken" | "redirect" | "ok";

export function LinkHealthManager() {
  const [domain, setDomain] = useState<DomainHealthResult | null>(null);
  const [summary, setSummary] = useState<LinkHealthSummary | null>(null);
  const [links, setLinks] = useState<LinkHealthItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/admin/api/link-health", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            window.location.assign("/admin/login");
            return null;
          }
          throw new Error("Không thể tải thông tin liên kết.");
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        setDomain(data.domain);
        setSummary(data.summary);
        setLinks(data.links ?? []);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleScanAll() {
    try {
      setIsScanning(true);
      setError("");
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan_all" }),
      });
      if (!res.ok) throw new Error("Quét liên kết thất bại.");
      const data = await res.json();
      setSummary(data.summary);
      setLinks(data.links ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi quét liên kết.");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleVerifyDomain() {
    try {
      setIsCheckingDomain(true);
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_domain" }),
      });
      if (!res.ok) throw new Error("Kiểm tra tên miền thất bại.");
      const data = await res.json();
      setDomain(data.domain);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra tên miền.");
    } finally {
      setIsCheckingDomain(false);
    }
  }

  async function handleCheckSingle(url: string) {
    try {
      setCheckingUrl(url);
      const res = await fetch("/admin/api/link-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_single", url }),
      });
      if (!res.ok) throw new Error("Kiểm tra link thất bại.");
      const data = await res.json();
      setLinks(data.links ?? []);
      setSummary(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra liên kết.");
    } finally {
      setCheckingUrl(null);
    }
  }

  const filteredLinks = useMemo(() => {
    return links.filter((item) => {
      if (filter === "broken") {
        const isBroken = ["broken", "blocked_ssrf", "ssl_error", "network_error"].includes(item.lastStatus);
        if (!isBroken) return false;
      } else if (filter === "redirect") {
        if (item.lastStatus !== "redirect") return false;
      } else if (filter === "ok") {
        if (item.lastStatus !== "ok") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.url.toLowerCase().includes(q) || item.sourceTitle.toLowerCase().includes(q);
      }

      return true;
    });
  }, [links, filter, searchQuery]);

  function getSourceTypeLabel(type: string) {
    switch (type) {
      case "static_baseline":
        return "Nội dung nền (Giao thông)";
      case "legal_source":
        return "Nguồn văn bản pháp luật";
      case "showcase_source":
        return "Nguồn tình huống (Showcase)";
      case "showcase_media":
        return "Media minh họa (Ảnh/Video)";
      case "authority":
        return "Đầu mối trợ giúp";
      default:
        return type;
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-800">✕</button>
        </div>
      )}

      {/* Domain & Permanent Path Configuration Card */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs" data-purpose="domain-config-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              Tên miền &amp; Đường dẫn cố định
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cấp tên miền/đường dẫn sử dụng lâu dài, tránh phải cấp lại link mới định kỳ khi in ấn tài liệu hoặc tạo mã QR cho học sinh.
            </p>
          </div>
          <button
            type="button"
            onClick={handleVerifyDomain}
            disabled={isCheckingDomain}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {isCheckingDomain ? "Đang kiểm tra…" : "Kiểm tra kết nối tên miền"}
          </button>
        </div>

        {/* Configuration parameter row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TÊN MIỀN CẤU HÌNH:</span>
            <p className="text-sm font-mono font-medium text-slate-800 mt-1 break-all">
              {domain?.configuredUrl || "Chưa cấu hình (đang dùng fallback origin trình duyệt)"}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TRẠNG THÁI:</span>
            {domain?.isConfigured ? (
              <p className={`text-sm font-medium flex items-center gap-1.5 mt-1 ${domain.reachable ? "text-emerald-600" : "text-rose-600"}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${domain.reachable ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                {domain.reachable ? "Đang hoạt động" : "Không thể kết nối"}
              </p>
            ) : (
              <p className="text-sm font-medium text-amber-600 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                Chưa đặt NEXT_PUBLIC_SITE_URL
              </p>
            )}
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">BẢO MẬT HTTPS:</span>
            <p className="text-sm font-medium text-slate-700 mt-1">
              {domain?.isHttps ? "Bảo mật (HTTPS)" : "Chưa bảo mật (HTTP)"}
            </p>
          </div>
        </div>

        {/* Warning Notice */}
        {(!domain?.isConfigured || !domain?.reachable || !domain?.isHttps || domain?.error) && (
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-rose-600 font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>{domain?.error || "Tên miền chưa được cấu hình hoặc sai định dạng URL."}</span>
          </div>
        )}
      </section>

      {/* 4 Link Status Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="metric-cards">
        <div className="bg-white p-5 rounded-xl border border-stone-200 text-center shadow-xs">
          <p className="text-3xl font-extrabold text-slate-900">{summary?.total ?? links.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Tổng liên kết</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 text-center shadow-xs">
          <p className="text-3xl font-extrabold text-emerald-600">{summary?.ok ?? 0}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Hoạt động tốt (200)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 text-center shadow-xs">
          <p className="text-3xl font-extrabold text-amber-500">{summary?.redirect ?? 0}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Chuyển hướng (301/302)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 text-center shadow-xs">
          <p className="text-3xl font-extrabold text-rose-600">{summary?.broken ?? 0}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Hết hạn / Lỗi (404/5xx)</p>
        </div>
      </section>

      {/* Search & Filters Toolbar */}
      <section className="space-y-3" data-purpose="link-filter-toolbar">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-xs outline-none"
            placeholder="Tìm theo URL hoặc tên mục..."
          />
        </div>

        {/* Filter tabs and action button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === "all"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white border border-stone-300 text-slate-700 hover:bg-stone-50"
              }`}
            >
              Tất cả ({links.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("broken")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === "broken"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white border border-stone-300 text-slate-700 hover:bg-stone-50"
              }`}
            >
              Lỗi / Hết hạn ({summary?.broken ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFilter("redirect")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === "redirect"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white border border-stone-300 text-slate-700 hover:bg-stone-50"
              }`}
            >
              Chuyển hướng ({summary?.redirect ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFilter("ok")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === "ok"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white border border-stone-300 text-slate-700 hover:bg-stone-50"
              }`}
            >
              Hoạt động ({summary?.ok ?? 0})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={handleScanAll}
              disabled={isScanning || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>{isScanning ? "Đang quét toàn bộ…" : "Quét toàn bộ liên kết ngay"}</span>
            </button>
          </div>
        </div>

        {/* Scan timestamp info */}
        {summary?.lastScannedAt && (
          <p className="text-xs text-slate-400">
            Lần quét gần nhất:{" "}
            <span className="text-slate-600 font-mono">
              {new Date(summary.lastScannedAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              {new Date(summary.lastScannedAt).toLocaleDateString("vi-VN")}
            </span>
          </p>
        )}
      </section>

      {/* Data Table of Links */}
      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs" data-purpose="links-data-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-36" scope="col">Trạng thái</th>
                <th className="py-3.5 px-4" scope="col">Địa chỉ liên kết (URL)</th>
                <th className="py-3.5 px-4" scope="col">Vị trí / Nguồn</th>
                <th className="py-3.5 px-4 w-28" scope="col">Phản hồi</th>
                <th className="py-3.5 px-4 w-32 text-right" scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Đang tải dữ liệu liên kết…
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Không tìm thấy liên kết phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((item) => {
                  const isBroken = ["broken", "blocked_ssrf", "ssl_error", "network_error"].includes(item.lastStatus);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Trạng thái */}
                      <td className="py-4 px-4 align-top">
                        {item.lastStatus === "ok" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Hoạt động tốt
                          </span>
                        ) : item.lastStatus === "redirect" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                            Chuyển hướng {item.statusCode ? `(${item.statusCode})` : ""}
                          </span>
                        ) : isBroken ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                            Hỏng / Hết hạn
                          </span>
                        ) : item.lastStatus === "timeout" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Quá giờ chờ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            Chưa kiểm tra
                          </span>
                        )}
                      </td>

                      {/* Địa chỉ URL */}
                      <td className="py-4 px-4 align-top max-w-md">
                        <a
                          className="text-sky-600 hover:text-sky-800 hover:underline font-medium break-all flex items-center gap-1"
                          href={item.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span>{item.url}</span>
                          <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </a>
                        {item.redirectUrl && (
                          <p className="text-[11px] text-amber-600 font-mono mt-1">
                            ↳ Chuyển hướng đến: {item.redirectUrl}
                          </p>
                        )}
                        {item.error && (
                          <p className="text-[11px] text-rose-500 font-mono mt-1">
                            {item.error}
                          </p>
                        )}
                      </td>

                      {/* Vị trí / Nguồn */}
                      <td className="py-4 px-4 align-top">
                        <p className="text-xs font-semibold text-slate-800">{item.sourceTitle}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{getSourceTypeLabel(item.sourceType)}</p>
                      </td>

                      {/* Phản hồi */}
                      <td className="py-4 px-4 align-top text-slate-500 font-mono">
                        {item.responseTimeMs ? `${item.responseTimeMs}ms` : "—"}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCheckSingle(item.url)}
                          disabled={checkingUrl === item.url || isScanning}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {checkingUrl === item.url ? "Đang ktra…" : "Kiểm tra lại"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
