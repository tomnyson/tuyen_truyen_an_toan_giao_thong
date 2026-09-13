"use client";

import React from "react";
import type { ComplaintFormState } from "@/lib/complaint-form-state";
import { FaFileWord, FaPrint, FaBuildingColumns } from "react-icons/fa6";

interface ComplaintDocumentPreviewProps {
  state: ComplaintFormState;
  onFieldChange?: (path: string, value: any) => void;
  onDownloadDocx: () => void;
  onOpenGuidance: () => void;
  progressPercentage: number;
}

export function ComplaintDocumentPreview({
  state,
  onFieldChange,
  onDownloadDocx,
  onOpenGuidance,
  progressPercentage,
}: ComplaintDocumentPreviewProps) {
  const c = state.complainant;
  const a = state.accused;
  const inc = state.incident;
  const ev = state.evidence;
  const r = state.recipient;

  return (
    <section className="flex flex-col h-full bg-white rounded-2xl border border-[#EFE5DA] shadow-warm-md overflow-hidden">
      {/* Document Toolbar Header */}
      <div className="p-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-700 sticky top-0 z-10 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-white uppercase">
              BẢN XEM TRƯỚC THỜI GIAN THỰC (A4)
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {progressPercentage}% Hoàn thiện
            </span>
          </div>
          <p className="text-xs text-stone-300 mt-0.5">
            Mô phỏng chính xác văn bản khi in hoặc xuất file Word hợp chuẩn cơ quan chức năng
          </p>
        </div>

        {/* Document Actions Buttons (Matches Stitch 2-tier wrap) */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenGuidance}
              type="button"
              className="btn-stone-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-100 transition-colors cursor-pointer"
            >
              <FaBuildingColumns className="w-3.5 h-3.5 text-amber-400" />
              <span>Nơi nộp đơn</span>
            </button>
            <button
              onClick={() => window.print()}
              type="button"
              className="btn-stone-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-100 transition-colors cursor-pointer"
            >
              <FaPrint className="w-3.5 h-3.5 text-stone-300" />
              <span>In / PDF</span>
            </button>
          </div>
          <button
            onClick={onDownloadDocx}
            type="button"
            className="btn-brand-rust inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all shadow-sm cursor-pointer w-full sm:w-auto"
          >
            <FaFileWord className="w-3.5 h-3.5" />
            <span>Tải file Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* Scrollable A4 Paper Wrapper */}
      <div className="flex-1 bg-[#EBE5DC] p-4 sm:p-6 overflow-y-auto flex justify-center print:p-0 print:overflow-visible print:bg-white">
        {/* Virtual A4 Page Layout */}
        <article
          className="bg-white text-stone-900 w-full max-w-2xl min-h-[880px] p-8 sm:p-12 shadow-paper rounded-xs legal-doc border border-stone-200/70 print:shadow-none print:border-none print:max-w-none text-sm leading-relaxed selection:bg-amber-100"
          data-purpose="a4-printed-document"
        >
          {/* National Formal Header */}
          <div className="text-center mb-6">
            <h4 className="font-bold text-base uppercase tracking-wider text-black">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="font-semibold text-sm underline decoration-1 underline-offset-4 mt-0.5">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="text-xs italic text-stone-500 mt-2">
              ............, {state.createdDate || "ngày ..... tháng ..... năm 202..."}
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-6">
            <h2 className="text-xl font-bold uppercase tracking-tight text-black">
              ĐƠN TỐ GIÁC TỘI PHẠM
            </h2>
            <p className="text-xs italic text-stone-600 mt-1">
              (V/v: {inc.behaviorSummary || "Hành vi lừa đảo chiếm đoạt tài sản & đe dọa trên không gian mạng"})
            </p>
          </div>

          {/* Recipient / Authority Header */}
          <div className="mb-5 text-sm pl-2 sm:pl-4 leading-relaxed font-serif">
            <div className="flex items-baseline">
              <span className="font-bold mr-2 whitespace-nowrap">Kính gửi:</span>
              <input
                type="text"
                value={r.name || ""}
                onChange={(e) => onFieldChange?.("recipient.name", e.target.value)}
                placeholder="Cơ quan Cảnh sát điều tra - Công an Huyện/Thành phố ........................"
                className="inline-doc-input flex-1 italic text-stone-800"
              />
            </div>
            <div className="flex items-baseline ml-12 sm:ml-16 mt-1">
              <input
                type="text"
                value="Viện kiểm sát nhân dân cùng cấp ................................................"
                readOnly
                className="inline-doc-input flex-1 italic text-stone-800 cursor-default"
              />
            </div>
          </div>

          {/* Petitioner Personal Details */}
          <div className="text-sm space-y-2 mb-4 leading-relaxed font-serif">
            <div className="flex items-baseline">
              <span className="w-40 font-semibold shrink-0 whitespace-nowrap mr-2">Tôi tên là (Người làm đơn):</span>
              <input
                type="text"
                value={c.fullName || ""}
                onChange={(e) => onFieldChange?.("complainant.fullName", e.target.value)}
                placeholder="[Họ và tên học sinh / Người đại diện]"
                className="inline-doc-input flex-1 font-bold uppercase text-stone-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-baseline">
                <span className="w-24 font-semibold shrink-0">Sinh ngày:</span>
                <input
                  type="text"
                  value={c.birthDate || (c.birthYear ? `.../.../${c.birthYear}` : "")}
                  onChange={(e) => onFieldChange?.("complainant.birthDate", e.target.value)}
                  placeholder="... / ... / 200..."
                  className="inline-doc-input flex-1 text-stone-800"
                />
              </div>
              <div className="flex items-baseline">
                <span className="w-24 font-semibold shrink-0">Số CCCD:</span>
                <input
                  type="text"
                  value={c.idNumber || ""}
                  onChange={(e) => onFieldChange?.("complainant.idNumber", e.target.value)}
                  placeholder="[Quét để nhập tự động]"
                  className="inline-doc-input flex-1 text-stone-700 font-medium"
                />
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="w-40 font-semibold shrink-0 whitespace-nowrap mr-2">Nơi cư trú / Thường trú:</span>
              <input
                type="text"
                value={c.permanentAddress || ""}
                onChange={(e) => onFieldChange?.("complainant.permanentAddress", e.target.value)}
                placeholder="..........................................................................................................."
                className="inline-doc-input flex-1 text-stone-800"
              />
            </div>
            <div className="flex items-baseline">
              <span className="w-40 font-semibold shrink-0 whitespace-nowrap mr-2">Nơi cư ngụ / SĐT liên hệ:</span>
              <input
                type="text"
                value={c.phone || c.currentAddress || ""}
                onChange={(e) => {
                  onFieldChange?.("complainant.phone", e.target.value);
                  onFieldChange?.("complainant.currentAddress", e.target.value);
                }}
                placeholder="..........................................................................................................."
                className="inline-doc-input flex-1 text-stone-800"
              />
            </div>
          </div>

          {/* Accused Party Details & Incident Description */}
          <div className="text-sm mt-5 space-y-2 font-serif">
            <p className="font-bold text-stone-900">
              Đối tượng này đã có hành vi vi phạm như sau:
            </p>
            {/* Highlighted auto-populated and user-editable section */}
            <div className="p-3.5 bg-stone-50 border border-stone-300 rounded text-stone-900 italic leading-relaxed text-justify font-sans text-xs sm:text-sm">
              <textarea
                value={inc.chronology || inc.behaviorSummary || ""}
                onChange={(e) => {
                  onFieldChange?.("incident.chronology", e.target.value);
                  if (!inc.behaviorSummary) {
                    onFieldChange?.("incident.behaviorSummary", e.target.value.slice(0, 80));
                  }
                }}
                rows={4}
                placeholder="(Nội dung hành vi và diễn biến sự việc sẽ được Trợ lý AI tự động trích xuất từ cuộc phỏng vấn và điền vào đây... Em cũng có thể nhấp chuột trực tiếp vào đây để sửa hoặc bổ sung)"
                className="inline-doc-textarea w-full bg-transparent border-none p-0 focus:ring-0 resize-y text-stone-900 italic leading-relaxed font-sans text-xs sm:text-sm placeholder:text-stone-400 placeholder:not-italic"
              />
            </div>
          </div>

          {/* Evidence Section */}
          <div className="text-sm mt-4 space-y-1 font-serif">
            <p className="font-bold text-stone-900">
              Chứng cứ chứng minh kèm theo (nếu có):
            </p>
            <p className="italic text-xs text-stone-500 font-serif">
              (Chưa có tài liệu đính kèm: Ảnh chụp màn hình tin nhắn, mã giao dịch sao kê ngân hàng, ghi âm...)
            </p>
            <div className="border border-dashed border-stone-300 rounded p-2.5 bg-stone-50 text-xs text-stone-600 flex items-center justify-between font-sans">
              <div className="flex items-center gap-1.5 flex-1 mr-2">
                <span className="shrink-0">📎</span>
                <input
                  type="text"
                  value={ev.items.length > 0 ? ev.items.join("; ") : ""}
                  onChange={(e) => {
                    const parsedItems = e.target.value.split(";").map((s) => s.trim()).filter(Boolean);
                    onFieldChange?.("evidence.items", parsedItems);
                  }}
                  placeholder="Chưa có file đính kèm (gõ các bằng chứng cách nhau bằng dấu chấm phẩy)"
                  className="inline-doc-input flex-1 text-xs text-stone-600"
                />
              </div>
              <button
                type="button"
                onClick={() => alert("Em có thể gõ nội dung hoặc thông tin bằng chứng trong ô chat, Trợ lý AI sẽ trích xuất vào mục này.")}
                className="text-[#B84724] font-semibold hover:underline cursor-pointer print:hidden shrink-0"
              >
                Tải tệp đính kèm ngay
              </button>
            </div>
          </div>

          {/* Formal Commitments */}
          <div className="text-xs sm:text-sm mt-5 leading-relaxed text-justify text-stone-800 space-y-2 font-serif">
            <p>
              Từ vụ việc xảy ra nêu trên, tôi cho rằng cá nhân này đã có dấu hiệu vi phạm pháp luật hình sự. Kính đề nghị quý cơ quan điều tra làm rõ hành vi trên để đảm bảo quyền lợi hợp pháp của tôi và giữ vững an ninh trật tự xã hội.
            </p>
            <p>
              Tôi xin cam đoan những gì tôi vừa trình bày là sự thật và hoàn toàn chịu trách nhiệm trước pháp luật về nội dung vừa nêu.
            </p>
            <p className="font-medium">
              Xin chân thành cảm ơn./.
            </p>
          </div>

          {/* Signature Area */}
          <div className="mt-8 flex justify-end font-serif">
            <div className="text-center w-64">
              <p className="font-bold text-sm">Người làm đơn</p>
              <p className="italic text-xs text-stone-500">(Ký và ghi rõ họ tên)</p>
              {/* Khoảng trống ký tay — screen: hiển thị placeholder italic; print: khoảng trắng */}
              <div className="h-20 flex items-center justify-center text-xs text-stone-400 italic print:opacity-0">
                {!c.fullName && "[Chưa ký xác nhận]"}
              </div>
              <p className="text-xs font-semibold text-stone-700 uppercase">
                {c.fullName || "............................................"}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ComplaintDocumentPreview;
