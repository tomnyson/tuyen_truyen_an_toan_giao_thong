// Minh họa hero vẽ vector theo bảng màu của bản thiết kế. Dùng hình vẽ thay ảnh
// stock để trang không mang cảm giác "ảnh nhóm bạn trẻ" chung chung, và để
// không phải tải tài nguyên ngoài.

export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 400 305"
      role="img"
      aria-label="Hình vẽ hai học sinh đội mũ bảo hiểm đi xe đạp điện tới trường, phía sau là cổng trường và biển báo giao thông"
    >
      <defs>
        <clipPath id="hero-art-clip">
          <rect width="400" height="305" />
        </clipPath>
      </defs>
      <g clipPath="url(#hero-art-clip)">
        <rect width="400" height="305" fill="#fdf1dc" />
        {/* Trời và nắng */}
        <circle cx="330" cy="58" r="38" fill="#fdefc4" />
        <circle cx="330" cy="58" r="22" fill="#f6c445" />
        {/* Dãy nhà phía xa */}
        <rect x="24" y="96" width="72" height="94" rx="6" fill="#f2ddbe" />
        <rect x="104" y="72" width="88" height="118" rx="8" fill="#e9d0ab" />
        <rect x="200" y="104" width="64" height="86" rx="6" fill="#f2ddbe" />
        <g fill="#fff8ec">
          <rect x="38" y="112" width="18" height="20" rx="3" />
          <rect x="64" y="112" width="18" height="20" rx="3" />
          <rect x="120" y="92" width="20" height="22" rx="3" />
          <rect x="152" y="92" width="20" height="22" rx="3" />
          <rect x="120" y="128" width="20" height="22" rx="3" />
          <rect x="152" y="128" width="20" height="22" rx="3" />
          <rect x="214" y="122" width="16" height="18" rx="3" />
          <rect x="236" y="122" width="16" height="18" rx="3" />
        </g>
        {/* Cây */}
        <rect x="292" y="140" width="9" height="52" rx="4" fill="#8e5a34" />
        <circle cx="296" cy="128" r="30" fill="#2e7d4f" />
        <circle cx="318" cy="142" r="20" fill="#24623d" />
        {/* Vỉa hè và mặt đường */}
        <rect x="0" y="188" width="400" height="16" fill="#e6dcc6" />
        <rect x="0" y="204" width="400" height="101" fill="#5b3a22" />
        <g stroke="#fff8ec" strokeWidth="5" strokeDasharray="26 22" strokeLinecap="round">
          <path d="M-10 258h420" />
        </g>
        {/* Biển báo */}
        <rect x="352" y="120" width="7" height="72" rx="3" fill="#9a8471" />
        <circle cx="355.5" cy="112" r="24" fill="#b8432a" />
        <circle cx="355.5" cy="112" r="17" fill="#fff8ec" />
        <path d="M347 112h17" stroke="#b8432a" strokeWidth="6" strokeLinecap="round" />

        {/* Xe đạp điện */}
        <g>
          <circle cx="128" cy="248" r="30" fill="none" stroke="#2b1d14" strokeWidth="7" />
          <circle cx="128" cy="248" r="8" fill="#2b1d14" />
          <circle cx="252" cy="248" r="30" fill="none" stroke="#2b1d14" strokeWidth="7" />
          <circle cx="252" cy="248" r="8" fill="#2b1d14" />
          <path
            d="M128 248h44l22-46h44l14 46"
            fill="none"
            stroke="#b8432a"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M168 202h48l-6 22h-48z" fill="#8e2f1b" />
          <path d="M236 200h30" stroke="#2b1d14" strokeWidth="8" strokeLinecap="round" />
        </g>

        {/* Học sinh cầm lái */}
        <g>
          <path d="M196 200l14-42h20l10 42z" fill="#2f6fb3" />
          <path d="M230 168l30 26" stroke="#f2c7b8" strokeWidth="12" strokeLinecap="round" />
          <circle cx="216" cy="140" r="20" fill="#f8ddd3" />
          <path d="M196 138a20 20 0 0 1 40 0z" fill="#f6c445" />
          <path d="M194 138h44" stroke="#e0a91f" strokeWidth="6" strokeLinecap="round" />
          <path d="M226 146h8" stroke="#2b1d14" strokeWidth="4" strokeLinecap="round" />
          <path d="M204 214l-6 34" stroke="#2b1d14" strokeWidth="12" strokeLinecap="round" />
        </g>

        {/* Học sinh ngồi sau, đeo cặp */}
        <g>
          <path d="M152 200l12-38h20l10 38z" fill="#2e7d4f" />
          <rect x="140" y="164" width="26" height="34" rx="9" fill="#f6c445" />
          <circle cx="176" cy="142" r="18" fill="#f8ddd3" />
          <path d="M158 140a18 18 0 0 1 36 0z" fill="#dff1e4" />
          <path d="M156 140h40" stroke="#2e7d4f" strokeWidth="6" strokeLinecap="round" />
          <path d="M186 148h7" stroke="#2b1d14" strokeWidth="4" strokeLinecap="round" />
          <path d="M170 210l-4 30" stroke="#2b1d14" strokeWidth="11" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
