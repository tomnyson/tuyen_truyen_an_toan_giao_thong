# Bổ Sung Các Chuyên Đề Mới & Tích Hợp React-Icons Cho Chủ Đề — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung các chuyên đề pháp luật mới (Phòng chống ma túy, An ninh trật tự trường học, Game và không gian mạng, Tài chính - tín dụng đen, Phòng chống tệ nạn xã hội) kế thừa các chủ đề cơ bản hiện có kèm bộ câu hỏi tình huống liên quan; đồng thời nâng cấp hệ thống biểu tượng (icon) chủ đề sang thư viện `react-icons` với giao diện chọn icon trực quan trong Admin CMS.

**Tech Stack:** Next.js 16, React 19, `react-icons` (FontAwesome 6 / Fa6), Drizzle ORM, PostgreSQL (Neon / PGlite).

---

## Tasks Overview

- [x] **Task 1:** Xây dựng component `components/TopicIcon.tsx` hỗ trợ render icon từ `react-icons/fa6` và danh mục biểu tượng chủ đề.
- [x] **Task 2:** Mở rộng bộ chủ đề trong `lib/topics.ts` (các chuyên đề mới + câu hỏi tình huống + react-icon) và cập nhật `tests/situation-lookup.test.mjs`.
- [x] **Task 3:** Cập nhật `lib/topic-store.ts` và `scripts/seed-topics.mjs` nạp đầy đủ các chuyên đề vào PostgreSQL, cập nhật `tests/seed-topics.test.mjs` và `tests/topic-store.test.mjs`.
- [x] **Task 4:** Nâng cấp `app/admin/TopicManager.tsx` tích hợp bộ chọn biểu tượng React-Icons (Icon Picker Grid + Live Preview) và hiển thị react-icons trong danh sách chủ đề.
- [x] **Task 5:** Cập nhật `components/icons.tsx` và trang chủ `app/page.tsx` hiển thị icon mới cho bộ lọc chủ đề.
- [x] **Task 6:** Kiểm thử toàn bộ hệ thống (`npm run test`, `npx tsc --noEmit`), cập nhật tài liệu `USER_STORIES.md`, `TECHNICAL_SPEC.md`, `PROGRESS.md` và kiểm tra GitNexus.
