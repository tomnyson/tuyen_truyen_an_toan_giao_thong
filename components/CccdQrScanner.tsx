"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import { parseCccdQrCode, type ParsedCccdData } from "@/lib/cccd-parser";
import {
  FaQrcode,
  FaUpload,
  FaXmark,
  FaShieldHalved,
  FaCamera,
  FaRotate,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa6";

interface CccdQrScannerProps {
  onDataParsed: (data: ParsedCccdData) => void;
  onCancel: () => void;
}

export function CccdQrScanner({ onDataParsed, onCancel }: CccdQrScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dừng luồng media và giải phóng phần cứng camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Quét từng frame của camera bằng jsQR cục bộ trong trình duyệt
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Giải mã QR code cục bộ 100% bằng jsQR (Zero-network transmission)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      const parsed = parseCccdQrCode(code.data);
      if (parsed) {
        stopCamera();
        onDataParsed(parsed);
      } else {
        // Bắt được mã QR nhưng không phải chuẩn CCCD 12 số
        setErrorMsg("Đã phát hiện mã QR nhưng chưa đúng định dạng CCCD gắn chip Việt Nam.");
      }
    }
  }, [onDataParsed, stopCamera]);

  // Bắt đầu luồng camera
  const startCamera = useCallback(
    async (targetFacing: "environment" | "user" = facingMode) => {
      stopCamera();
      setCameraError("");
      setErrorMsg("");

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(
            "Trình duyệt không hỗ trợ camera hoặc đang chạy ở kết nối chưa bảo mật (cần HTTPS hoặc localhost)."
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraActive(true);

          // Quét chu kỳ 250ms/lần để tiết kiệm pin và CPU
          scanIntervalRef.current = setInterval(scanVideoFrame, 250);
        }
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setCameraError(
            "Trình duyệt chưa được cấp quyền sử dụng máy ảnh. Vui lòng bấm Cho phép máy ảnh trong thanh địa chỉ hoặc chọn tải ảnh."
          );
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setCameraError("Không tìm thấy camera trên thiết bị. Vui lòng chuyển sang tải ảnh thẻ CCCD.");
        } else if (error.name === "NotReadableError") {
          setCameraError("Máy ảnh đang bị ứng dụng khác chiếm giữ. Vui lòng đóng ứng dụng đó và thử lại.");
        } else {
          setCameraError("Không thể bật máy ảnh: " + (error.message || "Lỗi không xác định"));
        }
        setIsCameraActive(false);
      }
    },
    [facingMode, scanVideoFrame, stopCamera]
  );

  // Chuyển đổi camera trước / sau
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Kích hoạt camera khi chọn tab camera
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  // Xử lý đọc ảnh từ tệp tin
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
        canvas.width = 0; // giải phóng bộ nhớ

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

  const handleClose = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150 my-6">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FaQrcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Quét thẻ CCCD gắn chip</h3>
              <p className="text-xs text-slate-500">Tự động điền nhanh họ tên, số CCCD, ngày sinh, nơi cư trú</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 cursor-pointer"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 bg-stone-50/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-white text-emerald-700 shadow-sm border border-stone-200/80"
                : "text-slate-600 hover:bg-stone-100"
            }`}
          >
            <FaCamera className="w-3.5 h-3.5" />
            <span>Quét trực tiếp qua Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-emerald-700 shadow-sm border border-stone-200/80"
                : "text-slate-600 hover:bg-stone-100"
            }`}
          >
            <FaUpload className="w-3.5 h-3.5" />
            <span>Tải ảnh thẻ từ máy</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Cam kết bảo mật */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <FaShieldHalved className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed">
              <strong>Bảo mật tuyệt đối (Zero-Knowledge):</strong> Luồng camera và ảnh CCCD được phân tích 100% trong bộ nhớ thiết bị của bạn. Hệ thống tuyệt đối không gửi video hay hình ảnh lên máy chủ.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {errorMsg}
            </div>
          )}

          {/* Tab 1: Quét bằng Camera */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-stone-950 rounded-2xl overflow-hidden flex items-center justify-center border border-stone-300">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Frame */}
                {isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-500 rounded-br" />

                      {/* Scanning Laser Line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-3 text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs font-medium">
                      Hướng mã QR góc trên bên phải CCCD vào trong khung
                    </p>
                  </div>
                )}

                {/* Camera Fallback / Error State */}
                {(!isCameraActive || cameraError) && (
                  <div className="absolute inset-0 bg-stone-900/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center">
                      <FaVideoSlash className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white mb-1">
                        {cameraError ? "Không thể kết nối máy ảnh" : "Đang khởi động máy ảnh..."}
                      </p>
                      <p className="text-[11px] text-stone-300 max-w-xs mx-auto">
                        {cameraError || "Vui lòng cho phép trình duyệt truy cập camera khi có thông báo."}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Thử lại
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("upload")}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg cursor-pointer transition-all"
                      >
                        Chuyển sang tải ảnh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  disabled={!isCameraActive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-slate-700 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
                >
                  <FaRotate className="w-3 h-3 text-slate-500" />
                  <span>Đổi camera ({facingMode === "environment" ? "Sau" : "Trước"})</span>
                </button>

                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-slate-700 hover:bg-stone-100 cursor-pointer"
                  >
                    <FaVideoSlash className="w-3 h-3 text-rose-500" />
                    <span>Tạm dừng</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    <FaVideo className="w-3 h-3" />
                    <span>Bật máy ảnh</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Tải ảnh từ máy */}
          {activeTab === "upload" && (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center bg-stone-50/50 hover:border-emerald-500 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <FaUpload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">
                {isProcessing ? "Đang giải mã mã QR..." : "Tải ảnh thẻ CCCD gắn chip"}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                Chọn ảnh chụp góc trên bên phải của thẻ CCCD có chứa mã QR vuông.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Chọn tệp ảnh từ máy
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50/40">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-stone-100 rounded-lg cursor-pointer"
          >
            Đóng / Nhập tay
          </button>
        </div>
      </div>
    </div>
  );
}

export default CccdQrScanner;
