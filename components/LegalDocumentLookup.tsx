"use client";

import { useEffect, useState, useMemo } from "react";
import { SearchIcon, ArrowUpRightIcon, BookIcon } from "@/components/icons";
import type { LegalDocumentRecord } from "@/lib/legal-document-store";

const TOPIC_FILTERS = [
  "Tất cả",
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

const DOCUMENT_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả loại" },
  { value: "luat", label: "Luật" },
  { value: "nghi_dinh", label: "Nghị định" },
  { value: "thong_tu", label: "Thông tư" },
  { value: "quyet_dinh", label: "Quyết định" },
  { value: "van_ban_hop_nhat", label: "VB Hợp nhất" },
];

export type LegalDocumentLookupProps = {
  containerClassName?: string;
  showHeader?: boolean;
};

export function LegalDocumentLookup({
  containerClassName = "mt-6 mb-8",
  showHeader = true,
}: LegalDocumentLookupProps = {}) {
  const [documents, setDocuments] = useState<LegalDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState("Tất cả");
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function loadDocs() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/legal-documents?limit=100", { cache: "default" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
      } catch {
        // im lặng nếu có lỗi kết nối mạng
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDocs();
    return () => {
      isMounted = false;
    };
  }, []);

  const isFiltered = Boolean(search.trim() || activeTopic !== "Tất cả" || activeType !== "all");

  const handleResetFilters = () => {
    setSearch("");
    setActiveTopic("Tất cả");
    setActiveType("all");
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Lọc theo chủ đề
      if (activeTopic !== "Tất cả" && doc.topic !== activeTopic) {
        return false;
      }
      // Lọc theo loại văn bản
      if (activeType !== "all" && doc.documentType !== activeType) {
        return false;
      }
      // Lọc theo từ khóa
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.documentNumber.toLowerCase().includes(q) ||
          doc.issuingAuthority.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, activeTopic, activeType, search]);

  if (documents.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={`w-full ${containerClassName}`} id="tra-cuu-van-ban">
      <div className="legal-container-card">
        {showHeader && (
          <div className="border-b border-[var(--line-card)] pb-6">
            <span className="section-kicker">Cơ sở dữ liệu pháp luật chính thức</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--ink)] mt-1 font-display">
              Kho văn bản tra cứu &amp; học tập
            </h2>
            <p className="text-sm text-[var(--ink-soft)] mt-1 max-w-2xl leading-relaxed">
              Tra cứu nhanh các Luật, Nghị định, Thông tư từ Cổng Thông tin điện tử Chính phủ phục vụ nghiên cứu và trang bị kiến thức pháp luật.
            </p>
          </div>
        )}

        {/* Thanh điều khiển bộ lọc cao cấp */}
        <div className="legal-filter-panel">
          {/* Hàng 1: Ô tìm kiếm + Segmented selector loại văn bản */}
          <div className="legal-filter-top-row">
            <div className="legal-search-box">
              <span className="legal-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm số hiệu, tên văn bản, cơ quan..."
                className="legal-search-input"
                aria-label="Tìm kiếm văn bản pháp luật"
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="legal-search-clear"
                  title="Xóa tìm kiếm"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="legal-segmented-container" role="tablist" aria-label="Phân loại văn bản quy phạm pháp luật">
              {DOCUMENT_TYPE_FILTERS.map((df) => (
                <button
                  key={df.value}
                  type="button"
                  role="tab"
                  aria-selected={activeType === df.value}
                  onClick={() => setActiveType(df.value)}
                  className={`legal-segmented-btn ${activeType === df.value ? "active" : ""}`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hàng 2: Dải chọn chủ đề */}
          <div className="legal-topic-bar" role="tablist" aria-label="Lọc theo lĩnh vực và chuyên đề pháp luật">
            <span className="legal-topic-label">Lĩnh vực:</span>
            {TOPIC_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={activeTopic === t}
                onClick={() => setActiveTopic(t)}
                className={`legal-topic-chip ${activeTopic === t ? "active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Hàng 3: Trạng thái kết quả & Nút đặt lại */}
          <div className="legal-status-row">
            <div className="legal-status-count">
              Hiển thị <strong>{filteredDocs.length}</strong> / {documents.length} văn bản
            </div>

            {isFiltered && (
              <div className="legal-active-filter-tags">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="legal-reset-btn"
                  title="Đặt lại toàn bộ tiêu chí lọc"
                >
                  ✕ Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách văn bản quy phạm pháp luật */}
        {isLoading ? (
          <div className="legal-empty-state">
            <div className="legal-spinner" />
            <p className="legal-empty-title">Đang tải kho văn bản pháp luật...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="legal-empty-state">
            <div className="legal-empty-icon">
              <BookIcon />
            </div>
            <p className="legal-empty-title">Không tìm thấy văn bản pháp luật nào phù hợp</p>
            <p className="legal-empty-desc">
              Không có kết quả nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Bạn vui lòng kiểm tra lại từ khóa hoặc xóa bớt tiêu chí lọc.
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="legal-reset-btn"
              >
                ✕ Đặt lại tất cả bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="legal-cards-grid">
            {filteredDocs.map((doc) => {
              const badgeType = doc.documentType || "khac";
              return (
                <article
                  key={doc.id}
                  className="legal-card"
                  data-type={badgeType}
                >
                  <div>
                    <div className="legal-card-header">
                      <span className={`legal-badge-num legal-badge-${badgeType}`}>
                        {doc.documentNumber}
                      </span>
                      <span className="legal-authority" title={doc.issuingAuthority}>
                        {doc.issuingAuthority}
                      </span>
                    </div>

                    <h3 className="legal-card-title">
                      {doc.title}
                    </h3>

                    {doc.summary && (
                      <p className="legal-card-summary">
                        {doc.summary}
                      </p>
                    )}
                  </div>

                  <div className="legal-card-footer">
                    <span className="legal-topic-tag">
                      {doc.topic}
                    </span>
                    <a
                      href={doc.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="legal-external-link"
                    >
                      <span>Xem toàn văn</span>
                      <ArrowUpRightIcon />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
