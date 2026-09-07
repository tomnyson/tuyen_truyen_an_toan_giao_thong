// Bộ biểu tượng vẽ tay theo bản thiết kế: nét 1.8, đầu bo tròn, cùng khung 24.
// Tự vẽ thay vì kéo thư viện icon để giữ đúng độ dày nét và tránh phụ thuộc mới.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ScalesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16M7 20h10M5 8h14M12 4.6 5.6 7.4M12 4.6l6.4 2.8" />
    <path d="M5.6 7.6 2.8 14h5.6zM18.4 7.6 15.6 14h5.6" />
    <path d="M2.8 14a2.8 2.8 0 0 0 5.6 0M15.6 14a2.8 2.8 0 0 0 5.6 0" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
  </Icon>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </Icon>
);

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.4 2.8 4.8 13.4h5.6l-.8 7.8 8.6-10.6h-5.6z" />
  </Icon>
);

export const WarningIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.4v4M12 17.1h.01" />
  </Icon>
);

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.2 4.6h5.3A3.5 3.5 0 0 1 12 8.1v11a2.6 2.6 0 0 0-2.6-2.6H3.2Z" />
    <path d="M20.8 4.6h-5.3A3.5 3.5 0 0 0 12 8.1v11a2.6 2.6 0 0 1 2.6-2.6h6.2Z" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.4 12S5.9 5.8 12 5.8 21.6 12 21.6 12 18.1 18.2 12 18.2 2.4 12 2.4 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </Icon>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon fill={filled ? "currentColor" : "none"} {...p}>
    <path d="M12 20.2S3.8 15.4 3.8 9.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.2 2.3c0 5.8-8.2 10.6-8.2 10.6Z" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.6 11.6a8.2 8.2 0 0 1-11.9 7.3l-5 1.4 1.4-4.9a8.2 8.2 0 1 1 15.5-3.8Z" />
    <path d="M9 10.5h6M9 14h4" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.8 12.6 4.6 4.6L19.2 7.4" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="m8 12.3 2.7 2.7L16 9.7" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.1 3.6 9.9 8l-2.1 1.6a11.4 11.4 0 0 0 6.6 6.6L16 14.1l4.4 1.8v3.1a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 3 7.8a2 2 0 0 1 2-2.2h3.1Z" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.6v10.8M7.8 10.6 12 14.8l4.2-4.2M4.4 19.4h15.2" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.6}>
    <circle cx="12" cy="12" r="9.4" fill="currentColor" stroke="none" />
    <path d="m10.2 8.6 5.6 3.4-5.6 3.4z" fill="#b8432a" stroke="none" />
  </Icon>
);

// Play viền tròn — dùng trên nền đặc (nút CTA) nên chỉ dùng currentColor.
export const PlayCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="m10.2 8.4 5.4 3.6-5.4 3.6z" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 7.3V12l3.1 1.9" />
  </Icon>
);

export const MedalIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="14.6" r="5.2" />
    <path d="M8.6 9.8 6.4 3.4h11.2l-2.2 6.4M12 12.6l.7 1.5 1.6.2-1.2 1.2.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.2 1.6-.2z" />
  </Icon>
);

export const TrafficIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.4 14.6a7.6 7.6 0 0 1 15.2 0" />
    <path d="M2.8 14.6h18.4M6.6 18.4h10.8" />
    <path d="M12 7v7.6" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M3.4 12h17.2M12 3.2a13.6 13.6 0 0 1 0 17.6 13.6 13.6 0 0 1 0-17.6Z" />
  </Icon>
);

export const BikeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.8" cy="17.4" r="3.6" />
    <circle cx="18.2" cy="17.4" r="3.6" />
    <path d="M12 17.4V14l-3.1-3 4.1-3 2 3h2.1" />
    <circle cx="17.2" cy="5.2" r="1.3" />
  </Icon>
);

export const ShieldAlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.2 4.8 6v5.4c0 4.4 3 7.9 7.2 9.4 4.2-1.5 7.2-5 7.2-9.4V6Z" />
    <path d="M12 8.8v3.9M12 16.2h.01" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.2 4.8 6v5.4c0 4.4 3 7.9 7.2 9.4 4.2-1.5 7.2-5 7.2-9.4V6Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </Icon>
);

export const CopyrightIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M14.8 9.6a3.6 3.6 0 1 0 0 4.8" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9.4" cy="8.4" r="3.4" />
    <path d="M3.4 19.2a6 6 0 0 1 12 0M16.4 5.4a3.4 3.4 0 0 1 0 6.4M17.6 13.6a6 6 0 0 1 3 5.6" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.2 13.8 9l5.8 1.8-5.8 1.8L12 18.4l-1.8-5.8L4.4 10.8 10.2 9z" />
  </Icon>
);

// Sao đặc — viên điểm tích lũy trong khu rèn luyện.
export const StarIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.6}>
    <path
      d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"
      fill="currentColor"
    />
  </Icon>
);

// Ổ khóa — huy hiệu chưa mở khóa trên thang cấp độ.
export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.6" y="10.4" width="14.8" height="10" rx="2.6" />
    <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
  </Icon>
);

export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.6 5.6h16.8L14 13v6.2l-4-2V13z" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19.4V5M6.4 10.6 12 5l5.6 5.6" />
  </Icon>
);

export const FacebookIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.6}>
    <path d="M13.8 21v-7.6h2.6l.5-3h-3.1V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3A21 21 0 0 0 14.6 4c-2.4 0-4 1.4-4 4.1v2.3H8v3h2.6V21z" />
  </Icon>
);

export const YoutubeIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.6}>
    <rect x="2.6" y="5.6" width="18.8" height="12.8" rx="4" />
    <path d="m10.4 9.6 5 2.4-5 2.4z" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.6" />
    <path d="m3.6 7.4 8.4 5.6 8.4-5.6" />
  </Icon>
);

// Ánh xạ lĩnh vực → biểu tượng, dùng chung cho danh sách chủ đề và chip.
export const topicIcons: Record<string, (p: IconProps) => React.ReactElement> = {
  "Giao thông": BikeIcon,
  "Mạng xã hội": ChatIcon,
  "Bạo lực học đường": ShieldAlertIcon,
  "An ninh trật tự": UsersIcon,
  "Sở hữu trí tuệ": CopyrightIcon,
  "Tất cả": SearchIcon,
};

export function TopicIcon({ topic, ...props }: IconProps & { topic: string }) {
  const Cmp = topicIcons[topic] ?? BookIcon;
  return <Cmp {...props} />;
}
