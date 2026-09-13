"use client";

import React, { useState, useRef } from "react";
import jsQR from "jsqr";
import { parseCccdQrCode, type ParsedCccdData } from "@/lib/cccd-parser";
import { FaQrcode, FaUpload, FaXmark, FaShieldHalved } from "react-icons/fa6";

interface CccdQrScannerProps {
  onDataParsed: (data: ParsedCccdData) => void;
  onCancel: () => void;
}

export function CccdQrScanner({ onDataParsed, onCancel }: CccdQrScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Trình duyệt không hỗ trợ xử lý đồ họa canvas.");
          setIsProcessing(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Giải mã QR code cục bộ 100% bằng jsQR (Zero-network transmission)
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        canvas.width = 0; // giải phóng bộ nhớ DOM

        if (code && code.data) {
          const parsed = parseCccdQrCode(code.data);
          if (parsed) {
            onDataParsed(parsed);
          } else {
            setErrorMsg("Đã tìm thấy mã QR nhưng không đúng định dạng thẻ CCCD gắn chip Việt Nam.");
          }
        } else {
          setErrorMsg("Không tìm thấy mã QR trên ảnh. Vui lòng chụp rõ góc trên bên phải của thẻ CCCD gắn chip.");
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setErrorMsg("Không thể đọc tệp ảnh đã chọn.");
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <FaQrcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Quét thẻ CCCD gắn chip</h3>
              <p className="text-xs text-slate-500">Tự động điền thông tin người làm đơn</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
            <FaShieldHalved className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              <strong>Cam kết quyền riêng tư:</strong> Ảnh và thông tin CCCD được giải mã trực tiếp trong trình duyệt của bạn, tuyệt đối không gửi lên máy chủ và không lưu trữ trên hệ thống.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-8 text-center bg-stone-50/50 dark:bg-stone-800/20 hover:border-emerald-500 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <FaUpload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-stone-200 mb-1">
              {isProcessing ? "Đang giải mã mã QR..." : "Tải ảnh thẻ CCCD gắn chip"}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
              Chọn ảnh chụp góc trên bên phải của thẻ CCCD có chứa mã QR vuông.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Chọn tệp ảnh từ máy
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2 bg-stone-50/40 dark:bg-stone-800/20">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
          >
            Đóng / Nhập tay
          </button>
        </div>
      </div>
    </div>
  );
}

export default CccdQrScanner;
