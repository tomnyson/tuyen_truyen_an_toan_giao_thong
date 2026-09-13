"use client";

import React, { useEffect, useState } from "react";
import { FaBuildingColumns, FaCheck, FaPhone, FaLocationDot, FaXmark } from "react-icons/fa6";
import type { RecipientAuthority } from "@/lib/complaint-form-state";

interface SubmissionGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAuthority: (auth: RecipientAuthority) => void;
}

export function SubmissionGuidanceModal({
  isOpen,
  onClose,
  onSelectAuthority,
}: SubmissionGuidanceModalProps) {
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/co-quan")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAuthorities(data);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <FaBuildingColumns className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Hướng dẫn Thẩm quyền & Nộp Đơn Tố Giác
              </h3>
              <p className="text-xs text-slate-500">Căn cứ Điều 145, 146 Bộ luật Tố tụng Hình sự 2015</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 cursor-pointer"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 4 Bước Nộp Đơn */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3">
              Cẩm nang 4 bước nộp đơn an toàn & đúng luật
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                <span className="text-xs font-bold text-amber-700">Bước 1. In 02 bản đơn</span>
                <p className="text-xs text-slate-600">
                  In 02 bản đơn và ký tên. Một bản nộp cho cơ quan Công an, một bản yêu cầu đóng dấu/ký biên nhận giữ lại cho bản thân.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                <span className="text-xs font-bold text-amber-700">Bước 2. Sao lưu chứng cứ</span>
                <p className="text-xs text-slate-600">
                  In ảnh chụp tin nhắn, sao kê ngân hàng hoặc chép file ghi âm/video vào USB đính kèm danh mục tài liệu nộp cùng đơn.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                <span className="text-xs font-bold text-amber-700">Bước 3. Lấy Giấy tiếp nhận</span>
                <p className="text-xs text-slate-600">
                  Theo Điều 146 BLTTHS, cơ quan tiếp nhận bắt buộc phải lập biên bản hoặc giao Giấy tiếp nhận tin báo tố giác tội phạm cho người tố giác.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                <span className="text-xs font-bold text-amber-700">Bước 4. Gửi trực tuyến (nếu cần)</span>
                <p className="text-xs text-slate-600">
                  Có thể nộp qua Cổng Dịch vụ công Bộ Công an (dichvucong.bocongan.gov.vn) hoặc gửi bưu điện chuyển phát có báo phát.
                </p>
              </div>
            </div>
          </div>

          {/* Gợi ý cơ quan tiếp nhận */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
              Chọn cơ quan Công an tiếp nhận để tự động điền vào đơn
            </h4>
            <div className="space-y-2">
              {authorities.map((auth) => (
                <div
                  key={auth.id}
                  onClick={() => {
                    setSelectedId(auth.id);
                    onSelectAuthority({
                      name: auth.name,
                      level: auth.level,
                      address: auth.address,
                      phone: auth.phone || auth.hotline,
                    });
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedId === auth.id
                      ? "border-amber-500 bg-amber-50/60 ring-1 ring-amber-500"
                      : "border-stone-200 hover:border-amber-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{auth.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-slate-600">
                          {auth.scope || "Sở tại"}
                        </span>
                      </div>
                      {auth.address && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <FaLocationDot className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{auth.address}</span>
                        </p>
                      )}
                      {(auth.phone || auth.hotline) && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <FaPhone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{auth.hotline || auth.phone}</span>
                        </p>
                      )}
                    </div>
                    {selectedId === auth.id && (
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <FaCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-rust btn-brand-rust hover:bg-brand-rust-hover text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
          >
            Đã hiểu & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmissionGuidanceModal;
