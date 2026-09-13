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
    <div className="flex flex-col h-full bg-stone-100 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
      {/* Top Toolbar */}
      <div className="p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Bản xem trước thời gian thực (A4)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {progressPercentage}% Hoàn thiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Mô phỏng chính xác văn bản khi in hoặc xuất file Word</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuidance}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 dark:bg-stone-800 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FaBuildingColumns className="w-3.5 h-3.5 text-amber-600" />
            <span>Nơi nộp đơn</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 dark:bg-stone-800 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FaPrint className="w-3.5 h-3.5" />
            <span>In / PDF</span>
          </button>
          <button
            onClick={onDownloadDocx}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <FaFileWord className="w-3.5 h-3.5" />
            <span>Tải file Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible">
        <div
          className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 rounded-lg shadow-md border border-stone-200 print:shadow-none print:border-none print:p-0 font-serif leading-relaxed text-sm selection:bg-amber-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* Header Quốc hiệu */}
          <div className="text-center mb-6">
            <p className="font-bold text-base tracking-wide uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="font-bold text-base underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-right italic text-xs mt-4">
              ..........., {state.createdDate || "ngày ..... tháng .... năm....."}
            </p>
          </div>

          {/* Tiêu đề đơn */}
          <div className="text-center my-6">
            <h1 className="text-xl font-bold uppercase tracking-wide">ĐƠN TỐ GIÁC TỘI PHẠM</h1>
            <p className="italic text-sm text-slate-600 mt-1">
              (Về hành vi:{" "}
              <span className="font-semibold text-slate-900">
                {inc.behaviorSummary || "…………………………………………………………"}
              </span>
              )
            </p>
          </div>

          {/* Kính gửi */}
          <div className="mb-6 font-sans text-[13px]">
            <p className="font-bold font-serif text-sm">
              Kính gửi:{" "}
              <span className="text-sky-900 dark:text-sky-950 font-bold underline decoration-sky-300">
                {r.name || "Cơ quan Cảnh sát điều tra, Công an quận/huyện ………………………"}
              </span>
            </p>
          </div>

          {/* Thông tin người làm đơn */}
          <div className="space-y-2 mb-6">
            <p>
              Tôi tên là: <strong className="uppercase">{c.fullName || "……………………………………"}</strong>
              <span className="ml-6">
                Sinh năm: <strong>{c.birthYear || c.birthDate || "……………"}</strong>
              </span>
            </p>
            <p>
              CMND/CCCD số: <strong>{c.idNumber || "…………………………"}</strong> do:{" "}
              <span>{c.idIssuePlace || "Cục Cảnh sát QLHC về TTXH"}</span> cấp ngày:{" "}
              <span>{c.idIssueDate || "………………"}</span>
            </p>
            <p>
              Hộ khẩu thường trú: <span>{c.permanentAddress || "………………………………………………………………………………………"}</span>
            </p>
            <p>
              Hiện đang cư ngụ tại: <span>{c.currentAddress || c.permanentAddress || "………………………………………………………………………………………"}</span>
            </p>
            <p>
              Số điện thoại liên hệ: <strong>{c.phone || "……………………………………………"}</strong>
            </p>
          </div>

          {/* Đối tượng */}
          <div className="mb-6">
            <p className="mb-2">
              Nay tôi làm đơn này kính mong quý cơ quan tiến hành điều tra làm rõ hành vi vi phạm của đối tượng:
            </p>
            <p>
              Họ và tên đối tượng: <strong>{a.fullName || "……………………………………………………"}</strong>
            </p>
            <p>
              Nơi cư ngụ / Tài khoản / SĐT:{" "}
              <span>{a.addressOrAccount || "…………………………………………………………………………"}</span>
            </p>
          </div>

          {/* Hành vi vi phạm & Diễn biến */}
          <div className="mb-6">
            <p className="font-bold mb-1">Đối tượng này đã có hành vi vi phạm như sau:</p>
            <div className="p-3 bg-stone-50 rounded border border-stone-200 whitespace-pre-wrap leading-relaxed text-justify">
              {inc.chronology ||
                inc.behaviorSummary ||
                "Trình bày rõ thời gian, địa điểm, diễn biến sự việc xảy ra và vì sao cho rằng đối tượng vi phạm pháp luật..."}
            </div>
          </div>

          {/* Chứng cứ */}
          <div className="mb-6">
            <p className="font-bold mb-1">Chứng cứ chứng minh kèm theo (nếu có):</p>
            {ev.items.length > 0 ? (
              <ul className="list-decimal list-inside space-y-1 pl-2">
                {ev.items.map((item, idx) => (
                  <li key={idx} className="text-slate-800">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="italic text-slate-500">Chưa có tài liệu đính kèm (Ảnh chụp màn hình, ghi âm, sao kê...)</p>
            )}
          </div>

          {/* Cam kết */}
          <div className="space-y-2 mb-8 text-justify">
            <p>
              Từ vụ việc xảy ra nêu trên, tôi cho rằng cá nhân này đã có hành vi vi phạm pháp luật. Kính đề nghị quý cơ quan điều tra làm rõ hành vi trên để đảm bảo quyền lợi hợp pháp và giữ vững an ninh trật tự xã hội.
            </p>
            <p>
              Tôi xin cam đoan những gì tôi vừa trình bày là sự thật và hoàn toàn chịu trách nhiệm trước pháp luật về nội dung vừa nêu.
            </p>
            <p>Xin chân thành cảm ơn./.</p>
          </div>

          {/* Ký tên */}
          <div className="flex justify-end text-center mt-8">
            <div className="w-64 space-y-1">
              <p className="font-bold">Người làm đơn</p>
              <p className="italic text-xs text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                {c.fullName ? (
                  <span className="text-sky-700 font-bold italic">{c.fullName}</span>
                ) : (
                  <span className="text-slate-300 text-xs">Chưa ký</span>
                )}
              </div>
              <p className="font-bold uppercase text-xs">{c.fullName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplaintDocumentPreview;
