"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaClockRotateLeft,
  FaMagnifyingGlass,
  FaFilter,
  FaArrowsRotate,
  FaUser,
  FaRightToBracket,
  FaRightFromBracket,
  FaUserGear,
  FaFileLines,
  FaPenToSquare,
  FaTrashCan,
  FaPlus,
  FaCircleExclamation,
  FaCircleCheck,
} from "react-icons/fa6";

type AuditLog = {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
};

export function AuditLogManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [actionCategory]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (actionCategory !== "all") {
        params.set("action", actionCategory);
      }

      const res = await fetch(`/admin/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Không thể tải danh sách nhật ký kiểm toán");
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối khi tải lịch sử hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const authLogs = logs.filter((l) => l.action.startsWith("LOGIN") || l.action === "LOGOUT").length;
    const accountLogs = logs.filter((l) => l.action.includes("ACCOUNT")).length;
    const contentLogs = logs.filter((l) => l.action.includes("LAW") || l.action.includes("SHOWCASE")).length;
    return {
      total,
      authLogs,
      accountLogs,
      contentLogs,
    };
  }, [logs, total]);

  // Client-side search filtering
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (log) =>
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.targetType.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const getActionBadge = (action: string) => {
    if (action === "LOGIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FaRightToBracket className="text-[10px]" /> Đăng nhập
        </span>
      );
    }
    if (action === "LOGOUT") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <FaRightFromBracket className="text-[10px]" /> Đăng xuất
        </span>
      );
    }
    if (action === "LOGIN_FAILED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <FaCircleExclamation className="text-[10px]" /> Đăng nhập thất bại
        </span>
      );
    }
    if (action.startsWith("CREATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <FaPlus className="text-[10px]" /> {action.replace("CREATE_", "Thêm ")}
        </span>
      );
    }
    if (action.startsWith("UPDATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <FaPenToSquare className="text-[10px]" /> {action.replace("UPDATE_", "Sửa ")}
        </span>
      );
    }
    if (action.startsWith("DELETE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <FaTrashCan className="text-[10px]" /> {action.replace("DELETE_", "Xóa ")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-stone-100 text-slate-700 border border-stone-200">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {notice && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <FaCircleCheck className="text-emerald-600 shrink-0 text-base" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <FaCircleExclamation className="text-rose-600 shrink-0 text-base" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Header Banner - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
            <span>HỆ THỐNG</span>
            <span>/</span>
            <span>NHẬT KÝ KIỂM TOÁN</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lịch sử hệ thống (Audit Logs)</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Theo dõi nhật ký kiểm toán bất biến của mọi thao tác quản trị, biên tập nội dung và truy cập hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FaArrowsRotate className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới nhật ký</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - Standard Stitch Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Tổng lượt sự kiện</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs font-medium text-slate-400">bản ghi</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Xác thực &amp; Phiên</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{stats.authLogs}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Đăng nhập</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Quản trị tài khoản</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-purple-600">{stats.accountLogs}</span>
            <span className="text-xs font-medium text-slate-400">phân quyền</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Thao tác nội dung</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-sky-600">{stats.contentLogs}</span>
            <span className="text-xs font-medium text-slate-400">bài viết / luật</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "all", label: "Tất cả sự kiện" },
              { key: "LOGIN", label: "Đăng nhập" },
              { key: "CREATE_ACCOUNT", label: "Tài khoản" },
              { key: "CREATE_LAW", label: "Bài học luật" },
              { key: "CREATE_SHOWCASE", label: "Tình huống" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActionCategory(filter.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                actionCategory === filter.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}

          <select
            value={actionCategory}
            onChange={(e) => setActionCategory(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer ml-1"
          >
            <option value="all">Chi tiết loại hành động...</option>
            <option value="LOGIN">Đăng nhập</option>
            <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
            <option value="LOGOUT">Đăng xuất</option>
            <option value="CREATE_ACCOUNT">Tạo tài khoản</option>
            <option value="UPDATE_ACCOUNT">Cập nhật tài khoản</option>
            <option value="DELETE_ACCOUNT">Xóa tài khoản</option>
            <option value="CREATE_LAW">Thêm bài học luật</option>
            <option value="UPDATE_LAW">Sửa bài học luật</option>
            <option value="DELETE_LAW">Xóa bài học luật</option>
            <option value="CREATE_SHOWCASE">Thêm tình huống thực tế</option>
            <option value="UPDATE_SHOWCASE">Sửa tình huống thực tế</option>
            <option value="DELETE_SHOWCASE">Xóa tình huống thực tế</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, chi tiết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 focus:bg-white"
          />
          <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Logs Table - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FaArrowsRotate className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-600" />
            Đang tải nhật ký kiểm toán...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FaClockRotateLeft className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Không có bản ghi nhật ký nào</p>
            <p className="text-xs text-slate-400 mt-1">Các thao tác trên hệ thống sẽ được tự động ghi lại tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Người thực hiện
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Hành động
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Đối tượng
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Nội dung chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {filteredLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-stone-100 hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                          <FaUser className="text-slate-400 text-[10px]" />
                          <span>{log.actor}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-stone-100 rounded text-slate-500 border border-stone-200 font-medium">
                            {log.actorRole}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-medium">
                          {log.targetType}: {log.targetId || "system"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-md break-words">
                        {log.details}
                        {log.ipAddress && (
                          <span className="ml-2 text-[11px] font-mono text-slate-400">
                            ({log.ipAddress})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
