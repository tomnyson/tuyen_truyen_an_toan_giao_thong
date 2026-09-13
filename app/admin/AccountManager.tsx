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
import { contentTopicNames, contentTopics } from "@/lib/topics";
import { TopicIcon } from "@/components/TopicIcon";

function getTopicIconKey(topicName: string): string {
  const found = contentTopics.find((t) => t.name === topicName);
  return found?.icon || "FaLayerGroup";
}

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
    setFormData((prev) => {
      const currentAllowed = prev.allowedTopics.includes("*")
        ? [...contentTopicNames]
        : prev.allowedTopics;

      const alreadyHas = currentAllowed.includes(topic);
      let nextAllowed: string[];

      if (alreadyHas) {
        nextAllowed = currentAllowed.filter((t) => t !== topic);
      } else {
        nextAllowed = [...currentAllowed, topic];
        if (contentTopicNames.every((t) => nextAllowed.includes(t))) {
          nextAllowed = ["*"];
        }
      }

      return {
        ...prev,
        allowedTopics: nextAllowed,
      };
    });
  };

  const handleSelectAllTopics = () => {
    setFormData((prev) => {
      const isAll =
        prev.allowedTopics.includes("*") ||
        (contentTopicNames.length > 0 &&
          contentTopicNames.every((t) => prev.allowedTopics.includes(t)));
      return {
        ...prev,
        allowedTopics: isAll ? [] : ["*"],
      };
    });
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
      {/* Toast / Alert Notification */}
      {toastMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm shadow-xs border ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === "success" ? (
              <FaCircleCheck className="text-emerald-600 shrink-0 text-base" />
            ) : (
              <FaCircleExclamation className="text-rose-600 shrink-0 text-base" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header Banner - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
            <span>QUẢN TRỊ HỆ THỐNG</span>
            <span>/</span>
            <span>TÀI KHOẢN &amp; PHÂN QUYỀN</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tài khoản &amp; Phân quyền chuyên mục</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Quản trị danh sách nhân sự, phân cấp vai trò và giới hạn quyền biên tập theo từng chuyên đề pháp luật.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAccounts}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FaArrowsRotate className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - Standard Stitch Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Tổng số tài khoản</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs font-medium text-slate-400">nhân sự</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Quản trị viên (Admin)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-purple-600">{stats.admins}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Toàn quyền</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Biên tập viên (Editor)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-sky-600">{stats.editors}</span>
            <span className="text-xs font-medium text-slate-400">theo chuyên đề</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Đang hoạt động</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{stats.active}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Kích hoạt</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "all", label: "Tất cả vai trò" },
              { key: "admin", label: "Quản trị viên" },
              { key: "editor", label: "Biên tập viên" },
              { key: "viewer", label: "Người xem" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setRoleFilter(filter.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                roleFilter === filter.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer ml-1"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Tạm khóa</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo username, họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-sky-500 focus:bg-white"
          />
          <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Accounts Table - Standard Stitch Design */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FaArrowsRotate className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-600" />
            Đang tải danh sách tài khoản...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FaUsers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Không tìm thấy tài khoản nào</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc thêm tài khoản mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Phân quyền chuyên mục
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Đăng nhập cuối
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {filteredAccounts.map((acc) => {
                  const isSuper = acc.role === "admin" || acc.allowedTopics.includes("*");
                  return (
                    <tr
                      key={acc.id}
                      className="border-b border-stone-100 hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {acc.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          @{acc.username}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {acc.role === "admin" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <FaShieldHalved className="text-[10px]" /> Quản trị viên
                          </span>
                        )}
                        {acc.role === "editor" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <FaUserPen className="text-[10px]" /> Biên tập viên
                          </span>
                        )}
                        {acc.role === "viewer" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Người xem
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <FaCheck className="text-[10px]" /> Toàn bộ chuyên mục (*)
                          </span>
                        ) : acc.allowedTopics.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Chưa cấp chuyên mục nào</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {acc.allowedTopics.slice(0, 3).map((topic) => (
                              <span
                                key={topic}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 text-slate-700 px-2 py-0.5 rounded-md border border-stone-200"
                              >
                                <TopicIcon icon={getTopicIconKey(topic)} size={11} />
                                {topic}
                              </span>
                            ))}
                            {acc.allowedTopics.length > 3 && (
                              <span className="text-[11px] font-medium bg-stone-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                                +{acc.allowedTopics.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {acc.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <FaLock className="text-[10px]" /> Tạm khóa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {acc.lastLoginAt
                          ? new Date(acc.lastLoginAt).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Chưa đăng nhập"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa tài khoản"
                          >
                            <FaPenToSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(acc)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <FaTrashCan className="w-3.5 h-3.5" />
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

      {/* Modal Thêm / Chỉnh sửa - Stitch Design */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-0.5">
                  {modalMode === "create" ? "TẠO MỚI NHÂN SỰ" : "CẬP NHẬT THÔNG TIN"}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === "create" ? "Thêm tài khoản quản trị mới" : "Chỉnh sửa tài khoản"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer p-1"
              >
                <FaXmark />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <FaCircleExclamation className="text-sm shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên đăng nhập (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    placeholder="vd: bientap_giaothong"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Họ và tên hiển thị *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {modalMode === "create" ? "Mật khẩu *" : "Mật khẩu mới (bỏ trống nếu giữ nguyên)"}
                </label>
                <input
                  type="password"
                  placeholder={modalMode === "create" ? "Ít nhất 6 ký tự" : "Nhập mật khẩu mới nếu muốn đổi..."}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vai trò hệ thống *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
                  >
                    <option value="editor">Biên tập viên (Editor)</option>
                    <option value="admin">Quản trị viên (Admin - Toàn quyền)</option>
                    <option value="viewer">Người xem (Viewer - Chỉ đọc)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Trạng thái tài khoản *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
                  >
                    <option value="active">Hoạt động bình thường</option>
                    <option value="disabled">Tạm khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* Phân quyền chuyên mục Section */}
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FaLayerGroup className="text-sky-600" />
                    Phân quyền chuyên mục được phép quản lý
                  </label>
                  {formData.role !== "admin" && (
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                    >
                      {isAllTopicsSelected ? "Bỏ chọn tất cả" : "Chọn tất cả chuyên mục"}
                    </button>
                  )}
                </div>

                {formData.role === "admin" ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                    <span className="font-semibold">Lưu ý:</span> Tài khoản Quản trị viên (Admin) tự động có toàn quyền thao tác trên toàn bộ các chuyên đề pháp luật và cấu hình hệ thống.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-lg border border-stone-200">
                    {contentTopicNames.map((topic) => {
                      const isChecked =
                        formData.allowedTopics.includes("*") ||
                        formData.allowedTopics.includes(topic);
                      return (
                        <label
                          key={topic}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-medium transition-colors select-none ${
                            isChecked
                              ? "bg-sky-50 text-sky-900 border border-sky-200"
                              : "hover:bg-stone-100 text-slate-700 border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTopic(topic)}
                            className="w-4 h-4 text-sky-600 rounded border-stone-300 focus:ring-sky-500 cursor-pointer"
                          />
                          <TopicIcon icon={getTopicIconKey(topic)} size={12} className="shrink-0" />
                          <span className="truncate">{topic}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <FaArrowsRotate className="animate-spin text-xs" />}
                  {modalMode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa - Stitch Design */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <FaTrashCan /> Xác nhận xóa tài khoản
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản <strong>@{deleteTarget.username}</strong> ({deleteTarget.fullName}) khỏi hệ thống? Thao tác này sẽ ghi nhận vào nhật ký kiểm toán và không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
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
