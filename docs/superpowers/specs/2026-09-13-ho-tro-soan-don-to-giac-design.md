# Thiết Kế Chi Tiết: Trợ Giúp Pháp Lý - Soạn Thảo Đơn Tố Giác Tội Phạm (AI-Assisted Legal Form)

- **Ngày ban hành:** 13/09/2026
- **Tài liệu tham chiếu:** Mẫu đơn gốc [`docs/don/don-to-giac.docx`](file:///Applications/work/tuyentruyenantoangiaothong/docs/don/don-to-giac.docx)
- **Bộ luật liên quan:** Bộ luật Tố tụng Hình sự 2015 (Điều 144, 145, 146 về tố giác, tin báo về tội phạm)
- **Mã định danh tính năng:** `US-049` (AI Legal Petition Assistant & Client-side CCCD Scan)

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)

### 1.1. Bối cảnh & Vấn đề
Học sinh, sinh viên và người dân khi đối mặt với các hành vi vi phạm pháp luật (bạo lực học đường, đe dọa cưỡng đoạt tài sản, phát tán hình ảnh nhạy cảm trên mạng xã hội, lừa đảo app vay tiền/công việc) thường rơi vào trạng thái hoảng loạn, không biết cách viết đơn tố giác theo chuẩn pháp lý, thiếu thông tin về thẩm quyền cơ quan công an tiếp nhận và lo sợ bị rò rỉ dữ liệu cá nhân nhạy cảm.

### 1.2. Mục tiêu giải pháp
1. **Bảo mật tuyệt đối (Zero-Knowledge Privacy):** Dữ liệu định danh cá nhân từ Căn cước công dân (CCCD) được đọc và xử lý 100% tại Client (trình duyệt của người dùng), không truyền tải và không lưu trữ trên bất kỳ máy chủ hay cơ sở dữ liệu nào.
2. **Quét CCCD thông minh tại chỗ:** Quét mã QR góc trên thẻ CCCD gắn chip qua camera hoặc tải ảnh, tự động trích xuất các trường: Họ tên, Số CCCD, Ngày sinh, Giới tính, Thường trú, Ngày cấp.
3. **Trợ lý AI đồng hành:** Hỏi đáp từng câu ngắn gọn, ân cần, giúp nạn nhân bình tĩnh diễn giải lại thời gian, địa điểm, diễn biến sự việc, thông tin đối tượng và các bằng chứng hiện có.
4. **Live Preview 2 cột:** Xem trước mẫu đơn chuẩn A4 theo đúng định dạng [`don-to-giac.docx`](file:///Applications/work/tuyentruyenantoangiaothong/docs/don/don-to-giac.docx) với khả năng sáng đèn theo thời gian thực và cho phép nhấp chuột sửa trực tiếp.
5. **Đa dạng định dạng xuất:** Xuất file Microsoft Word `.docx` chuẩn và In/Lưu PDF trực tiếp từ trình duyệt.
6. **Điều hướng cơ quan thụ lý & Cẩm nang nộp đơn an toàn:** Kết nối dữ liệu cơ quan tiếp nhận từ [`/api/co-quan`](file:///Applications/work/tuyentruyenantoangiaothong/app/api/co-quan/route.ts) để gợi ý đúng đơn vị Công an cấp xã/phường hoặc quận/huyện thụ lý, kèm quy trình 4 bước nộp đơn đảm bảo quyền lợi nạn nhân.

---

## 2. Kiến Trúc & Nguyên Tắc Bảo Mật (Architecture & Privacy-by-Design)

```
       [ Client Browser (Zero-Knowledge Sandbox) ]
  +-------------------------------------------------------------+
  |  1. CCCD QR Scanner (BarcodeDetector API / jsqr)           |
  |     └─ Input: Camera / Local Image                          |
  |     └─ Output: PII Data -> React State / sessionStorage      |
  |                                                             |
  |  2. Live Preview & Inline Editor (A4 Template)             |
  |     └─ Assembles PII + AI Extracted Incident Data           |
  |                                                             |
  |  3. Export Engine (docx / window.print)                     |
  |     └─ Generates .docx & PDF strictly on Client             |
  +-------------------------------------------------------------+
               | (Anonymized prompts ONLY - NO PII)
               v
  +-------------------------------------------------------------+
  |  Server API: /api/legal-aid/interview & /api/co-quan        |
  |     - Formulates next clarifying questions                  |
  |     - Extracts structured incident facts (JSON)             |
  |     - Serves verified referral authority directory          |
  +-------------------------------------------------------------+
```

### 2.1. Quy tắc Bảo mật Dữ liệu Nhạy cảm (PII Isolation)
- Dữ liệu CCCD (Họ tên, Số CCCD, Địa chỉ, Ngày cấp) tuyệt đối không được đưa vào `body` của bất kỳ request HTTP nào gửi lên server.
- Khi AI phỏng vấn người dùng, request gửi lên chỉ chứa nội dung lời kể vụ việc dạng phi định danh (ví dụ: *"Tôi bị đe dọa tại địa bàn Quận Cẩm Lệ..."*).
- Cung cấp nút xóa khẩn cấp: `"Xóa toàn bộ dữ liệu & Thoát"` lập tức dọn sạch `sessionStorage`, `canvas` memory và đóng phiên.

---

## 3. Cấu Trúc Dữ Liệu (Data Models)

### 3.1. Mô hình Dữ liệu Đơn Tố Giác (`ComplaintFormState`)
```typescript
export interface ComplainantInfo {
  fullName: string;          // Họ và tên người làm đơn
  birthYear: string;         // Năm sinh / Ngày sinh
  idNumber: string;          // Số CCCD / CMND
  idIssueDate: string;       // Ngày cấp
  idIssuePlace: string;      // Nơi cấp (Cục Cảnh sát QLHC về TTXH...)
  permanentAddress: string;  // Hộ khẩu thường trú
  currentAddress: string;    // Nơi cư ngụ hiện tại
  phone: string;             // Số điện thoại liên hệ
}

export interface AccusedInfo {
  fullName: string;          // Họ tên đối tượng (hoặc biệt danh/tên tài khoản MXH)
  addressOrAccount: string;  // Nơi cư ngụ hoặc link Facebook/Zalo/SĐT
  relationship: string;      // Mối quan hệ với người làm đơn (nếu có)
}

export interface IncidentInfo {
  behaviorSummary: string;   // Tên hành vi vi phạm (Lừa đảo, đe dọa, làm nhục...)
  occurrenceTime: string;    // Thời gian xảy ra
  location: string;          // Địa điểm xảy ra
  chronology: string;        // Diễn biến chi tiết sự việc
  damageOrLoss: string;      // Thiệt hại về tài sản / sức khỏe / tinh thần
}

export interface EvidenceInfo {
  items: string[];           // Danh sách tài liệu, chứng cứ (ảnh chụp, tin nhắn, sao kê...)
  witnessInfo?: string;      // Thông tin người làm chứng (nếu có)
}

export interface RecipientAuthority {
  name: string;              // Tên cơ quan (VD: Cơ quan CSĐT Công an Huyện Cư M'gar)
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
  createdDate: string;       // Ngày tháng năm làm đơn
}
```

---

## 4. Thiết Kế Giao Diện & Trải Nghiệm (UX/UI Specification)

### 4.1. Bố Cục Trang (`/tro-giup-phap-ly/soan-don`)
- **Header:** Giữ nguyên `SiteHeader`, breadcrumb `Trang chủ / Trợ giúp pháp lý / Hỗ trợ soạn đơn tố giác`.
- **Thanh cảnh báo bảo mật:** Banner xanh lục nhạt với icon khiên bảo mật:
  `🛡️ Cam kết bảo mật: Dữ liệu cá nhân của bạn được xử lý và lưu hoàn toàn trên thiết bị này.`
- **Cột Trái (45% chiều rộng): Trợ lý AI Phỏng Vấn**
  - Khung hội thoại dạng chat cuộn êm ái.
  - Bộ nút hành động nhanh: `📷 Quét CCCD`, `✍️ Nhập tay`, `🔄 Bắt đầu lại`.
  - Hộp nhập liệu có gợi ý ngữ cảnh (Quick suggestion chips).
- **Cột Phải (55% chiều rộng): Tờ Đơn Live Preview**
  - Khung hiển thị mô phỏng trang A4 nền trắng, đổ bóng nổi bật trên nền kem `#FBF9F5`.
  - Các trường dữ liệu có animation highlight màu hổ phách nhạt khi được điền mới.
  - Cho phép người dùng click trực tiếp vào văn bản để chỉnh sửa (inline contentEditable hoặc modal form nhỏ).
  - Thanh công cụ dính trên đầu tờ đơn:
    - Nút `📥 Tải file Word (.docx)`
    - Nút `🖨️ In đơn / Lưu PDF`
    - Nút `🏛️ Hướng dẫn nộp đơn`

---

## 5. Quy Trình Kỹ Thuật (Technical Implementation Details)

### 5.1. Quét & Giải Mã Mã QR CCCD (Client-Side)
- **Chuỗi dữ liệu QR CCCD chuẩn Việt Nam:**
  `<Số CCCD>|<Số CMND cũ>|<Họ và tên>|<Ngày sinh (ddmmyyyy)>|<Giới tính>|<Nơi thường trú>|<Ngày cấp (ddmmyyyy)>`
- **Bộ phân tích cú pháp (`lib/cccd-parser.ts`):**
  - Tách chuỗi theo ký tự phân tách `|`.
  - Chuẩn hóa ngày tháng năm từ `ddmmyyyy` sang `dd/mm/yyyy`.
  - Điền tự động nơi cấp: Thẻ CCCD gắn chip do *"Cục Cảnh sát QLHC về TTXH"* cấp.
  - Tự động điền vào `complainant` của `ComplaintFormState`.

### 5.2. Xuất File Word (`.docx`) Phía Trình Duyệt
- Sử dụng thư viện `docx` tạo cấu trúc Document tương thích 100% với mẫu [`docs/don/don-to-giac.docx`](file:///Applications/work/tuyentruyenantoangiaothong/docs/don/don-to-giac.docx):
  - Quốc hiệu, Tiêu ngữ: Font Times New Roman, size 12-13, căn giữa, in đậm.
  - Tiêu đề đơn: `ĐƠN TỐ GIÁC TỘI PHẠM`, size 14, in đậm, căn giữa.
  - Kính gửi: Cơ quan CSĐT Công an thụ lý.
  - Toàn bộ thông tin nhân thân, hành vi, chứng cứ, cam kết và chữ ký người làm đơn.
- Xuất Blob tải xuống trực tiếp thông qua `Packer.toBlob()`.

### 5.3. Hướng Dẫn Thẩm Quyền & Nộp Đơn An Toàn
- **Map thẩm quyền theo Điều 145, 146 BLTTHS 2015:**
  - Cơ quan có thẩm quyền tiếp nhận: Cơ quan Công an xã/phường/thị trấn sở tại (tiếp nhận ban đầu, lập biên bản tiếp nhận) hoặc Cơ quan CSĐT Công an quận/huyện nơi xảy ra tội phạm.
- **Cẩm nang 4 bước nộp đơn:**
  1. *In 02 bản đơn và ký tên:* 01 bản nộp cơ quan công an, 01 bản giữ lại.
  2. *Sao lưu & đính kèm chứng cứ:* In ảnh chụp màn hình, sao kê tài khoản ngân hàng, USB lưu video/ghi âm.
  3. *Lấy Giấy tiếp nhận tin báo/tố giác:* Luôn yêu cầu cán bộ tiếp nhận cấp Giấy tiếp nhận hoặc ký xác nhận vào bản đơn lưu của mình.
  4. *Kênh nộp bổ sung:* Hướng dẫn cách gửi đơn qua Dịch vụ công Bộ Công an hoặc qua đường bưu điện chuyển phát có báo phát nếu không thể trực tiếp đến cơ quan công an.

---

## 6. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

### 6.1. Unit Tests
- `tests/cccd-parser.test.mjs`: Kiểm thử phân tích chính xác chuỗi QR CCCD 7 trường, định dạng ngày sinh, xử lý chuỗi rác/lỗi.
- `tests/complaint-form-state.test.mjs`: Kiểm thử cập nhật bất biến (immutable) của form state khi người dùng chỉnh sửa từng trường.
- `tests/docx-generator.test.mjs`: Kiểm thử cấu trúc OpenXML của file docx tạo ra đảm bảo mở được trên Microsoft Word / Google Docs không lỗi format.

### 6.2. Component & UI Tests
- `tests/soan-don-page.test.mjs`: Kiểm thử trang `/tro-giup-phap-ly/soan-don` render đầy đủ Header, Footer, Banner bảo mật, Cột AI và Cột Live Preview.
- Ràng buộc mã nguồn: Kiểm tra độ an toàn kiểu dữ liệu `npx tsc --noEmit` đạt 0 lỗi; đảm bảo `app/page.tsx` duy trì `< 990` dòng.
