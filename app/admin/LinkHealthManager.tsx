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
      // Lọc theo trạng thái
      if (filter === "broken") {
        const isBroken = ["broken", "blocked_ssrf", "ssl_error", "network_error"].includes(item.lastStatus);
        if (!isBroken) return false;
      } else if (filter === "redirect") {
        if (item.lastStatus !== "redirect") return false;
      } else if (filter === "ok") {
        if (item.lastStatus !== "ok") return false;
      }

      // Lọc theo tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.url.toLowerCase().includes(q) || item.sourceTitle.toLowerCase().includes(q);
      }

      return true;
    });
  }, [links, filter, searchQuery]);

  function getStatusBadge(status: string, statusCode?: number) {
    switch (status) {
      case "ok":
        return <span className="link-badge link-badge-ok">200 OK</span>;
      case "redirect":
        return <span className="link-badge link-badge-warn">{statusCode ?? "301"} Chuyển hướng</span>;
      case "broken":
      case "network_error":
      case "ssl_error":
      case "blocked_ssrf":
        return <span className="link-badge link-badge-err">{statusCode ? `HTTP ${statusCode}` : "Hỏng / Hết hạn"}</span>;
      case "timeout":
        return <span className="link-badge link-badge-timeout">Quá giờ chờ</span>;
      default:
        return <span className="link-badge link-badge-neutral">Chưa kiểm tra</span>;
    }
  }

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
    <div className="link-health-container">
      {error && <div className="link-alert link-alert-error">{error}</div>}

      {/* Card 1: Quản lý tên miền cố định */}
      <section className="domain-health-card">
        <div className="domain-card-header">
          <div>
            <h3>Tên miền &amp; Đường dẫn cố định</h3>
            <p>
              Cấp tên miền/đường dẫn sử dụng lâu dài, tránh phải cấp lại link mới định kỳ khi in ấn tài liệu hoặc tạo mã QR cho học sinh.
            </p>
          </div>
          <button
            type="button"
            className="link-btn link-btn-secondary"
            onClick={handleVerifyDomain}
            disabled={isCheckingDomain}
          >
            {isCheckingDomain ? "Đang kiểm tra…" : "Kiểm tra kết nối tên miền"}
          </button>
        </div>

        <div className="domain-details-grid">
          <div className="domain-item">
            <span className="domain-label">Tên miền cấu hình:</span>
            <code className="domain-code">
              {domain?.configuredUrl || "Chưa cấu hình (đang dùng fallback origin trình duyệt)"}
            </code>
          </div>
          <div className="domain-item">
            <span className="domain-label">Trạng thái:</span>
            {domain?.isConfigured ? (
              <span className={`domain-status-pill ${domain.reachable ? "pill-ok" : "pill-err"}`}>
                {domain.reachable ? "● Đang hoạt động" : "● Không thể kết nối"}
              </span>
            ) : (
              <span className="domain-status-pill pill-warn">● Chưa đặt NEXT_PUBLIC_SITE_URL</span>
            )}
          </div>
          {domain?.responseTimeMs !== undefined && (
            <div className="domain-item">
              <span className="domain-label">Thời gian phản hồi:</span>
              <span>{domain.responseTimeMs}ms</span>
            </div>
          )}
          {domain?.isHttps !== undefined && (
            <div className="domain-item">
              <span className="domain-label">Bảo mật HTTPS:</span>
              <span>{domain.isHttps ? "Đạt chuẩn HTTPS" : "Chưa bảo mật (HTTP)"}</span>
            </div>
          )}
        </div>
        {domain?.error && <p className="domain-error-msg">{domain.error}</p>}
      </section>

      {/* Card 2: Thống kê tình trạng liên kết */}
      <section className="link-stats-row">
        <div className="link-stat-box">
          <div className="stat-num">{summary?.total ?? 0}</div>
          <div className="stat-title">Tổng liên kết</div>
        </div>
        <div className="link-stat-box box-ok">
          <div className="stat-num">{summary?.ok ?? 0}</div>
          <div className="stat-title">Hoạt động tốt (200)</div>
        </div>
        <div className="link-stat-box box-warn">
          <div className="stat-num">{summary?.redirect ?? 0}</div>
          <div className="stat-title">Chuyển hướng (301/302)</div>
        </div>
        <div className="link-stat-box box-err">
          <div className="stat-num">{summary?.broken ?? 0}</div>
          <div className="stat-title">Hết hạn / Lỗi (404/5xx)</div>
        </div>
      </section>

      {/* Toolbar & Nút Quét */}
      <div className="link-filter-toolbar">
        <div className="link-search-wrapper">
          <input
            type="search"
            placeholder="Tìm theo URL hoặc tên mục…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="link-search-box"
          />
          <div className="link-filter-pills">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Tất cả ({links.length})
            </button>
            <button
              type="button"
              className={filter === "broken" ? "active" : ""}
              onClick={() => setFilter("broken")}
            >
              Lỗi / Hết hạn ({summary?.broken ?? 0})
            </button>
            <button
              type="button"
              className={filter === "redirect" ? "active" : ""}
              onClick={() => setFilter("redirect")}
            >
              Chuyển hướng ({summary?.redirect ?? 0})
            </button>
            <button
              type="button"
              className={filter === "ok" ? "active" : ""}
              onClick={() => setFilter("ok")}
            >
              Hoạt động ({summary?.ok ?? 0})
            </button>
          </div>
        </div>

        <button
          type="button"
          className="link-btn link-btn-primary"
          onClick={handleScanAll}
          disabled={isScanning || isLoading}
        >
          {isScanning ? "Đang quét toàn bộ…" : "Quét toàn bộ liên kết ngay"}
        </button>
      </div>

      {summary?.lastScannedAt && (
        <p className="last-scan-time">
          Lần quét gần nhất: {new Date(summary.lastScannedAt).toLocaleString("vi-VN")}
        </p>
      )}

      {/* Bảng danh sách liên kết */}
      <div className="link-table-wrapper">
        <table className="link-table-view">
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Trạng thái</th>
              <th>Địa chỉ liên kết (URL)</th>
              <th>Vị trí / Nguồn</th>
              <th style={{ width: "100px" }}>Phản hồi</th>
              <th style={{ width: "130px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="link-empty-cell">
                  Đang tải dữ liệu liên kết…
                </td>
              </tr>
            ) : filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={5} className="link-empty-cell">
                  Không tìm thấy liên kết phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredLinks.map((item) => (
                <tr key={item.id}>
                  <td>{getStatusBadge(item.lastStatus, item.statusCode)}</td>
                  <td className="link-url-cell">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-anchor"
                    >
                      {item.url}
                    </a>
                    {item.redirectUrl && (
                      <div className="link-redirect-target">
                        ↳ Chuyển hướng đến: <code>{item.redirectUrl}</code>
                      </div>
                    )}
                    {item.error && <div className="link-error-desc">{item.error}</div>}
                  </td>
                  <td className="link-source-cell">
                    <div className="source-name">{item.sourceTitle}</div>
                    <div className="source-tag">{getSourceTypeLabel(item.sourceType)}</div>
                  </td>
                  <td>
                    {item.responseTimeMs ? `${item.responseTimeMs}ms` : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-btn-sm"
                      onClick={() => handleCheckSingle(item.url)}
                      disabled={checkingUrl === item.url || isScanning}
                    >
                      {checkingUrl === item.url ? "Đang ktra…" : "Kiểm tra lại"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
