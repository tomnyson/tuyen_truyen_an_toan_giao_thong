"use client";

import Link from "next/link";
import { useState } from "react";
import { ScalesIcon, CloseIcon, MenuIcon, ArrowUpRightIcon } from "@/components/icons";
import { brandLocality, brandName, brandShortName } from "@/lib/brand";

export type SiteHeaderProps = {
  currentPath?: string;
  onOpenChat?: () => void;
};

export function SiteHeader({ currentPath = "/" }: SiteHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell">
        <Link className="brand" href="/" aria-label={`${brandName} — Trang chủ`}>
          <span className="brand-mark" aria-hidden="true">
            <ScalesIcon />
          </span>
          <span className="brand-text">
            <strong>{brandShortName}</strong>
            <small>{brandLocality}</small>
          </span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-controls="dieu-huong-chinh"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="sr-only">
            {navOpen ? "Đóng danh mục" : "Mở danh mục"}
          </span>
          {navOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <nav
          id="dieu-huong-chinh"
          className="site-nav"
          data-open={navOpen}
          aria-label="Điều hướng chính"
          onClick={() => setNavOpen(false)}
        >
          <Link href="/" aria-current={currentPath === "/" ? "page" : undefined}>
            Trang chủ
          </Link>
          <Link href="/#chu-de">Chủ đề</Link>
          <Link href="/#tra-cuu">Tra cứu</Link>
          <Link href="/#tinh-huong">Tình huống</Link>
          <Link href="/#ren-luyen">Thử thách</Link>
          <Link
            href="/tra-cuu-van-ban"
            aria-current={currentPath === "/tra-cuu-van-ban" ? "page" : undefined}
          >
            Kho văn bản
          </Link>
          <Link
            href="/tro-giup-phap-ly"
            aria-current={currentPath === "/tro-giup-phap-ly" ? "page" : undefined}
          >
            Trợ giúp pháp lý
          </Link>
        </nav>
        <Link href="/?chat=true" className="header-cta">
          Hỏi trợ lý <ArrowUpRightIcon />
        </Link>
      </div>
    </header>
  );
}
