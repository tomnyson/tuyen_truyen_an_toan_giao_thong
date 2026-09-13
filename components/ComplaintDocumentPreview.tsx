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
    <section className="flex flex-col h-full bg-white dark:bg-stone-900 rounded-2xl border border-[#EFE5DA] dark:border-stone-800 shadow-warm-md overflow-hidden">
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

        {/* Document Actions Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenGuidance}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-xs font-semibold text-stone-100 transition-colors cursor-pointer"
          >
            <FaBuildingColumns className="w-3.5 h-3.5 text-amber-400" />
            <span>Nơi nộp đơn</span>
          </button>
          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-xs font-semibold text-stone-100 transition-colors cursor-pointer"
          >
            <FaPrint className="w-3.5 h-3.5 text-stone-300" />
            <span>In / PDF</span>
          </button>
          <button
            onClick={onDownloadDocx}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B84724] hover:bg-[#9F3A1B] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <FaFileWord className="w-3.5 h-3.5" />
            <span>Tải file Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* Scrollable A4 Paper Wrapper */}
      <div className="flex-1 bg-[#EBE5DC] dark:bg-stone-950 p-4 sm:p-6 overflow-y-auto flex justify-center print:p-0 print:overflow-visible print:bg-white">
        {/* Virtual A4 Page Layout */}
        <article
          className="bg-white text-stone-900 w-full max-w-2xl min-h-[880px] p-8 sm:p-12 shadow-paper rounded-xs legal-doc border border-stone-200/70 print:shadow-none print:border-none print:p-0 print:max-w-none text-sm leading-relaxed selection:bg-amber-100"
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
            <div className="text-xs italic text-stone-500 mt-2 text-right">
              {state.createdDate || "............, ngày ..... tháng ..... năm 202..."}
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
            <p className="font-bold">
              Kính gửi:{" "}
              <span className="font-normal italic border-b border-dotted border-stone-400 pl-2 pr-4 inline-block min-w-[280px] sm:min-w-[340px] text-stone-800">
                {r.name || "Cơ quan Cảnh sát điều tra - Công an Huyện/Thành phố ........................"}
              </span>
            </p>
            <p className="font-bold ml-12 sm:ml-16 mt-1.5">
              <span className="font-normal italic border-b border-dotted border-stone-400 pl-2 pr-4 inline-block min-w-[240px] sm:min-w-[300px] text-stone-800">
                Viện kiểm sát nhân dân cùng cấp ................................................
              </span>
            </p>
          </div>

          {/* Petitioner Personal Details */}
          <div className="text-sm space-y-2 mb-4 leading-relaxed font-serif">
            <div className="flex flex-wrap sm:flex-nowrap items-baseline">
              <span className="w-48 font-semibold shrink-0">Tôi tên là (Người làm đơn):</span>
              <span className="flex-1 border-b border-dotted border-stone-400 font-bold uppercase text-stone-900">
                {c.fullName || "[Họ và tên học sinh / Người đại diện]"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-baseline">
                <span className="w-24 font-semibold shrink-0">Sinh ngày:</span>
                <span className="flex-1 border-b border-dotted border-stone-400 text-stone-800">
                  {c.birthDate || (c.birthYear ? `.../.../${c.birthYear}` : "... / ... / 200...")}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 font-semibold shrink-0">Số CCCD:</span>
                <span className="flex-1 border-b border-dotted border-stone-400 text-stone-700 font-medium">
                  {c.idNumber || "[Quét để nhập tự động]"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-baseline">
              <span className="w-48 font-semibold shrink-0">Nơi cư trú / Thường trú:</span>
              <span className="flex-1 border-b border-dotted border-stone-400 text-stone-800">
                {c.permanentAddress || "..........................................................................................................."}
              </span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-baseline">
              <span className="w-48 font-semibold shrink-0">Nơi cư ngụ / SĐT liên hệ:</span>
              <span className="flex-1 border-b border-dotted border-stone-400 text-stone-800">
                {c.phone || c.currentAddress || "..........................................................................................................."}
              </span>
            </div>
          </div>

          {/* Accused Party Details */}
          <div className="text-sm mt-5 space-y-2 font-serif">
            <p className="font-bold text-stone-900">
              Đối tượng bị tố giác:
            </p>
            <div className="flex flex-wrap sm:flex-nowrap items-baseline">
              <span className="w-48 font-semibold shrink-0">Họ và tên đối tượng:</span>
              <span className="flex-1 border-b border-dotted border-stone-400 font-bold text-stone-900">
                {a.fullName || "……………………………………………………"}
              </span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-baseline">
              <span className="w-48 font-semibold shrink-0">Nơi cư ngụ / Tài khoản / SĐT:</span>
              <span className="flex-1 border-b border-dotted border-stone-400 text-stone-800">
                {a.addressOrAccount || "……………………………………………………"}
              </span>
            </div>

            <p className="font-bold text-stone-900 mt-3 pt-2">
              Đối tượng này đã có hành vi vi phạm như sau:
            </p>
            {/* Highlighted auto-populated section from chat */}
            <div className="p-3.5 bg-stone-50 border border-stone-300 rounded text-stone-900 italic leading-relaxed text-justify font-sans text-xs sm:text-sm">
              {inc.chronology || inc.behaviorSummary ? (
                `"${inc.chronology || inc.behaviorSummary}"`
              ) : (
                <span className="text-stone-400">
                  (Nội dung hành vi và diễn biến sự việc sẽ được Trợ lý AI tự động trích xuất từ cuộc phỏng vấn và điền vào đây...)
                </span>
              )}
            </div>
          </div>

          {/* Evidence Section */}
          <div className="text-sm mt-4 space-y-1.5 font-serif">
            <p className="font-bold text-stone-900">
              Chứng cứ chứng minh kèm theo (nếu có):
            </p>
            {ev.items.length > 0 ? (
              <div className="border border-stone-200 rounded p-3 bg-stone-50 text-xs text-stone-700 font-sans space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  {ev.items.map((item, idx) => (
                    <li key={idx} className="font-medium text-stone-800">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border border-dashed border-stone-300 rounded p-2.5 bg-stone-50 font-sans text-xs text-stone-600 flex items-center justify-between">
                <span>📎 Chưa có file đính kèm (Ảnh chụp tin nhắn, sao kê ngân hàng, ghi âm...)</span>
                <span className="text-[#B84724] font-semibold text-[11px]">Đính kèm qua chat</span>
              </div>
            )}
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
              <div className="h-16 flex items-center justify-center text-xs italic">
                {c.fullName ? (
                  <span className="text-stone-800 font-bold font-serif text-sm">{c.fullName}</span>
                ) : (
                  <span className="text-stone-400">[Chưa ký xác nhận]</span>
                )}
              </div>
              <p className="text-xs font-semibold text-stone-700">
                {c.fullName ? c.fullName.toUpperCase() : "............................................"}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ComplaintDocumentPreview;
