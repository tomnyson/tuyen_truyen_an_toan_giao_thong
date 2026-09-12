"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaClockRotateLeft,
  FaMagnifyingGlass,
  FaArrowsRotate,
  FaShieldHalved,
  FaUser,
  FaRightToBracket,
  FaRightFromBracket,
  FaCircleExclamation,
  FaPlus,
  FaPenToSquare,
  FaTrashCan,
  FaUserGear,
  FaFilter,
  FaFileLines,
} from "react-icons/fa6";

type AuditLog = {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
};

export function AuditLogManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("all");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [actionCategory]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = "/admin/api/audit-logs?limit=100";
      if (actionCategory !== "all") {
        url += `&action=${encodeURIComponent(actionCategory)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không thể tải nhật ký kiểm toán");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.total || (data.logs ? data.logs.length : 0));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = totalCount || logs.length;
    const authLogs = logs.filter((l) => l.action.startsWith("LOGIN") || l.action === "LOGOUT").length;
    const accountLogs = logs.filter((l) => l.action.includes("ACCOUNT") || l.action.includes("PERM")).length;
    const contentLogs = logs.filter((l) => l.action.includes("LAW") || l.action.includes("SHOWCASE") || l.action.includes("TOPIC")).length;
    return { total, authLogs, accountLogs, contentLogs };
  }, [logs, totalCount]);

  // Client search
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const query = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.actor.toLowerCase().includes(query) ||
        l.details.toLowerCase().includes(query) ||
        l.action.toLowerCase().includes(query) ||
        l.targetId.toLowerCase().includes(query),
    );
  }, [logs, search]);

  const getActionBadge = (action: string) => {
    if (action === "LOGIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <FaRightToBracket className="text-2xs" /> Đăng nhập
        </span>
      );
    }
    if (action === "LOGOUT") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <FaRightFromBracket className="text-2xs" /> Đăng xuất
        </span>
      );
    }
    if (action === "LOGIN_FAILED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <FaCircleExclamation className="text-2xs" /> Đăng nhập thất bại
        </span>
      );
    }
    if (action.startsWith("CREATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <FaPlus className="text-2xs" /> {action.replace("CREATE_", "Thêm ")}
        </span>
      );
    }
    if (action.startsWith("UPDATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <FaPenToSquare className="text-2xs" /> {action.replace("UPDATE_", "Sửa ")}
        </span>
      );
    }
    if (action.startsWith("DELETE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <FaTrashCan className="text-2xs" /> {action.replace("DELETE_", "Xóa ")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FaClockRotateLeft className="text-indigo-600 dark:text-indigo-400" />
            Lịch sử hệ thống (Audit Logs)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi nhật ký kiểm toán bất biến của mọi thao tác quản trị, biên tập nội dung và truy cập hệ thống
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <FaArrowsRotate className={`${loading ? "animate-spin text-indigo-600" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">
            <FaClockRotateLeft />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng lượt sự kiện</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-lg">
            <FaRightToBracket />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.authLogs}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Xác thực & Phiên</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-lg">
            <FaUserGear />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.accountLogs}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Quản trị tài khoản</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg">
            <FaFileLines />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.contentLogs}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Thao tác nội dung</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, chi tiết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <FaFilter className="text-slate-400 text-xs hidden sm:block" />
          <select
            value={actionCategory}
            onChange={(e) => setActionCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả loại hành động</option>
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
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
            <FaArrowsRotate className="animate-spin text-2xl text-indigo-500" />
            <span className="text-sm">Đang tải nhật ký kiểm toán...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <FaClockRotateLeft className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Không có bản ghi nhật ký nào</p>
            <p className="text-xs mt-1">Các thao tác trên hệ thống sẽ được tự động ghi lại tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Người thực hiện</th>
                  <th className="px-4 py-3.5">Hành động</th>
                  <th className="px-4 py-3.5">Đối tượng</th>
                  <th className="px-5 py-3.5">Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-sans">
                {filteredLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 text-xs">
                          <FaUser className="text-slate-400 text-2xs" />
                          <span>{log.actor}</span>
                          <span className="text-2xs px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
                            {log.actorRole}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          {log.targetType}: {log.targetId || "system"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-md break-words">
                        {log.details}
                        {log.ipAddress && (
                          <span className="ml-2 text-2xs font-mono text-slate-400">
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
