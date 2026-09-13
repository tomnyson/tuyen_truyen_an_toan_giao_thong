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
  FaRobot,
  FaUser,
  FaChevronRight,
  FaTrashCan,
  FaPaperclip,
  FaPhone,
  FaScaleBalanced,
} from "react-icons/fa6";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  isExtractedUpdate?: boolean;
  extractedBadges?: string[];
}

const QUICK_PROMPTS = [
  "Lừa đảo qua mạng",
  "Bị bạn cùng trường đe dọa đánh & chặn đường",
  "Tống tiền bằng ảnh riêng tư",
  "Mượn tài khoản ngân hàng",
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
      text: "Chào em, em đừng quá lo lắng nhé. Trợ lý ở đây để bảo vệ quyền lợi hợp pháp cho em. Em hãy kể lại tóm tắt sự việc đang gặp phải: Ai là người đã làm tổn hại/lừa dối em, hành vi cụ thể là gì và diễn ra vào thời gian nào?",
      time: "Vừa xong",
    },
  ]);

  const chatListRef = useRef<HTMLDivElement>(null);

  // Load state từ local session khi mở trang
  useEffect(() => {
    const saved = loadComplaintStateLocal();
    if (saved) {
      setFormState(saved);
    }
  }, []);

  // Tự động cuộn chat nội bộ
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
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
        isExtractedUpdate: true,
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
        let hasExtracted = false;

        if (data.extractedFields) {
          updateFormState((prev) => {
            const next = { ...prev };
            if (data.extractedFields.incident) {
              next.incident = { ...next.incident, ...data.extractedFields.incident };
              hasExtracted = true;
            }
            if (data.extractedFields.accused) {
              next.accused = { ...next.accused, ...data.extractedFields.accused };
              hasExtracted = true;
            }
            if (data.extractedFields.evidence?.items) {
              const mergedItems = Array.from(
                new Set([...next.evidence.items, ...data.extractedFields.evidence.items]),
              );
              next.evidence = { ...next.evidence, items: mergedItems };
              hasExtracted = true;
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
            isExtractedUpdate: hasExtracted,
            extractedBadges: data.extractedSummary,
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
          isExtractedUpdate: true,
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
    } catch {
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
          text: "Đã dọn dẹp sạch sẽ toàn bộ dữ liệu phiên. Em có thể bắt đầu lại từ đầu bằng cách Quét CCCD hoặc nhắn tin cho anh/chị.",
          time: "Vừa xong",
        },
      ]);
    }
  };

  const handleFieldChange = (path: string, value: any) => {
    updateFormState((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      if (parts.length === 1) {
        (next as any)[parts[0]] = value;
      } else if (parts.length === 2) {
        (next as any)[parts[0]] = {
          ...(next as any)[parts[0]],
          [parts[1]]: value,
        };
      }
      return next;
    });
  };

  const { percentage } = calculateFormCompletionProgress(formState);

  return (
    <div className="legal-lookup-page-wrapper min-h-screen flex flex-col justify-between bg-[#FAF6F0] text-stone-800">
      <div className="print:hidden">
        <SiteHeader currentPath="/tro-giup-phap-ly" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 print:p-0 print:max-w-none print:mx-0">
        {/* Breadcrumb & System Sub-nav */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 mb-4 print:hidden">
          <Link href="/" className="hover:text-stone-800 transition-colors">
            Trang chủ
          </Link>
          <span className="text-stone-400">›</span>
          <Link href="/tro-giup-phap-ly" className="hover:text-stone-800 transition-colors">
            Trợ giúp pháp lý
          </Link>
          <span className="text-stone-400">›</span>
          <span className="font-semibold text-[#B84724]">
            Hỗ trợ soạn đơn tố giác tội phạm
          </span>
        </nav>

        {/* Security Guarantee Banner (Stitch Design Standard) */}
        <section className="bg-[#EFF8F3] border border-[#BDE5D2] rounded-2xl p-3.5 sm:px-5 mb-5 shadow-warm-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-stone-700 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FaShieldHalved className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-emerald-950">
                  Cam kết bảo mật 100% (Zero-Knowledge Privacy)
                </h2>
                <span className="hidden sm:inline-flex bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  An toàn tuyệt đối
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                Dữ liệu cá nhân từ thẻ CCCD và nội dung khai báo chỉ được xử lý và lưu tạm cục bộ trong trình duyệt máy bạn, tuyệt đối không lưu trữ trên máy chủ công cộng.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAll}
            type="button"
            className="text-xs font-semibold text-stone-600 hover:text-red-700 hover:bg-emerald-100/60 transition-colors px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ml-auto shrink-0 cursor-pointer"
            title="Xóa toàn bộ dữ liệu phiên làm việc"
          >
            <FaTrashCan className="w-3.5 h-3.5 text-stone-500 hover:text-red-600" />
            <span>Xóa dữ liệu phiên</span>
          </button>
        </section>

        {/* Main Dual Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Legal Assistant Chatbot & Guidance (5 Cols) */}
          <section className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-[#EFE5DA] shadow-warm-md overflow-hidden h-[740px] print:hidden">
            {/* Assistant Header */}
            <div className="p-4 bg-gradient-to-r from-[#FAF5F0] via-white to-[#FAF5F0] border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B84724]/10 border border-[#B84724]/20 flex items-center justify-center text-[#B84724] shadow-sm">
                  <svg className="w-5 h-5 text-[#B84724]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight uppercase">
                    TRỢ LÝ PHÁP LÝ ĐỒNG HÀNH
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Sẵn sàng lắng nghe & hỗ trợ em
                  </p>
                </div>
              </div>

              {/* CCCD Scan Action */}
              <button
                onClick={() => setIsScannerOpen(true)}
                type="button"
                className="btn-scan-cccd inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#B84724]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Quét CCCD</span>
              </button>
            </div>

            {/* Chat Conversation Stream */}
            <div
              ref={chatListRef}
              className="flex-1 p-4 overflow-y-auto space-y-4 text-sm bg-[#FCFAF8]"
              data-purpose="chat-messages-container"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.sender === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-[#B84724] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-orange-200">
                      AI
                    </div>
                  )}

                  <div
                    className={
                      m.sender === "user"
                        ? "bg-gradient-to-r from-[#B84724] to-stone-800 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm max-w-[80%] leading-relaxed text-sm"
                        : "bg-white border border-stone-200/90 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-stone-800 max-w-[85%] leading-relaxed"
                    }
                  >
                    {m.sender === "ai" && (
                      <p className="font-medium text-[#B84724] mb-1 text-xs">
                        Luật sư ảo hỗ trợ học sinh:
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {m.isExtractedUpdate && (
                      <div className="mt-2.5 pt-2 border-t border-stone-200/80">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                          <span>✍️ Tự động cập nhật vào đơn:</span>
                        </div>
                        {m.extractedBadges && m.extractedBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {m.extractedBadges.map((badge, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 italic">
                            Bản thảo đơn tố giác phía bên phải đã được tự động cập nhật vào các mục tương ứng.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {m.sender === "user" && (
                    <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
                      Em
                    </div>
                  )}
                </div>
              ))}

              {isAiThinking && (
                <div className="flex items-start gap-3 text-xs text-stone-500 italic">
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-[#B84724] flex items-center justify-center shrink-0">
                    <FaRobot className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-200">
                    <span>Trợ lý đang phân tích và trích xuất dữ liệu vào đơn...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion Chips & Prompt Quick-Pills */}
            <div className="p-2.5 bg-stone-50 border-t border-stone-200">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1 mb-1.5">
                Gợi ý nhanh theo tình huống phổ biến:
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    type="button"
                    className="btn-quick-pill whitespace-nowrap px-3 py-1 text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Field */}
            <div className="p-3.5 bg-white border-t border-stone-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Kể về sự việc em đang gặp phải (ví dụ: bị đe dọa, bị lừa chuyển khoản...)"
                  className="w-full pl-4 pr-24 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#B84724]/30 focus:border-[#B84724] placeholder-stone-400"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => alert("Em có thể gõ mô tả các tài liệu/ảnh chụp bằng chứng vào ô chat, Trợ lý sẽ tự động trích xuất vào mục Chứng cứ đính kèm của đơn.")}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
                    title="Đính kèm thông tin bằng chứng"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={!inputMsg.trim() || isAiThinking}
                    className="btn-brand-rust p-2 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                    title="Gửi phản hồi"
                  >
                    <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-stone-400">
                <span>Nhấn Enter để gửi phản hồi</span>
                <span className="text-stone-500 font-medium">Bảo mật chuẩn luật trợ giúp pháp lý</span>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Real-Time A4 Document Preview (7 Cols) */}
          <div className="lg:col-span-7 h-[740px]">
            <ComplaintDocumentPreview
              state={formState}
              onFieldChange={handleFieldChange}
              onDownloadDocx={handleDownloadDocx}
              onOpenGuidance={() => setIsGuidanceOpen(true)}
              progressPercentage={percentage}
            />
          </div>
        </div>

        {/* Civic Hotline Bar (Stitch Design Standard) */}
        <section className="mt-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-warm-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg shrink-0">
              <FaPhone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">
                Đường dây nóng khẩn cấp & tư vấn bảo vệ trẻ em, học sinh 24/7
              </h4>
              <p className="text-xs text-stone-500">
                Nếu bạn đang bị đe dọa bạo lực hoặc nguy hiểm ngay lập tức, hãy gọi ngay đường dây khẩn cấp miễn phí:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="tel:111"
              className="px-3.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              Tổng đài 111 (Bảo vệ trẻ em)
            </a>
            <a
              href="tel:113"
              className="px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              113 (Công an khẩn cấp)
            </a>
            <a
              href="tel:115"
              className="px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold border border-stone-300 flex items-center gap-1.5 transition-colors"
            >
              115 (Cấp cứu y tế)
            </a>
          </div>
        </section>
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

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
