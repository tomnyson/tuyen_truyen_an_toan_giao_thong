import React from "react";
import {
  FaCapsules,
  FaSchool,
  FaGamepad,
  FaCarSide,
  FaMoneyBillWave,
  FaTriangleExclamation,
  FaCopyright,
  FaUserShield,
  FaComments,
  FaShieldHalved,
  FaDice,
  FaScaleUnbalanced,
  FaBan,
  FaBookOpen,
  FaScaleBalanced,
  FaLandmark,
  FaMotorcycle,
  FaGlobe,
  FaHeart,
  FaCircleQuestion,
  FaUsers,
  FaShieldVirus,
  FaGavel,
  FaCreditCard,
  FaFire,
  FaMasksTheater,
  FaBookBookmark,
} from "react-icons/fa6";

export type IconOption = {
  key: string;
  label: string;
  category: "phap_luat" | "an_ninh" | "xa_hoi" | "ky_thuat_so" | "tai_chinh";
};

export const TOPIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number | string }>> = {
  // Phòng chống ma túy
  FaCapsules,
  FaBan,
  FaShieldVirus,

  // An ninh trật tự trường học
  FaSchool,
  FaShieldHalved,
  FaUserShield,
  FaLandmark,

  // Game và không gian mạng
  FaGamepad,
  FaGlobe,
  FaComments,

  // Giao thông
  FaCarSide,
  FaMotorcycle,

  // Tài chính - tín dụng đen
  FaMoneyBillWave,
  FaScaleUnbalanced,
  FaCreditCard,

  // Phòng chống tệ nạn xã hội
  FaTriangleExclamation,
  FaDice,
  FaFire,

  // Sở hữu trí tuệ
  FaCopyright,
  FaBookOpen,
  FaBookBookmark,

  // Bổ sung chung
  FaScaleBalanced,
  FaGavel,
  FaUsers,
  FaHeart,
  FaMasksTheater,
  FaCircleQuestion,
};

export const POPULAR_TOPIC_ICONS: readonly IconOption[] = [
  { key: "FaCapsules", label: "Viên thuốc / Ma túy", category: "xa_hoi" },
  { key: "FaBan", label: "Cấm / Ngăn chặn", category: "xa_hoi" },
  { key: "FaSchool", label: "Trường học / An ninh", category: "an_ninh" },
  { key: "FaShieldHalved", label: "Khiên an ninh", category: "an_ninh" },
  { key: "FaUserShield", label: "Bảo vệ học sinh", category: "an_ninh" },
  { key: "FaGamepad", label: "Tay cầm game", category: "ky_thuat_so" },
  { key: "FaGlobe", label: "Không gian mạng", category: "ky_thuat_so" },
  { key: "FaComments", label: "Mạng xã hội", category: "ky_thuat_so" },
  { key: "FaCarSide", label: "Giao thông ô tô / xe máy", category: "xa_hoi" },
  { key: "FaMotorcycle", label: "Xe máy", category: "xa_hoi" },
  { key: "FaMoneyBillWave", label: "Tài chính / Tiền tệ", category: "tai_chinh" },
  { key: "FaScaleUnbalanced", label: "Lãi nặng / Tín dụng đen", category: "tai_chinh" },
  { key: "FaCreditCard", label: "Thẻ ngân hàng", category: "tai_chinh" },
  { key: "FaTriangleExclamation", label: "Cảnh báo tệ nạn", category: "xa_hoi" },
  { key: "FaDice", label: "Cờ bạc / Cá độ", category: "xa_hoi" },
  { key: "FaCopyright", label: "Bản quyền / SHTT", category: "phap_luat" },
  { key: "FaBookOpen", label: "Học tập / Sách vở", category: "phap_luat" },
  { key: "FaScaleBalanced", label: "Cán cân công lý", category: "phap_luat" },
  { key: "FaGavel", label: "Búa công lý", category: "phap_luat" },
  { key: "FaUsers", label: "Cộng đồng / Học đường", category: "an_ninh" },
];

export interface TopicIconProps {
  icon?: string;
  className?: string;
  size?: number | string;
  fallback?: string;
}

export function TopicIcon({
  icon,
  className = "w-4 h-4",
  size,
  fallback = "◉",
}: TopicIconProps) {
  if (!icon) {
    return <span className={className}>{fallback}</span>;
  }

  // Nếu icon là key trong bảng react-icons
  const IconComponent = TOPIC_ICON_MAP[icon];
  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // Trường hợp icon là chuỗi ký tự unicode cũ (◉, @, ⚠, ▣, ©, ★...)
  return <span className={className}>{icon}</span>;
}
