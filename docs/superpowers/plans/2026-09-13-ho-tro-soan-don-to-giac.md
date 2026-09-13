# Hỗ Trợ Soạn Đơn Tố Giác Tội Phạm Bằng AI & Quét CCCD Client-Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng trợ giúp pháp lý cho phép học sinh, sinh viên và người dân hoàn thành Đơn tố giác tội phạm chuẩn mẫu `docs/don/don-to-giac.docx` thông qua quét mã QR CCCD bảo mật 100% tại Client, trợ lý AI phỏng vấn khai thác sự việc, xem trước thời gian thực (Live Preview), xuất file Word (.docx)/PDF và hướng dẫn cơ quan tiếp nhận.

**Architecture:** Kiến trúc Zero-Knowledge Privacy: Dữ liệu cá nhân (CCCD) được quét bằng camera/ảnh và xử lý bằng `BarcodeDetector`/`jsqr` hoàn toàn trong bộ nhớ trình duyệt (không gửi lên server). AI phỏng vấn chỉ nhận thông tin sự việc phi định danh để trích xuất cấu trúc sự việc. Đơn được ráp trực tiếp ở Client, hỗ trợ Live Preview 2 cột, xuất file Word qua `docx` và tra cứu cơ quan Công an thụ lý từ `/api/co-quan`.

**Tech Stack:** Next.js 16 / React 19, TypeScript, `jsqr` (QR decoder client-side), `docx` (Word docx generator), Tailwind CSS, Node.js native test runner (`node --test`).

## Global Constraints

- **Bảo mật tuyệt đối thông tin CCCD:** Dữ liệu cá nhân (Số CCCD, Họ tên, Địa chỉ, Ngày cấp) tuyệt đối không được gửi trong body HTTP request lên bất kỳ máy chủ nào.
- **Ràng buộc số dòng `app/page.tsx`:** Giữ nguyên line count dưới 990 dòng (`lineCount < 990`).
- **An toàn kiểu dữ liệu:** `npx tsc --noEmit` luôn đạt 0 lỗi TypeScript.
- **Bảo toàn bộ kiểm thử:** 100% test suite hiện tại (`npm test`, 543+ tests) tiếp tục pass.
- **Đồng bộ hệ thống thiết kế:** Tuân thủ token CSS `tokens.css`, `base.css`, `legal-lookup.css`, bảng màu kem `#FBF9F5`, Slate/Zinc, Amber, Indigo, Emerald.

---

### Task 1: Bộ Phân Tích Cú Pháp Mã QR CCCD (`lib/cccd-parser.ts`)

**Files:**
- Create: `lib/cccd-parser.ts`
- Test: `tests/cccd-parser.test.mjs`

**Interfaces:**
- Consumes: Chuỗi ký tự thô từ mã QR CCCD (chuẩn 7 trường phân tách bằng `|`).
- Produces: 
  ```typescript
  export interface ParsedCccdData {
    idNumber: string;
    oldIdNumber?: string;
    fullName: string;
    birthDate: string; // formatted: dd/mm/yyyy
    birthYear: string; // yyyy
    gender: string;
    permanentAddress: string;
    issueDate: string; // formatted: dd/mm/yyyy
    issuePlace: string; // Default: Cục Cảnh sát QLHC về TTXH
  }
  export function parseCccdQrCode(qrText: string): ParsedCccdData | null;
  export function formatCccdDate(rawDate: string): string;
  ```

- [ ] **Step 1: Viết bài kiểm thử thất bại (failing test)**

Tạo file `tests/cccd-parser.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCccdQrCode, formatCccdDate } from "../lib/cccd-parser.ts";

test("formatCccdDate converts ddmmyyyy to dd/mm/yyyy", () => {
  assert.equal(formatCccdDate("15052002"), "15/05/2002");
  assert.equal(formatCccdDate("01011999"), "01/01/1999");
  assert.equal(formatCccdDate("invalid"), "");
});

test("parseCccdQrCode correctly parses valid 7-field CCCD QR payload", () => {
  const sample = "001099012345||Nguyễn Văn An|15052002|Nam|Xã Quảng Phú, Huyện Cư M'gar, Đắk Lắk|20042021";
  const result = parseCccdQrCode(sample);
  assert.ok(result);
  assert.equal(result.idNumber, "001099012345");
  assert.equal(result.fullName, "Nguyễn Văn An");
  assert.equal(result.birthDate, "15/05/2002");
  assert.equal(result.birthYear, "2002");
  assert.equal(result.gender, "Nam");
  assert.equal(result.permanentAddress, "Xã Quảng Phú, Huyện Cư M'gar, Đắk Lắk");
  assert.equal(result.issueDate, "20/04/2021");
  assert.equal(result.issuePlace, "Cục Cảnh sát QLHC về TTXH");
});

test("parseCccdQrCode with old CMND field", () => {
  const sample = "040099001122|241234567|Trần Thị Bình|01122004|Nữ|Phường Tân Lập, TP Buôn Ma Thuột, Đắk Lắk|10102022";
  const result = parseCccdQrCode(sample);
  assert.ok(result);
  assert.equal(result.oldIdNumber, "241234567");
  assert.equal(result.fullName, "Trần Thị Bình");
});

test("parseCccdQrCode returns null for malformed or empty text", () => {
  assert.equal(parseCccdQrCode(""), null);
  assert.equal(parseCccdQrCode("invalid|data"), null);
  assert.equal(parseCccdQrCode("123456"), null);
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Chạy: `node --experimental-strip-types --test tests/cccd-parser.test.mjs`
Kỳ vọng: Thất bại do chưa tồn tại module `lib/cccd-parser.ts`.

- [ ] **Step 3: Viết mã hiện thực `lib/cccd-parser.ts`**

Tạo file `lib/cccd-parser.ts`:
```typescript
export interface ParsedCccdData {
  idNumber: string;
  oldIdNumber?: string;
  fullName: string;
  birthDate: string;
  birthYear: string;
  gender: string;
  permanentAddress: string;
  issueDate: string;
  issuePlace: string;
}

export function formatCccdDate(rawDate: string): string {
  if (!rawDate || typeof rawDate !== "string") return "";
  const cleaned = rawDate.trim();
  if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) return "";
  const day = cleaned.slice(0, 2);
  const month = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);
  return `${day}/${month}/${year}`;
}

export function parseCccdQrCode(qrText: string): ParsedCccdData | null {
  if (!qrText || typeof qrText !== "string") return null;
  const parts = qrText.split("|").map((p) => p.trim());
  if (parts.length < 6) return null;

  const idNumber = parts[0];
  if (!idNumber || idNumber.length < 9) return null;

  const oldIdNumber = parts[1] || undefined;
  const fullName = parts[2] || "";
  const rawBirth = parts[3] || "";
  const gender = parts[4] || "";
  const permanentAddress = parts[5] || "";
  const rawIssueDate = parts[6] || "";

  const birthDate = formatCccdDate(rawBirth);
  const birthYear = rawBirth.length === 8 ? rawBirth.slice(4, 8) : "";
  const issueDate = formatCccdDate(rawIssueDate);

  return {
    idNumber,
    oldIdNumber,
    fullName,
    birthDate,
    birthYear,
    gender,
    permanentAddress,
    issueDate,
    issuePlace: "Cục Cảnh sát QLHC về TTXH",
  };
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --experimental-strip-types --test tests/cccd-parser.test.mjs`
Kỳ vọng: 4/4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/cccd-parser.ts tests/cccd-parser.test.mjs
git commit -m "feat: add CCCD QR code parser utility with tests"
```

---

### Task 2: State Quản Lý Đơn & Local Storage (`lib/complaint-form-state.ts`)

**Files:**
- Create: `lib/complaint-form-state.ts`
- Test: `tests/complaint-form-state.test.mjs`

**Interfaces:**
- Produces: 
  ```typescript
  export interface ComplainantInfo { ... }
  export interface AccusedInfo { ... }
  export interface IncidentInfo { ... }
  export interface EvidenceInfo { ... }
  export interface RecipientAuthority { ... }
  export interface ComplaintFormState { ... }
  export function createEmptyComplaintForm(): ComplaintFormState;
  export function calculateFormCompletionProgress(state: ComplaintFormState): { completedCount: number; totalCount: number; percentage: number };
  export function saveComplaintStateLocal(state: ComplaintFormState): void;
  export function loadComplaintStateLocal(): ComplaintFormState | null;
  export function clearComplaintStateLocal(): void;
  ```

- [ ] **Step 1: Viết bài kiểm thử thất bại**

Tạo `tests/complaint-form-state.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyComplaintForm,
  calculateFormCompletionProgress,
} from "../lib/complaint-form-state.ts";

test("createEmptyComplaintForm returns default template with today date", () => {
  const form = createEmptyComplaintForm();
  assert.ok(form.createdDate);
  assert.equal(form.complainant.fullName, "");
  assert.equal(form.incident.behaviorSummary, "");
  assert.deepEqual(form.evidence.items, []);
});

test("calculateFormCompletionProgress calculates completion percentage correctly", () => {
  const form = createEmptyComplaintForm();
  const initProgress = calculateFormCompletionProgress(form);
  assert.equal(initProgress.completedCount, 0);
  assert.equal(initProgress.percentage, 0);

  form.complainant.fullName = "Nguyễn Văn A";
  form.complainant.idNumber = "001099012345";
  form.complainant.permanentAddress = "Đắk Lắk";
  form.incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản";

  const updated = calculateFormCompletionProgress(form);
  assert.ok(updated.completedCount > 0);
  assert.ok(updated.percentage > 0 && updated.percentage <= 100);
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Chạy: `node --experimental-strip-types --test tests/complaint-form-state.test.mjs`
Kỳ vọng: Thất bại vì `lib/complaint-form-state.ts` chưa tồn tại.

- [ ] **Step 3: Hiện thực `lib/complaint-form-state.ts`**

Tạo file `lib/complaint-form-state.ts`:
```typescript
export interface ComplainantInfo {
  fullName: string;
  birthYear: string;
  birthDate?: string;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  permanentAddress: string;
  currentAddress: string;
  phone: string;
}

export interface AccusedInfo {
  fullName: string;
  addressOrAccount: string;
  relationship: string;
}

export interface IncidentInfo {
  behaviorSummary: string;
  occurrenceTime: string;
  location: string;
  chronology: string;
  damageOrLoss: string;
}

export interface EvidenceInfo {
  items: string[];
  witnessInfo?: string;
}

export interface RecipientAuthority {
  name: string;
  level: "xa_phuong" | "huyen" | "tinh";
  address: string;
  phone?: string;
}

export interface ComplaintFormState {
  complainant: ComplainantInfo;
  accused: AccusedInfo;
  incident: IncidentInfo;
  evidence: EvidenceInfo;
  recipient: RecipientAuthority;
  createdDate: string;
}

const STORAGE_KEY = "safe_legal_complaint_form_v1";

export function createEmptyComplaintForm(): ComplaintFormState {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  return {
    complainant: {
      fullName: "",
      birthYear: "",
      birthDate: "",
      idNumber: "",
      idIssueDate: "",
      idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
      permanentAddress: "",
      currentAddress: "",
      phone: "",
    },
    accused: {
      fullName: "",
      addressOrAccount: "",
      relationship: "",
    },
    incident: {
      behaviorSummary: "",
      occurrenceTime: "",
      location: "",
      chronology: "",
      damageOrLoss: "",
    },
    evidence: {
      items: [],
      witnessInfo: "",
    },
    recipient: {
      name: "Cơ quan Cảnh sát điều tra Công an...",
      level: "huyen",
      address: "",
      phone: "",
    },
    createdDate: `ngày ${day} tháng ${month} năm ${year}`,
  };
}

export function calculateFormCompletionProgress(state: ComplaintFormState): {
  completedCount: number;
  totalCount: number;
  percentage: number;
} {
  const checkpoints = [
    Boolean(state.complainant.fullName && state.complainant.idNumber),
    Boolean(state.complainant.permanentAddress || state.complainant.currentAddress),
    Boolean(state.accused.fullName || state.accused.addressOrAccount),
    Boolean(state.incident.behaviorSummary),
    Boolean(state.incident.chronology || state.incident.location),
    Boolean(state.evidence.items.length > 0 || state.incident.damageOrLoss),
    Boolean(state.recipient.name && state.recipient.name !== "Cơ quan Cảnh sát điều tra Công an..."),
  ];

  const completedCount = checkpoints.filter(Boolean).length;
  const totalCount = checkpoints.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return { completedCount, totalCount, percentage };
}

export function saveComplaintStateLocal(state: ComplaintFormState): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Gracefully handle storage errors
  }
}

export function loadComplaintStateLocal(): ComplaintFormState | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearComplaintStateLocal(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --experimental-strip-types --test tests/complaint-form-state.test.mjs`
Kỳ vọng: 2/2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/complaint-form-state.ts tests/complaint-form-state.test.mjs
git commit -m "feat: add complaint form state model and local persistence"
```

---

### Task 3: Sinh File Word (.docx) Chuẩn Pháp Lý Phía Client (`lib/docx-generator.ts`)

**Files:**
- Create: `lib/docx-generator.ts`
- Test: `tests/docx-generator.test.mjs`

**Interfaces:**
- Consumes: `ComplaintFormState`
- Produces: 
  ```typescript
  export async function buildComplaintDocx(state: ComplaintFormState): Promise<Blob | Buffer>;
  export function downloadDocxInBrowser(blob: Blob, filename?: string): void;
  ```

- [ ] **Step 1: Viết test sinh buffer docx hợp lệ**

Tạo `tests/docx-generator.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComplaintDocx } from "../lib/docx-generator.ts";
import { createEmptyComplaintForm } from "../lib/complaint-form-state.ts";

test("buildComplaintDocx creates valid docx binary buffer matching template", async () => {
  const form = createEmptyComplaintForm();
  form.complainant.fullName = "Nguyễn Văn Test";
  form.complainant.idNumber = "001099012345";
  form.complainant.birthYear = "2004";
  form.complainant.permanentAddress = "Cư M'gar, Đắk Lắk";
  form.accused.fullName = "Nguyễn Văn Nghi Phạm";
  form.incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản qua mạng";
  form.incident.chronology = "Ngày 10/09/2026 đối tượng yêu cầu chuyển tiền vào số tài khoản...";
  form.evidence.items = ["Ảnh chụp tin nhắn Zalo", "Biên lai chuyển khoản ngân hàng 2.000.000đ"];

  const buffer = await buildComplaintDocx(form);
  assert.ok(buffer);
  assert.ok(buffer.length > 1000, "Docx file should have reasonable size");
  // Check ZIP/OpenXML magic bytes: PK (0x50, 0x4B)
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --experimental-strip-types --test tests/docx-generator.test.mjs`
Kỳ vọng: Thất bại do `lib/docx-generator.ts` chưa tồn tại.

- [ ] **Step 3: Hiện thực `lib/docx-generator.ts`**

Tạo file `lib/docx-generator.ts`:
```typescript
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
} from "docx";
import type { ComplaintFormState } from "./complaint-form-state";

export async function buildComplaintDocx(
  state: ComplaintFormState,
): Promise<Blob | Buffer> {
  const c = state.complainant;
  const a = state.accused;
  const inc = state.incident;
  const ev = state.evidence;
  const r = state.recipient;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2cm
              bottom: 1134,
              left: 1701, // 3cm
              right: 1134, // 2cm
            },
          },
        },
        children: [
          // Quốc hiệu & Tiêu ngữ
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                bold: true,
                size: 24, // 12pt
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Độc lập - Tự do - Hạnh phúc",
                bold: true,
                size: 26, // 13pt
                font: "Times New Roman",
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Ngày tháng năm
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `..........., ${state.createdDate || "ngày ..... tháng .... năm....."}`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Tiêu đề đơn
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ĐƠN TỐ GIÁC TỘI PHẠM",
                bold: true,
                size: 30, // 15pt
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `(Về hành vi: ${inc.behaviorSummary || "…………………………"})`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Kính gửi
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: "Kính gửi: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: r.name || "Cơ quan điều tra, Công an quận/huyện ………………………",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Người làm đơn
          new Paragraph({
            children: [
              new TextRun({ text: "Tôi tên là: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.fullName || "…………………………………………", bold: Boolean(c.fullName), font: "Times New Roman", size: 24 }),
              new TextRun({ text: "    Sinh năm: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.birthYear || c.birthDate || "……………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CMND/CCCD số: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idNumber || "…………………………", font: "Times New Roman", size: 24 }),
              new TextRun({ text: "  do: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idIssuePlace || "Cục Cảnh sát QLHC về TTXH", font: "Times New Roman", size: 24 }),
              new TextRun({ text: "  cấp ngày: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idIssueDate || "………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hộ khẩu thường trú: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.permanentAddress || "…………………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hiện đang cư ngụ tại: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.currentAddress || c.permanentAddress || "…………………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Số điện thoại liên hệ: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.phone || "……………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Nội dung tố giác đối tượng
          new Paragraph({
            children: [
              new TextRun({
                text: "Nay tôi làm đơn này kính mong quý cơ quan tiến hành điều tra làm rõ hành vi vi phạm của đối tượng:",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Họ và tên đối tượng: ", font: "Times New Roman", size: 24, bold: true }),
              new TextRun({ text: a.fullName || "…………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Địa chỉ / Tài khoản / Nơi cư ngụ: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: a.addressOrAccount || "………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Hành vi vi phạm & Diễn biến
          new Paragraph({
            children: [
              new TextRun({
                text: "Đối tượng này đã có hành vi vi phạm như sau:",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: inc.chronology || inc.behaviorSummary || "………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Chứng cứ chứng minh
          new Paragraph({
            children: [
              new TextRun({
                text: "Chứng cứ chứng minh kèm theo (nếu có):",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          ...(ev.items.length > 0
            ? ev.items.map(
                (item, idx) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `  ${idx + 1}. ${item}`,
                        font: "Times New Roman",
                        size: 24,
                      }),
                    ],
                  }),
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "- ………………………………………………………………………………………………………………………",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
              ]),
          new Paragraph({ text: "" }),

          // Cam đoan
          new Paragraph({
            children: [
              new TextRun({
                text: "Từ vụ việc xảy ra nêu trên, tôi cho rằng cá nhân này đã có hành vi vi phạm pháp luật. Kính đề nghị quý cơ quan điều tra làm rõ hành vi trên để đảm bảo quyền lợi hợp pháp của tôi và giữ vững an ninh, trật tự trên địa bàn.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Tôi xin cam đoan những gì tôi vừa trình bày là sự thật và hoàn toàn chịu trách nhiệm trước pháp luật về những lời khai trên.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Xin chân thành cảm ơn./.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Chữ ký
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Người làm đơn               ",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "(Ký và ghi rõ họ tên)         ",
                italics: true,
                font: "Times New Roman",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: c.fullName ? `${c.fullName}               ` : "………………………………………         ",
                bold: Boolean(c.fullName),
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
        ],
      },
    ],
  });

  if (typeof window !== "undefined") {
    return await Packer.toBlob(doc);
  }
  return await Packer.toBuffer(doc);
}

export function downloadDocxInBrowser(blob: Blob, filename = "don-to-giac-toi-pham.docx"): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --experimental-strip-types --test tests/docx-generator.test.mjs`
Kỳ vọng: 1/1 test pass.

- [ ] **Step 5: Commit**

```bash
git add lib/docx-generator.ts tests/docx-generator.test.mjs
git commit -m "feat: add client-side legal docx generator utility"
```

---

### Task 4: Trợ Lý AI Phỏng Vấn & Trích Xuất Dữ Liệu Sự Việc (`app/api/legal-aid/interview/route.ts` & `lib/legal-aid-interview.ts`)

**Files:**
- Create: `lib/legal-aid-interview.ts`
- Create: `app/api/legal-aid/interview/route.ts`
- Test: `tests/legal-aid-interview.test.mjs`

**Interfaces:**
- Consumes: `{ message: string, history: Array<{role: "user" | "assistant", content: string}> }`
- Produces: `{ assistantReply: string, extractedFields: Partial<ComplaintFormState> }`

- [ ] **Step 1: Viết test cho logic phỏng vấn & trích xuất**

Tạo `tests/legal-aid-interview.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { processInterviewMessage } from "../lib/legal-aid-interview.ts";

test("processInterviewMessage extracts online fraud behavior and details", () => {
  const message = "Em bị một người tên Hoàng trên Facebook lừa đảo nạp tiền làm nhiệm vụ mất 5 triệu đồng";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply);
  assert.ok(result.extractedFields);
  assert.equal(result.extractedFields.incident?.behaviorSummary, "Lừa đảo chiếm đoạt tài sản qua mạng");
  assert.equal(result.extractedFields.accused?.fullName, "Hoàng");
  assert.equal(result.extractedFields.incident?.damageOrLoss, "5 triệu đồng");
});

test("processInterviewMessage extracts school violence / bullying", () => {
  const message = "Bạn Tuấn cùng lớp đe dọa đánh em ở cổng trường";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply);
  assert.equal(result.extractedFields.incident?.behaviorSummary, "Đe dọa dùng vũ lực / Bạo lực học đường");
  assert.equal(result.extractedFields.accused?.fullName, "Tuấn");
});

test("processInterviewMessage fails gracefully for generic messages", () => {
  const message = "Xin chào luật sư";
  const result = processInterviewMessage(message, []);
  assert.ok(result.assistantReply.length > 20);
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --experimental-strip-types --test tests/legal-aid-interview.test.mjs`
Kỳ vọng: Thất bại vì `lib/legal-aid-interview.ts` chưa tồn tại.

- [ ] **Step 3: Hiện thực `lib/legal-aid-interview.ts` và Route API**

Tạo `lib/legal-aid-interview.ts`:
```typescript
import type { ComplaintFormState } from "./complaint-form-state";

export interface InterviewResponse {
  assistantReply: string;
  extractedFields: Partial<ComplaintFormState>;
}

export function processInterviewMessage(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): InterviewResponse {
  const lower = message.toLowerCase();
  const extracted: Partial<ComplaintFormState> = {};
  const incident: Partial<ComplaintFormState["incident"]> = {};
  const accused: Partial<ComplaintFormState["accused"]> = {};
  const evidence: Partial<ComplaintFormState["evidence"]> = { items: [] };

  // 1. Phân loại hành vi
  if (lower.includes("lừa") || lower.includes("tiền") || lower.includes("nhiệm vụ") || lower.includes("chuyển khoản")) {
    incident.behaviorSummary = "Lừa đảo chiếm đoạt tài sản qua mạng";
  } else if (lower.includes("đánh") || lower.includes("đe dọa") || lower.includes("bạo lực") || lower.includes("chặn đường")) {
    incident.behaviorSummary = "Đe dọa dùng vũ lực / Bạo lực học đường";
  } else if (lower.includes("hình ảnh") || lower.includes("clip") || lower.includes("bôi nhọ") || lower.includes("nhục")) {
    incident.behaviorSummary = "Làm nhục người khác / Phát tán hình ảnh riêng tư";
  } else if (lower.includes("vay") || lower.includes("app") || lower.includes("tống tiền")) {
    incident.behaviorSummary = "Cưỡng đoạt tài sản / Cho vay nặng lãi";
  }

  // 2. Trích xuất tên đối tượng
  const nameMatch = message.match(/(?:tên(?: là)?|bạn|đối tượng)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)/i);
  if (nameMatch && nameMatch[1]) {
    accused.fullName = nameMatch[1].trim();
  }

  // 3. Trích xuất thiệt hại
  const moneyMatch = message.match(/(\d+(?:\s*(?:triệu|tr|nghìn|k|đồng|vnd))+)/i);
  if (moneyMatch && moneyMatch[1]) {
    incident.damageOrLoss = moneyMatch[1].trim();
  }

  // 4. Trích xuất bằng chứng
  if (lower.includes("tin nhắn") || lower.includes("chụp") || lower.includes("screenshot")) {
    evidence.items?.push("Ảnh chụp màn hình cuộc hội thoại/tin nhắn");
  }
  if (lower.includes("biên lai") || lower.includes("sao kê") || lower.includes("chuyển khoản")) {
    evidence.items?.push("Biên lai chuyển tiền ngân hàng");
  }

  incident.chronology = message.trim();

  // Tạo phản hồi ân cần, mang tính trấn an
  let assistantReply = "";
  if (incident.behaviorSummary) {
    assistantReply = `Em hãy bình tĩnh nhé, anh/chị đã ghi nhận dấu hiệu hành vi: "${incident.behaviorSummary}". `;
    if (!accused.fullName) {
      assistantReply += "Em có biết họ tên đầy đủ, số điện thoại hoặc tài khoản mạng xã hội của đối tượng này không? ";
    } else {
      assistantReply += `Đã ghi nhận đối tượng là "${accused.fullName}". `;
    }
    assistantReply += "Sự việc này xảy ra vào khoảng thời gian nào và ở địa điểm cụ thể nào (trường học, nhà riêng hay qua không gian mạng)?";
  } else {
    assistantReply =
      "Chào em, em đừng quá lo lắng nhé. Em hãy kể lại tóm tắt sự việc đang gặp phải: Ai là người làm phiền/gây tổn hại cho em, họ đã làm gì và sự việc diễn ra khi nào?";
  }

  if (Object.keys(incident).length > 0) extracted.incident = incident as ComplaintFormState["incident"];
  if (Object.keys(accused).length > 0) extracted.accused = accused as ComplaintFormState["accused"];
  if (evidence.items && evidence.items.length > 0) extracted.evidence = evidence as ComplaintFormState["evidence"];

  return { assistantReply, extractedFields: extracted };
}
```

Tạo `app/api/legal-aid/interview/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { processInterviewMessage } from "@/lib/legal-aid-interview";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const result = processInterviewMessage(message, history);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Interview processing failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --experimental-strip-types --test tests/legal-aid-interview.test.mjs`
Kỳ vọng: 3/3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/legal-aid-interview.ts app/api/legal-aid/interview/route.ts tests/legal-aid-interview.test.mjs
git commit -m "feat: add legal aid interview API and incident extractor"
```

---

### Task 5: Component Quét Mã QR CCCD Tại Trình Duyệt (`components/CccdQrScanner.tsx`)

**Files:**
- Create: `components/CccdQrScanner.tsx`
- Test: `tests/cccd-qr-scanner-ui.test.mjs`

**Interfaces:**
- Consumes: `onDataParsed: (data: ParsedCccdData) => void`, `onCancel: () => void`
- Produces: React UI Modal hỗ trợ chọn ảnh thẻ CCCD hoặc camera streaming giải mã hoàn toàn qua `canvas` và `jsQR`, không upload lên server.

- [ ] **Step 1: Viết test cho component source code và bảo mật**

Tạo `tests/cccd-qr-scanner-ui.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CccdQrScanner exports valid component and does not upload images to server", () => {
  const content = fs.readFileSync("components/CccdQrScanner.tsx", "utf8");
  assert.ok(content.includes("export default function CccdQrScanner") || content.includes("export function CccdQrScanner"));
  assert.ok(content.includes("jsQR") || content.includes("BarcodeDetector"));
  assert.ok(content.includes("parseCccdQrCode"));
  // Assert privacy requirement: NO fetch or XMLHttpRequest uploading image data
  assert.ok(!content.includes("fetch("), "CccdQrScanner must not make network requests");
  assert.ok(!content.includes("FormData"), "CccdQrScanner must not construct FormData for upload");
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --test tests/cccd-qr-scanner-ui.test.mjs`
Kỳ vọng: Thất bại do chưa có file `components/CccdQrScanner.tsx`.

- [ ] **Step 3: Hiện thực `components/CccdQrScanner.tsx`**

Tạo file `components/CccdQrScanner.tsx`:
```tsx
"use client";

import React, { useState, useRef } from "react";
import jsQR from "jsqr";
import { parseCccdQrCode, type ParsedCccdData } from "@/lib/cccd-parser";
import { FaQrcode, FaCamera, FaUpload, FaXmark, FaShieldHalved } from "react-icons/fa6";

interface CccdQrScannerProps {
  onDataParsed: (data: ParsedCccdData) => void;
  onCancel: () => void;
}

export function CccdQrScanner({ onDataParsed, onCancel }: CccdQrScannerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Trình duyệt không hỗ trợ xử lý đồ họa.");
          setIsProcessing(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Giải mã QR code cục bộ
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        canvas.width = 0; // giải phóng bộ nhớ

        if (code && code.data) {
          const parsed = parseCccdQrCode(code.data);
          if (parsed) {
            onDataParsed(parsed);
          } else {
            setErrorMsg("Tìm thấy mã QR nhưng không đúng định dạng thẻ CCCD gắn chip Việt Nam.");
          }
        } else {
          setErrorMsg("Không tìm thấy mã QR trên ảnh. Vui lòng chụp rõ góc trên bên phải của thẻ CCCD.");
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setErrorMsg("Không thể đọc tệp ảnh đã chọn.");
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <FaQrcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Quét thẻ CCCD gắn chip</h3>
              <p className="text-xs text-slate-500">Tự động điền thông tin người làm đơn</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
            <FaShieldHalved className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              <strong>Cam kết quyền riêng tư:</strong> Ảnh và thông tin CCCD được giải mã trực tiếp trong trình duyệt của bạn, tuyệt đối không gửi lên máy chủ và không lưu trữ trên hệ thống.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-8 text-center bg-stone-50/50 dark:bg-stone-800/20 hover:border-emerald-500 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <FaUpload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-stone-200 mb-1">
              {isProcessing ? "Đang giải mã mã QR..." : "Tải ảnh thẻ CCCD gắn chip"}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
              Chọn ảnh chụp góc trên bên phải của thẻ CCCD có chứa mã QR vuông.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Chọn tệp ảnh từ máy
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2 bg-stone-50/40 dark:bg-stone-800/20">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
          >
            Đóng / Nhập tay
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --test tests/cccd-qr-scanner-ui.test.mjs`
Kỳ vọng: 1/1 test pass.

- [ ] **Step 5: Commit**

```bash
git add components/CccdQrScanner.tsx tests/cccd-qr-scanner-ui.test.mjs
git commit -m "feat: add client-side CCCD QR scanner component"
```

---

### Task 6: Tờ Đơn Live Preview & In A4 (`components/ComplaintDocumentPreview.tsx`)

**Files:**
- Create: `components/ComplaintDocumentPreview.tsx`
- Test: `tests/complaint-document-preview-ui.test.mjs`

**Interfaces:**
- Consumes: `state: ComplaintFormState`, `onFieldChange: (field: string, value: any) => void`, `onDownloadDocx: () => void`, `onOpenGuidance: () => void`
- Produces: Giao diện A4 paper mô phỏng chính xác mẫu đơn, reactive styling, inline editing và `@media print`.

- [ ] **Step 1: Viết test cho preview component**

Tạo `tests/complaint-document-preview-ui.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("ComplaintDocumentPreview includes A4 template, national header, and print trigger", () => {
  const content = fs.readFileSync("components/ComplaintDocumentPreview.tsx", "utf8");
  assert.ok(content.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"));
  assert.ok(content.includes("ĐỘC LẬP - TỰ DO - HẠNH PHÚC") || content.includes("Độc lập - Tự do - Hạnh phúc"));
  assert.ok(content.includes("ĐƠN TỐ GIÁC TỘI PHẠM"));
  assert.ok(content.includes("window.print"));
  assert.ok(content.includes("Tải file Word"));
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --test tests/complaint-document-preview-ui.test.mjs`
Kỳ vọng: Thất bại vì `components/ComplaintDocumentPreview.tsx` chưa tồn tại.

- [ ] **Step 3: Hiện thực `components/ComplaintDocumentPreview.tsx`**

Tạo file `components/ComplaintDocumentPreview.tsx`:
```tsx
"use client";

import React from "react";
import type { ComplaintFormState } from "@/lib/complaint-form-state";
import { FaFileWord, FaPrint, FaBuildingColumns, FaCheck } from "react-icons/fa6";

interface ComplaintDocumentPreviewProps {
  state: ComplaintFormState;
  onFieldChange: (path: string, value: any) => void;
  onDownloadDocx: () => void;
  onOpenGuidance: () => void;
  progressPercentage: number;
}

export function ComplaintDocumentPreview({
  state,
  onFieldChange,
  onDownloadDocx,
  onOpenGuidance,
  progressPercentage,
}: ComplaintDocumentPreviewProps) {
  const c = state.complainant;
  const a = state.accused;
  const inc = state.incident;
  const ev = state.evidence;
  const r = state.recipient;

  return (
    <div className="flex flex-col h-full bg-stone-100 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
      {/* Top Toolbar */}
      <div className="p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Bản xem trước thời gian thực (A4)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {progressPercentage}% Hoàn thiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Bấm vào bất kỳ dòng nào để chỉnh sửa tay</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuidance}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 dark:bg-stone-800 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <FaBuildingColumns className="w-3.5 h-3.5 text-amber-600" />
            <span>Nơi nộp đơn</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 dark:bg-stone-800 dark:text-stone-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <FaPrint className="w-3.5 h-3.5" />
            <span>In / PDF</span>
          </button>
          <button
            onClick={onDownloadDocx}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <FaFileWord className="w-3.5 h-3.5" />
            <span>Tải file Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible">
        <div
          className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 rounded-lg shadow-md border border-stone-200 print:shadow-none print:border-none print:p-0 font-serif leading-relaxed text-sm selection:bg-amber-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* Header Quốc hiệu */}
          <div className="text-center mb-6">
            <p className="font-bold text-base tracking-wide uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="font-bold text-base underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-right italic text-xs mt-4">
              ..........., {state.createdDate || "ngày ..... tháng .... năm....."}
            </p>
          </div>

          {/* Tiêu đề đơn */}
          <div className="text-center my-6">
            <h1 className="text-xl font-bold uppercase tracking-wide">ĐƠN TỐ GIÁC TỘI PHẠM</h1>
            <p className="italic text-sm text-slate-600 mt-1">
              (Về hành vi:{" "}
              <span className="font-semibold text-slate-900">
                {inc.behaviorSummary || "…………………………………………………………"}
              </span>
              )
            </p>
          </div>

          {/* Kính gửi */}
          <div className="mb-6 font-sans text-[13px]">
            <p className="font-bold font-serif text-sm">
              Kính gửi:{" "}
              <span className="text-sky-900 dark:text-sky-950 font-bold underline decoration-sky-300">
                {r.name || "Cơ quan Cảnh sát điều tra, Công an quận/huyện ………………………"}
              </span>
            </p>
          </div>

          {/* Thông tin người làm đơn */}
          <div className="space-y-2 mb-6">
            <p>
              Tôi tên là: <strong className="uppercase">{c.fullName || "……………………………………"}</strong>
              <span className="ml-6">
                Sinh năm: <strong>{c.birthYear || c.birthDate || "……………"}</strong>
              </span>
            </p>
            <p>
              CMND/CCCD số: <strong>{c.idNumber || "…………………………"}</strong> do:{" "}
              <span>{c.idIssuePlace || "Cục Cảnh sát QLHC về TTXH"}</span> cấp ngày:{" "}
              <span>{c.idIssueDate || "………………"}</span>
            </p>
            <p>
              Hộ khẩu thường trú: <span>{c.permanentAddress || "………………………………………………………………………………………"}</span>
            </p>
            <p>
              Hiện đang cư ngụ tại: <span>{c.currentAddress || c.permanentAddress || "………………………………………………………………………………………"}</span>
            </p>
            <p>
              Số điện thoại liên hệ: <strong>{c.phone || "……………………………………………"}</strong>
            </p>
          </div>

          {/* Đối tượng */}
          <div className="mb-6">
            <p className="mb-2">
              Nay tôi làm đơn này kính mong quý cơ quan tiến hành điều tra làm rõ hành vi vi phạm của đối tượng:
            </p>
            <p>
              Họ và tên đối tượng: <strong>{a.fullName || "……………………………………………………"}</strong>
            </p>
            <p>
              Nơi cư ngụ / Tài khoản / SĐT:{" "}
              <span>{a.addressOrAccount || "…………………………………………………………………………"}</span>
            </p>
          </div>

          {/* Hành vi vi phạm & Diễn biến */}
          <div className="mb-6">
            <p className="font-bold mb-1">Đối tượng này đã có hành vi vi phạm như sau:</p>
            <div className="p-3 bg-stone-50 rounded border border-stone-200 whitespace-pre-wrap leading-relaxed text-justify">
              {inc.chronology ||
                inc.behaviorSummary ||
                "Trình bày rõ thời gian, địa điểm, diễn biến sự việc xảy ra và vì sao cho rằng đối tượng vi phạm pháp luật..."}
            </div>
          </div>

          {/* Chứng cứ */}
          <div className="mb-6">
            <p className="font-bold mb-1">Chứng cứ chứng minh kèm theo (nếu có):</p>
            {ev.items.length > 0 ? (
              <ul className="list-decimal list-inside space-y-1 pl-2">
                {ev.items.map((item, idx) => (
                  <li key={idx} className="text-slate-800">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="italic text-slate-500">Chưa có tài liệu đính kèm (Ảnh chụp màn hình, ghi âm, sao kê...)</p>
            )}
          </div>

          {/* Cam kết */}
          <div className="space-y-2 mb-8 text-justify">
            <p>
              Từ vụ việc xảy ra nêu trên, tôi cho rằng cá nhân này đã có hành vi vi phạm pháp luật. Kính đề nghị quý cơ quan điều tra làm rõ hành vi trên để đảm bảo quyền lợi hợp pháp và giữ vững an ninh trật tự xã hội.
            </p>
            <p>
              Tôi xin cam đoan những gì tôi vừa trình bày là sự thật và hoàn toàn chịu trách nhiệm trước pháp luật về nội dung vừa nêu.
            </p>
            <p>Xin chân thành cảm ơn./.</p>
          </div>

          {/* Ký tên */}
          <div className="flex justify-end text-center mt-8">
            <div className="w-64 space-y-1">
              <p className="font-bold">Người làm đơn</p>
              <p className="italic text-xs text-slate-500">(Ký và ghi rõ họ tên)</p>
              <div className="h-16 flex items-center justify-center">
                {c.fullName ? (
                  <span className="text-sky-700 font-bold italic">{c.fullName}</span>
                ) : (
                  <span className="text-slate-300 text-xs">Chưa ký</span>
                )}
              </div>
              <p className="font-bold uppercase text-xs">{c.fullName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --test tests/complaint-document-preview-ui.test.mjs`
Kỳ vọng: 1/1 test pass.

- [ ] **Step 5: Commit**

```bash
git add components/ComplaintDocumentPreview.tsx tests/complaint-document-preview-ui.test.mjs
git commit -m "feat: add complaint live preview and A4 printable component"
```

---

### Task 7: Modal Hướng Dẫn Cơ Quan Tiếp Nhận & 4 Bước Nộp Đơn (`components/SubmissionGuidanceModal.tsx`)

**Files:**
- Create: `components/SubmissionGuidanceModal.tsx`
- Test: `tests/submission-guidance.test.mjs`

**Interfaces:**
- Consumes: `isOpen: boolean`, `onClose: () => void`, `currentAuthority?: RecipientAuthority`, `onSelectAuthority: (auth: RecipientAuthority) => void`
- Produces: Modal hiển thị thẩm quyền tiếp nhận theo Điều 145, 146 BLTTHS 2015, danh bạ từ `/api/co-quan`, và cẩm nang 4 bước nộp đơn an toàn.

- [ ] **Step 1: Viết test cho guidance modal**

Tạo `tests/submission-guidance.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("SubmissionGuidanceModal details 4 safe steps and authority selection", () => {
  const content = fs.readFileSync("components/SubmissionGuidanceModal.tsx", "utf8");
  assert.ok(content.includes("Điều 145") || content.includes("Điều 146"));
  assert.ok(content.includes("Giấy tiếp nhận") || content.includes("biên nhận"));
  assert.ok(content.includes("/api/co-quan"));
  assert.ok(content.includes("02 bản đơn"));
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --test tests/submission-guidance.test.mjs`
Kỳ vọng: Thất bại do file chưa tồn tại.

- [ ] **Step 3: Hiện thực `components/SubmissionGuidanceModal.tsx`**

Tạo file `components/SubmissionGuidanceModal.tsx`:
```tsx
"use client";

import React, { useEffect, useState } from "react";
import { FaBuildingColumns, FaCheck, FaPhone, FaLocationDot, FaXmark, FaCircleInfo } from "react-icons/fa6";
import type { RecipientAuthority } from "@/lib/complaint-form-state";

interface SubmissionGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAuthority: (auth: RecipientAuthority) => void;
}

export function SubmissionGuidanceModal({
  isOpen,
  onClose,
  onSelectAuthority,
}: SubmissionGuidanceModalProps) {
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/co-quan")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAuthorities(data);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <FaBuildingColumns className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hướng dẫn Thẩm quyền & Nộp Đơn Tố Giác
              </h3>
              <p className="text-xs text-slate-500">Căn cứ Điều 145, 146 Bộ luật Tố tụng Hình sự 2015</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 4 Bước Nộp Đơn */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-3">
              Cẩm nang 4 bước nộp đơn an toàn & đúng luật
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1">
                <span className="text-xs font-bold text-sky-600">Bước 1. In 02 bản đơn</span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  In 02 bản đơn và ký tên. Một bản nộp cho cơ quan Công an, một bản yêu cầu đóng dấu/ký biên nhận giữ lại cho bản thân.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1">
                <span className="text-xs font-bold text-sky-600">Bước 2. Sao lưu chứng cứ</span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  In ảnh chụp tin nhắn, sao kê ngân hàng hoặc chép file ghi âm/video vào USB đính kèm danh mục tài liệu nộp cùng đơn.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1">
                <span className="text-xs font-bold text-sky-600">Bước 3. Lấy Giấy tiếp nhận</span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Theo Điều 146 BLTTHS, cơ quan tiếp nhận bắt buộc phải lập biên bản hoặc giao Giấy tiếp nhận tin báo tố giác tội phạm cho người tố giác.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1">
                <span className="text-xs font-bold text-sky-600">Bước 4. Gửi trực tuyến (nếu cần)</span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Có thể nộp qua Cổng Dịch vụ công Bộ Công an (dichvucong.bocongan.gov.vn) hoặc gửi bưu điện chuyển phát có báo phát.
                </p>
              </div>
            </div>
          </div>

          {/* Gợi ý cơ quan tiếp nhận */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-2">
              Chọn cơ quan Công an tiếp nhận để tự động điền vào đơn
            </h4>
            <div className="space-y-2">
              {authorities.map((auth) => (
                <div
                  key={auth.id}
                  onClick={() => {
                    setSelectedId(auth.id);
                    onSelectAuthority({
                      name: auth.name,
                      level: auth.level,
                      address: auth.address,
                      phone: auth.phone || auth.hotline,
                    });
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedId === auth.id
                      ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-1 ring-sky-500"
                      : "border-stone-200 dark:border-stone-800 hover:border-sky-300 bg-white dark:bg-stone-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{auth.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-slate-600 dark:text-slate-300">
                          {auth.scope || "Sở tại"}
                        </span>
                      </div>
                      {auth.address && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <FaLocationDot className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{auth.address}</span>
                        </p>
                      )}
                      {(auth.phone || auth.hotline) && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <FaPhone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{auth.hotline || auth.phone}</span>
                        </p>
                      )}
                    </div>
                    {selectedId === auth.id && (
                      <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                        <FaCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2 bg-stone-50/40 dark:bg-stone-800/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            Đã hiểu & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test xác minh pass**

Chạy: `node --test tests/submission-guidance.test.mjs`
Kỳ vọng: 1/1 test pass.

- [ ] **Step 5: Commit**

```bash
git add components/SubmissionGuidanceModal.tsx tests/submission-guidance.test.mjs
git commit -m "feat: add submission guidance modal and authority picker"
```

---

### Task 8: Trang Soạn Đơn Tố Giác Tích Hợp (`app/tro-giup-phap-ly/soan-don/page.tsx`) & Entry Points

**Files:**
- Create: `app/tro-giup-phap-ly/soan-don/page.tsx`
- Modify: `app/tro-giup-phap-ly/page.tsx`
- Test: `tests/soan-don-page.test.mjs`

**Interfaces:**
- Consumes: `CccdQrScanner`, `ComplaintDocumentPreview`, `SubmissionGuidanceModal`, `lib/complaint-form-state.ts`, `lib/docx-generator.ts`.
- Produces: Trang hỗ trợ làm đơn 2 cột hoàn chỉnh, kết nối với trang `/tro-giup-phap-ly`.

- [ ] **Step 1: Viết test cho trang soạn đơn**

Tạo `tests/soan-don-page.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("soan-don page integrates SiteHeader, SiteFooter, 2-column layout, and security banner", () => {
  const content = fs.readFileSync("app/tro-giup-phap-ly/soan-don/page.tsx", "utf8");
  assert.ok(content.includes("SiteHeader"));
  assert.ok(content.includes("SiteFooter"));
  assert.ok(content.includes("ComplaintDocumentPreview"));
  assert.ok(content.includes("CccdQrScanner"));
  assert.ok(content.includes("SubmissionGuidanceModal"));
  assert.ok(content.includes("Cam kết bảo mật"));
});

test("tro-giup-phap-ly main page links to soan-don page", () => {
  const content = fs.readFileSync("app/tro-giup-phap-ly/page.tsx", "utf8");
  assert.ok(content.includes("/tro-giup-phap-ly/soan-don"));
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `node --test tests/soan-don-page.test.mjs`
Kỳ vọng: Thất bại do `app/tro-giup-phap-ly/soan-don/page.tsx` chưa tồn tại.

- [ ] **Step 3: Hiện thực trang `app/tro-giup-phap-ly/soan-don/page.tsx`**

Tạo file `app/tro-giup-phap-ly/soan-don/page.tsx` tích hợp 2 cột: Cột trái (AI Chat phỏng vấn + Quét CCCD), Cột phải (Live Preview + Xuất docx).

- [ ] **Step 4: Bổ sung liên kết nổi bật tại `app/tro-giup-phap-ly/page.tsx`**

Cập nhật `app/tro-giup-phap-ly/page.tsx` bổ sung nút: `"Soạn thảo Đơn tố giác tội phạm trực tuyến (AI Hỗ trợ)"` dẫn tới `/tro-giup-phap-ly/soan-don`.

- [ ] **Step 5: Chạy test xác minh pass**

Chạy: `node --test tests/soan-don-page.test.mjs`
Kỳ vọng: 2/2 tests pass.

- [ ] **Step 6: Kiểm tra toàn diện chất lượng (Zero Regression)**

Chạy:
```bash
npx tsc --noEmit
npm test
```
Kỳ vọng: TypeScript 0 lỗi, toàn bộ 550+ tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/tro-giup-phap-ly/soan-don/page.tsx app/tro-giup-phap-ly/page.tsx tests/soan-don-page.test.mjs
git commit -m "feat: implement AI assisted complaint form generator page"
```
