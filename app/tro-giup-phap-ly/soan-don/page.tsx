"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import CccdQrScanner from "@/components/CccdQrScanner";
import ComplaintDocumentPreview from "@/components/ComplaintDocumentPreview";
import SubmissionGuidanceModal from "@/components/SubmissionGuidanceModal";
import {
  createEmptyComplaintForm,
  calculateFormCompletionProgress,
  saveComplaintStateLocal,
  loadComplaintStateLocal,
  clearComplaintStateLocal,
  type ComplaintFormState,
  type RecipientAuthority,
} from "@/lib/complaint-form-state";
import { buildComplaintDocx, downloadDocxInBrowser } from "@/lib/docx-generator";
import type { ParsedCccdData } from "@/lib/cccd-parser";
import {
  FaShieldHalved,
  FaQrcode,
  FaPaperPlane,
  FaRotateRight,
  FaRobot,
  FaUser,
  FaChevronRight,
  FaTrashCan,
  FaCircleCheck,
} from "react-icons/fa6";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  "Bị lừa đảo chuyển tiền làm nhiệm vụ trên mạng",
  "Bị bạn cùng trường đe dọa đánh và chặn đường",
  "Bị người lạ tống tiền và phát tán ảnh nhạy cảm",
  "Chưa rõ tên đối tượng, chỉ có link Facebook",
];

export default function SoanDonToGiacPage() {
  const [formState, setFormState] = useState<ComplaintFormState>(createEmptyComplaintForm);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Chào em, anh/chị là Trợ lý Pháp lý ảo. Em hãy bình tĩnh nhé, mọi thông tin em chia sẻ tại đây hoàn toàn được bảo mật trong máy của em và không gửi lên máy chủ. Để bắt đầu, em có thể bấm nút 'Quét thẻ CCCD' để tự động điền phần thông tin cá nhân, hoặc kể cho anh/chị nghe sự việc em đang gặp phải.",
      time: "Vừa xong",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load state từ local session khi mở trang
  useEffect(() => {
    const saved = loadComplaintStateLocal();
    if (saved) {
      setFormState(saved);
    }
  }, []);

  // Tự động cuộn chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // Lưu state local mỗi khi có thay đổi
  const updateFormState = (updater: (prev: ComplaintFormState) => ComplaintFormState) => {
    setFormState((prev) => {
      const next = updater(prev);
      saveComplaintStateLocal(next);
      return next;
    });
  };

  const handleCccdParsed = (data: ParsedCccdData) => {
    updateFormState((prev) => ({
      ...prev,
      complainant: {
        ...prev.complainant,
        fullName: data.fullName,
        birthDate: data.birthDate,
        birthYear: data.birthYear,
        idNumber: data.idNumber,
        idIssueDate: data.issueDate,
        idIssuePlace: data.issuePlace,
        permanentAddress: data.permanentAddress,
        currentAddress: prev.complainant.currentAddress || data.permanentAddress,
      },
    }));

    setIsScannerOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-user`,
        sender: "user",
        text: `Đã quét thẻ CCCD thành công: ${data.fullName} (CCCD: ${data.idNumber})`,
        time: "Vừa xong",
      },
      {
        id: `msg-${Date.now()}-ai`,
        sender: "ai",
        text: `Tuyệt vời! Thông tin của em (${data.fullName}) đã được cập nhật vào tờ đơn bên phải. Bây giờ, em hãy cho anh/chị biết: Đối tượng vi phạm là ai và họ đã có hành vi gì gây hại cho em?`,
        time: "Vừa xong",
      },
    ]);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMsg).trim();
    if (!textToSend || isAiThinking) return;

    setInputMsg("");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: textToSend,
      time: "Vừa xong",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    try {
      const res = await fetch("/api/legal-aid/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.extractedFields) {
          updateFormState((prev) => {
            const next = { ...prev };
            if (data.extractedFields.incident) {
              next.incident = { ...next.incident, ...data.extractedFields.incident };
            }
            if (data.extractedFields.accused) {
              next.accused = { ...next.accused, ...data.extractedFields.accused };
            }
            if (data.extractedFields.evidence?.items) {
              const mergedItems = Array.from(
                new Set([...next.evidence.items, ...data.extractedFields.evidence.items]),
              );
              next.evidence = { ...next.evidence, items: mergedItems };
            }
            return next;
          });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-ai`,
            sender: "ai",
            text: data.assistantReply || "Anh/chị đã ghi nhận thông tin vào đơn.",
            time: "Vừa xong",
          },
        ]);
      } else {
        throw new Error("API error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          sender: "ai",
          text: "Anh/chị đã ghi nhận lời kể của em vào phần diễn biến đơn. Em hãy kiểm tra bản xem trước ở cột bên phải nhé!",
          time: "Vừa xong",
        },
      ]);
      updateFormState((prev) => ({
        ...prev,
        incident: {
          ...prev.incident,
          chronology: prev.incident.chronology
            ? `${prev.incident.chronology}\n- ${textToSend}`
            : textToSend,
        },
      }));
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      const blobOrBuffer = await buildComplaintDocx(formState);
      if (blobOrBuffer instanceof Blob) {
        downloadDocxInBrowser(blobOrBuffer, `don-to-giac-${formState.complainant.fullName || "toi-pham"}.docx`);
      }
    } catch (err) {
      alert("Không thể tạo file Word. Vui lòng thử lại!");
    }
  };

  const handleSelectAuthority = (auth: RecipientAuthority) => {
    updateFormState((prev) => ({
      ...prev,
      recipient: auth,
    }));
  };

  const handleResetAll = () => {
    if (window.confirm("Em có chắc chắn muốn xóa toàn bộ thông tin đã nhập trên thiết bị này không?")) {
      clearComplaintStateLocal();
      setFormState(createEmptyComplaintForm());
      setMessages([
        {
          id: "welcome-reset",
          sender: "ai",
          text: "Đã dọn dẹp sạch sẽ toàn bộ dữ liệu. Em có thể bắt đầu lại từ đầu bằng cách Quét CCCD hoặc nhắn tin cho anh/chị.",
          time: "Vừa xong",
        },
      ]);
    }
  };

  const { percentage } = calculateFormCompletionProgress(formState);

  return (
    <div className="legal-lookup-page-wrapper min-h-screen flex flex-col justify-between bg-[#FBF9F5] dark:bg-stone-950 text-slate-900 dark:text-stone-100">
      <SiteHeader currentPath="/tro-giup-phap-ly" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4 print:hidden">
          <Link href="/" className="hover:text-sky-600 transition-colors">
            Trang chủ
          </Link>
          <FaChevronRight className="w-2.5 h-2.5" />
          <Link href="/tro-giup-phap-ly" className="hover:text-sky-600 transition-colors">
            Trợ giúp pháp lý
          </Link>
          <FaChevronRight className="w-2.5 h-2.5" />
          <span className="text-slate-800 dark:text-slate-200 font-semibold">
            Hỗ trợ soạn đơn tố giác tội phạm
          </span>
        </nav>

        {/* Security Banner */}
        <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 shadow-2xs print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FaShieldHalved className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Cam kết bảo mật 100% (Zero-Knowledge Privacy)
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Dữ liệu cá nhân từ thẻ CCCD và nội dung đơn được lưu trữ cục bộ tại trình duyệt máy bạn, tuyệt đối không lưu trên hệ thống máy chủ.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Xóa toàn bộ dữ liệu phiên làm việc"
          >
            <FaTrashCan className="w-3 h-3" />
            <span className="hidden sm:inline">Xóa dữ liệu phiên</span>
          </button>
        </div>

        {/* 2-Column Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column Left: AI Chat Assistant (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-[760px] bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden print:hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 flex items-center justify-center">
                  <FaRobot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Trợ lý Pháp lý Đồng hành
                  </h2>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sẵn sàng hỗ trợ
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <FaQrcode className="w-3.5 h-3.5" />
                <span>Quét CCCD</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                      <FaRobot className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      m.sender === "user"
                        ? "bg-sky-600 text-white rounded-tr-xs shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-slate-800 dark:text-stone-200 rounded-tl-xs border border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.sender === "user" && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-stone-700 text-slate-600 dark:text-stone-300 flex items-center justify-center shrink-0 mt-0.5">
                      <FaUser className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}

              {isAiThinking && (
                <div className="flex gap-2.5 items-center text-slate-400 italic text-xs">
                  <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                    <FaRobot className="w-3 h-3" />
                  </div>
                  <span>Trợ lý đang phân tích và trích xuất dữ liệu vào đơn...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="p-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-sky-400 text-slate-600 dark:text-stone-300 text-[11px] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Kể về sự việc em đang gặp phải..."
                className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-hidden"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMsg.trim() || isAiThinking}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <FaPaperPlane className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Column Right: Live Preview A4 Document (7 cols) */}
          <div className="lg:col-span-7 h-[760px]">
            <ComplaintDocumentPreview
              state={formState}
              onDownloadDocx={handleDownloadDocx}
              onOpenGuidance={() => setIsGuidanceOpen(true)}
              progressPercentage={percentage}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {isScannerOpen && (
        <CccdQrScanner
          onDataParsed={handleCccdParsed}
          onCancel={() => setIsScannerOpen(false)}
        />
      )}

      {isGuidanceOpen && (
        <SubmissionGuidanceModal
          isOpen={isGuidanceOpen}
          onClose={() => setIsGuidanceOpen(false)}
          onSelectAuthority={handleSelectAuthority}
        />
      )}

      <SiteFooter />
    </div>
  );
}
