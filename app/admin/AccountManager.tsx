"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaUsers,
  FaUserGear,
  FaUserPen,
  FaUserCheck,
  FaPlus,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaTrashCan,
  FaShieldHalved,
  FaLock,
  FaUnlock,
  FaCheck,
  FaXmark,
  FaArrowsRotate,
  FaCircleCheck,
  FaCircleExclamation,
  FaLayerGroup,
} from "react-icons/fa6";
import { contentTopicNames } from "@/lib/topics";
import { TopicIcon } from "@/components/TopicIcon";

type AdminAccount = {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "editor" | "viewer";
  allowedTopics: string[];
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function AccountManager() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "editor" as "admin" | "editor" | "viewer",
    allowedTopics: [] as string[],
    status: "active" as "active" | "disabled",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/admin/api/accounts");
      if (!res.ok) {
        throw new Error("Không thể tải danh sách tài khoản");
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi tải dữ liệu tài khoản", "error");
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = accounts.length;
    const admins = accounts.filter((a) => a.role === "admin").length;
    const editors = accounts.filter((a) => a.role === "editor").length;
    const active = accounts.filter((a) => a.status === "active").length;
    return { total, admins, editors, active };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch =
        account.username.toLowerCase().includes(search.toLowerCase()) ||
        account.fullName.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || account.role === roleFilter;
      const matchStatus = statusFilter === "all" || account.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      username: "",
      fullName: "",
      password: "",
      role: "editor",
      allowedTopics: ["Giao thông"],
      status: "active",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (account: AdminAccount) => {
    setModalMode("edit");
    setEditingId(account.id);
    setFormData({
      username: account.username,
      fullName: account.fullName,
      password: "",
      role: account.role,
      allowedTopics: account.allowedTopics,
      status: account.status,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleToggleTopic = (topic: string) => {
    if (formData.allowedTopics.includes("*")) {
      // Đang có toàn quyền, nếu click bỏ thì chỉ giữ lại các topic khác ngoài topic này
      const remaining = contentTopicNames.filter((t) => t !== topic);
      setFormData((prev) => ({ ...prev, allowedTopics: remaining }));
      return;
    }

    if (formData.allowedTopics.includes(topic)) {
      setFormData((prev) => ({
        ...prev,
        allowedTopics: prev.allowedTopics.filter((t) => t !== topic),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        allowedTopics: [...prev.allowedTopics, topic],
      }));
    }
  };

  const handleSelectAllTopics = () => {
    if (formData.allowedTopics.includes("*") || formData.allowedTopics.length === contentTopicNames.length) {
      setFormData((prev) => ({ ...prev, allowedTopics: [] }));
    } else {
      setFormData((prev) => ({ ...prev, allowedTopics: ["*"] }));
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (modalMode === "create") {
      if (!formData.username.trim() || !formData.password) {
        setErrorMsg("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.");
        return;
      }
      if (formData.password.length < 6) {
        setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const url = "/admin/api/accounts";
      const method = modalMode === "create" ? "POST" : "PUT";
      const payload: any = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim() || formData.username.trim(),
        role: formData.role,
        allowedTopics: formData.role === "admin" ? ["*"] : formData.allowedTopics,
        status: formData.status,
      };

      if (modalMode === "edit") {
        payload.id = editingId;
        if (formData.password) {
          payload.password = formData.password;
        }
      } else {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Thao tác không thành công.");
      }

      showToast(
        modalMode === "create"
          ? `Tạo tài khoản "${formData.username}" thành công!`
          : `Cập nhật tài khoản "${formData.username}" thành công!`,
      );
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi lưu thông tin tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch("/admin/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa tài khoản.");
      }
      showToast(`Đã xóa tài khoản "${deleteTarget.username}".`);
      setDeleteTarget(null);
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa tài khoản.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const isAllTopicsSelected =
    formData.allowedTopics.includes("*") ||
    contentTopicNames.every((t) => formData.allowedTopics.includes(t));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium transition-all ${
            toastMsg.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toastMsg.type === "success" ? (
            <FaCircleCheck className="text-lg" />
          ) : (
            <FaCircleExclamation className="text-lg" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FaUserGear className="text-indigo-600 dark:text-indigo-400" />
            Tài khoản & Phân quyền chuyên mục
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản trị danh sách nhân sự, phân cấp vai trò và giới hạn quyền biên tập theo từng chuyên đề pháp luật
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            title="Làm mới danh sách"
          >
            <FaArrowsRotate className={`${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <FaPlus /> Thêm tài khoản mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">
            <FaUsers />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng tài khoản</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-lg">
            <FaShieldHalved />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.admins}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Quản trị viên (Admin)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg">
            <FaUserPen />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.editors}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Biên tập viên (Editor)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-lg">
            <FaUserCheck />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.active}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang hoạt động</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Tìm theo username, họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="editor">Biên tập viên (Editor)</option>
            <option value="viewer">Người xem (Viewer)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Tạm khóa</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
            <FaArrowsRotate className="animate-spin text-2xl text-indigo-500" />
            <span className="text-sm">Đang tải danh sách tài khoản...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <FaUsers className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Không tìm thấy tài khoản nào</p>
            <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc thêm tài khoản mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Người dùng</th>
                  <th className="px-4 py-3.5">Vai trò</th>
                  <th className="px-4 py-3.5">Phân quyền chuyên mục</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Đăng nhập cuối</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredAccounts.map((acc) => {
                  const isSuper = acc.role === "admin" || acc.allowedTopics.includes("*");
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {acc.fullName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          @{acc.username}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {acc.role === "admin" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <FaShieldHalved className="text-2xs" /> Quản trị viên
                          </span>
                        )}
                        {acc.role === "editor" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <FaUserPen className="text-2xs" /> Biên tập viên
                          </span>
                        )}
                        {acc.role === "viewer" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Người xem
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <FaCheck className="text-xs" /> Toàn bộ chuyên mục (*)
                          </span>
                        ) : acc.allowedTopics.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Chưa cấp chuyên mục nào</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {acc.allowedTopics.slice(0, 3).map((topic) => (
                              <span
                                key={topic}
                                className="inline-flex items-center gap-1 text-2xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md"
                              >
                                <TopicIcon topicName={topic} size={11} />
                                {topic}
                              </span>
                            ))}
                            {acc.allowedTopics.length > 3 && (
                              <span className="text-2xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md">
                                +{acc.allowedTopics.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {acc.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                            <FaLock className="text-2xs" /> Tạm khóa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {acc.lastLoginAt
                          ? new Date(acc.lastLoginAt).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Chưa đăng nhập"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                            title="Chỉnh sửa tài khoản"
                          >
                            <FaPenToSquare />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(acc)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                            title="Xóa tài khoản"
                          >
                            <FaTrashCan />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {modalMode === "create" ? (
                  <>
                    <FaPlus className="text-indigo-600 text-sm" /> Thêm tài khoản mới
                  </>
                ) : (
                  <>
                    <FaPenToSquare className="text-indigo-600 text-sm" /> Chỉnh sửa tài khoản
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <FaXmark className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
                  <FaCircleExclamation className="text-sm shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên đăng nhập (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    placeholder="vd: bientap_giaothong"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Họ và tên hiển thị *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {modalMode === "create" ? "Mật khẩu *" : "Mật khẩu mới (bỏ trống nếu giữ nguyên)"}
                </label>
                <input
                  type="password"
                  placeholder={modalMode === "create" ? "Ít nhất 6 ký tự" : "Nhập mật khẩu mới..."}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vai trò hệ thống *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="editor">Biên tập viên (Editor)</option>
                    <option value="admin">Quản trị viên (Admin - Toàn quyền)</option>
                    <option value="viewer">Người xem (Viewer - Chỉ đọc)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái tài khoản *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="active">Hoạt động bình thường</option>
                    <option value="disabled">Tạm khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* Phân quyền chuyên mục Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FaLayerGroup className="text-indigo-600" />
                    Phân quyền chuyên mục được phép quản lý
                  </label>
                  {formData.role !== "admin" && (
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isAllTopicsSelected ? "Bỏ chọn tất cả" : "Chọn tất cả chuyên mục"}
                    </button>
                  )}
                </div>

                {formData.role === "admin" ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-purple-700 dark:text-purple-300">
                    <span className="font-semibold">Lưu ý:</span> Tài khoản Quản trị viên (Admin) tự động có toàn quyền thao tác trên toàn bộ 10 chuyên mục và toàn bộ cấu hình hệ thống.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                    {contentTopicNames.map((topic) => {
                      const isChecked =
                        formData.allowedTopics.includes("*") ||
                        formData.allowedTopics.includes(topic);
                      return (
                        <label
                          key={topic}
                          onClick={() => handleToggleTopic(topic)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs font-medium transition-colors select-none ${
                            isChecked
                              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                          />
                          <TopicIcon topicName={topic} size={12} className="shrink-0" />
                          <span className="truncate">{topic}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {submitting && <FaArrowsRotate className="animate-spin text-xs" />}
                  {modalMode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-rose-600">
              <FaTrashCan /> Xác nhận xóa tài khoản
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Bạn có chắc chắn muốn xóa tài khoản <strong>@{deleteTarget.username}</strong> ({deleteTarget.fullName}) khỏi hệ thống? Thao tác này sẽ ghi nhận vào nhật ký kiểm toán và không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {deleting && <FaArrowsRotate className="animate-spin text-xs" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
