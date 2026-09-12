# Thiết kế: Nâng cấp các chức năng đã được duyệt (đợt 2026-09-12)

Ngày: 2026-09-12. Trạng thái: đã duyệt qua brainstorming.

## Nguồn yêu cầu

Google Sheet *"Danh mục chức năng cần nâng cấp — Website/Ứng dụng Luật học
đường"* (`19SnsKIFDGomjODqSllDT9tcZMvxRq7MNKAZCOIA76lQ`), 22 dòng chức năng, cột
`duyệt thực hiện` là cổng phạm vi. Bản chốt phạm vi lấy theo snapshot ngày
2026-09-12; nếu chủ dự án đổi cột duyệt sau ngày này thì phải cập nhật spec.

### Trong phạm vi — 11 dòng `duyệt`

| # sheet | Nhóm | Chức năng | Ưu tiên | Giai đoạn |
|---|---|---|---|---|
| 7 | Trợ lý AI | Cảnh báo độ chính xác | Cao | GĐ1 |
| 6 | Trợ lý AI | Mục trợ giúp pháp lý | Cao | GĐ1 |
| 8 | Kho văn bản | Chuyên mục tra cứu văn bản | Cao | GĐ2 |
| 16 | Nội dung | Chuyên đề phòng chống ma túy | Cao | GĐ3 |
| 17 | Nội dung | Chuyên đề an ninh trật tự trường học | Cao | GĐ3 |
| 18 | Nội dung | Chuyên đề game và không gian mạng | Trung bình | GĐ3 |
| 19 | Nội dung | Chuyên đề khác (giao thông, tín dụng đen, tệ nạn xã hội) | Trung bình | GĐ3 |
| 20 | Giao diện | Rà soát mức độ phù hợp đối tượng | Cao | GĐ4 |
| 22 | Giao diện | Bổ sung yếu tố tương tác (xếp hạng, khen thưởng) | Trung bình | GĐ4 |
| 21 | Giao diện | Tổ chức cho HSSV trải nghiệm | Cao | GĐ4 (công cụ) + ops |
| 2 | Truy cập | Xử lý link hết hạn / tên miền cố định | Cao | Ops, ngoài code |

### Ngoài phạm vi — 11 dòng `chưa duyệt`

Dòng 1 (đường dẫn vào trang chủ), 3 (xuất bản App Store/CH Play), 4 (AI nội bộ
local), 5 (AI soạn thảo đơn từ), 9 (tự động cập nhật văn bản mới), 10 (cảnh báo
hiệu lực văn bản — xem DEC-021), 11–15 (toàn bộ nhóm *Tiếp nhận phản ánh*).

Nhóm *Tiếp nhận phản ánh* bị loại hoàn toàn. GĐ4 có form thu phản hồi trải
nghiệm sản phẩm; ranh giới này được chốt cứng ở DEC-024 để không biến nó thành
kênh phản ánh an ninh trật tự.

## Thứ tự triển khai và lý do

Thứ tự giai đoạn đi theo **phụ thuộc kỹ thuật**, không thuần theo cột ưu tiên.

- GĐ3 (nội dung chuyên đề) phải trích dẫn được điều/khoản, nên GĐ2 (kho văn
  bản) đi trước. Làm ngược lại thì phải nhập căn cứ hai lần.
- GĐ1 không chạm mô hình dữ liệu pháp lý nên tách ra trước, ship được độc lập.
- Chia nhóm nội dung theo mức ưu tiên (Cao #16/#17 trước, Trung bình #18/#19
  sau) sẽ buộc sửa `lib/topics.ts` hai lần. Đây là union type bị đọc ở admin
  API, form CMS, trang chủ và chat context, nên gộp một lần.

## Quyết định

| ID | Quyết định | Hệ quả |
|---|---|---|
| DEC-020 | Khuyến cáo độ chính xác là **một nguồn duy nhất** trong `lib/ai-disclosure.ts`, hai mức: nội dung đã duyệt và nội dung AI/nguồn ngoài chưa xác minh. | Mọi bề mặt trả lời phải render qua `components/AiDisclaimer.tsx`. Cấm viết lại câu khuyến cáo tại chỗ. |
| DEC-021 | Kho văn bản hiển thị nhãn hiệu lực ở mức tối thiểu, dù dòng 10 của sheet chưa duyệt. | Chủ dự án đã đồng ý ngày 2026-09-12. Đây là mở rộng có chủ đích để không dẫn HSSV đọc văn bản hết hiệu lực, theo bài học CR-001. Không làm cơ chế theo dõi/tự phát hiện thay đổi hiệu lực — đó là dòng 9/10 đầy đủ, vẫn ngoài phạm vi. |
| DEC-022 | Danh mục cơ quan có thẩm quyền là **dữ liệu đã duyệt trong database**, AI không được sinh tên/địa chỉ/số điện thoại cơ quan. | Cùng nguyên tắc DEC-002 áp cho citation. Thiếu dữ liệu cơ quan cho một lĩnh vực thì hiển thị đầu mối mặc định cấp tỉnh, không suy diễn. |
| DEC-023 | Xếp hạng dùng sidecar `player_profiles` gồm biệt danh tự chọn và mã trường tự khai; `game_progress` giữ nguyên phi định danh theo DEC-015/DEC-018. | Không thu tên thật, lớp, ngày sinh, số điện thoại, email. Không đăng nhập. Biệt danh qua bộ lọc từ ngữ và có đường tự xóa. |
| DEC-024 | Form phản hồi GĐ4 chỉ nhận đánh giá trải nghiệm sản phẩm, không nhận tố giác/phản ánh vụ việc. | Ô nhập có giới hạn ký tự, có dòng chỉ dẫn chuyển sang hotline 111/113 khi là việc cần can thiệp. Không đính kèm ảnh/video/ghi âm (dòng 12 chưa duyệt). |
| DEC-025 | Nội dung pháp lý 4 chuyên đề mới được đưa vào ở trạng thái chưa công khai: `legal_provisions.status = pending_review`, `legal_entries.status = draft`. | Đội phát triển soạn draft và đối soát nguồn; người duyệt nội dung nội bộ mới được publish (DEC-003). Chuyên đề chỉ xuất hiện trên trang công khai khi có tối thiểu một `legal_entries` đã publish. |

## GĐ1 — Minh bạch và trợ giúp pháp lý

### #7 Cảnh báo độ chính xác

Hiện trạng: một dòng chữ nhỏ ở chân hộp chat (`app/page.tsx:1098`,
*"Nội dung chỉ để học tập, không thay thế tư vấn pháp lý"*), cộng vài câu cảnh
báo viết rải rác trong `lib/openai-web-search.ts:43-46` và
`lib/official-source-url.ts:127-131`. Không có khuyến cáo gắn vào từng câu trả
lời, và các câu chữ đang lệch nhau.

Thiết kế:

- `lib/ai-disclosure.ts` — nguồn duy nhất. Xuất `disclosureFor(origin)` trả về
  `{ level, title, body, actionLabel }` với hai `level`:
  - `reviewed`: nội dung dựng từ dữ liệu đã duyệt. Nội dung khuyến cáo nhấn
    "cần đối chiếu văn bản gốc", kèm hành động mở nguồn chính thống.
  - `unverified`: nội dung AI hoặc nguồn ngoài chưa qua kiểm duyệt. Khuyến cáo
    mạnh hơn, nêu rõ kết quả mang tính tham khảo, không bảo đảm chính xác
    100%, không dùng làm căn cứ pháp lý.
- `components/AiDisclaimer.tsx` — trình bày khuyến cáo, có `role="note"`, không
  tự sinh câu chữ.
- Nối vào: bong bóng trả lời chat trong `app/page.tsx`,
  `components/SituationAnswer.tsx`, khối kết quả web fallback, trang
  `app/dieu-luat/[id]/page.tsx`, và trang trợ giúp pháp lý mới.
- `lib/answer-origin.ts` đã phân loại nguồn câu trả lời; `disclosureFor` nhận
  đúng kiểu đó để không phát sinh bảng map thứ hai.
- Câu chữ cảnh báo trong `lib/openai-web-search.ts` và
  `lib/official-source-url.ts` được chuyển sang import từ `lib/ai-disclosure.ts`,
  không giữ hai bản.

### #6 Mục trợ giúp pháp lý

Hiện trạng: khối `help-cta` (`app/page.tsx:784-814`) có ba đầu mối tĩnh (111,
113, Trung tâm TGPL tỉnh) viết cứng trong `helpHotlines` tại
`app/page.tsx:151-167`. Câu trả lời tình huống không chỉ ra cơ quan có thẩm
quyền nào theo từng loại việc.

Thiết kế:

- Bảng mới `referral_authorities`: `id`, `name`, `level`
  (`truong` | `xa_phuong` | `huyen` | `tinh` | `trung_uong`), `topics` (JSON
  mảng tên lĩnh vực), `scope`, `address`, `phone`, `hotline`, `note`,
  `status` (`draft` | `published`), `created_by`, `reviewed_by`, `reviewed_at`,
  `created_at`, `updated_at`.
- `lib/authority-referral.ts`: map lĩnh vực → chuỗi đầu mối theo thứ tự leo
  thang (trong trường → công an xã/phường → phòng/sở chuyên môn → hotline quốc
  gia). Hàm thuần, không gọi mạng, có test.
- `GET /api/co-quan?topic=` — chỉ trả record `status=published`.
- Trang `/tro-giup-phap-ly`: ô nhập tình huống → gọi `POST /api/chat` hiện có →
  hiển thị câu trả lời ba phần đã có, cộng khối **"Gửi đến đâu"** liệt kê cơ
  quan có thẩm quyền, cộng `AiDisclaimer`.
- `POST /api/chat` được bổ sung thêm trường `topic` trong payload trả về. Đây là
  thay đổi thêm trường, client hiện tại bỏ qua được, không đổi hành vi.
  `createChatHandler` (`app/api/chat/route.ts:124`) được tái sử dụng nguyên
  vẹn; không nhân bản pipeline evidence và fail-closed.
- `helpHotlines` viết cứng được thay bằng đọc từ `referral_authorities` cấp
  `trung_uong`/`tinh` đã publish, có fallback tĩnh khi database không phản hồi
  (theo mẫu degraded của DEC-008).

## GĐ2 — Kho văn bản pháp luật (#8)

Hiện trạng: `legal_sources` và `legal_provisions` đã tồn tại
(`db/pg-schema.ts:15`, `db/pg-schema.ts:40`) với số hiệu, tiêu đề, URL chính
thức, ngày ban hành/hiệu lực, trạng thái, checksum và `effectivity_status`.
Chưa có trang công khai nào đọc hai bảng này, và thiếu đúng hai trục lọc mà
sheet yêu cầu: **loại văn bản** và **cơ quan ban hành**. `official_host` là host
của URL, không phải cơ quan ban hành.

### Mô hình lưu trữ

Chốt theo lựa chọn của chủ dự án: **metadata + điều trích yếu + liên kết toàn
văn tại nguồn chính thống**. Không copy toàn văn vào hệ thống. Lý do: toàn văn
trong database sẽ lệch bản gốc khi văn bản được sửa đổi mà không có cơ chế đồng
bộ — mà dòng 9 (tự động cập nhật) chưa được duyệt.

### Cột thêm vào `legal_sources`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `document_type` | text, CHECK | `luat` \| `nghi_dinh` \| `thong_tu` \| `thong_tu_lien_tich` \| `quyet_dinh` \| `bo_luat` \| `khac` |
| `issuing_agency` | text, NOT NULL DEFAULT `''` | Cơ quan ban hành, ví dụ `Quốc hội`, `Chính phủ`, `Bộ Giáo dục và Đào tạo` |
| `topics` | text, NOT NULL DEFAULT `'[]'` | JSON mảng tên lĩnh vực, giá trị phải thuộc `contentTopicNames` |
| `summary` | text, NOT NULL DEFAULT `''` | Trích yếu ngắn cho HSSV, do người soạn viết, không phải toàn văn |

Migration expand-only: `drizzle/0007_legal_document_library.sql` cho nhánh SQLite
và khối `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` trong `db/pg-bootstrap.ts`
theo version gate `app_schema_version` của DEC-014. Không có seed trong
migration.

### Bề mặt công khai

- `/van-ban` — danh sách có lọc: từ khóa (chuẩn hóa không dấu, dùng lại bộ chấm
  điểm của `lib/situation-search.ts`, **không** thêm FTS5), lĩnh vực, loại văn
  bản, cơ quan ban hành, trạng thái hiệu lực. Lọc phản ánh vào URL search params
  để chia sẻ được.
- `/van-ban/[id]` — metadata đầy đủ, nhãn hiệu lực (DEC-021), danh sách điều
  trích yếu đã publish kèm bản giản lược, nút mở toàn văn tại nguồn qua
  allowlist `lib/official-source-url.ts` (DEC-004).
- `GET /api/van-ban` và `GET /api/van-ban/[id]` — chỉ trả `legal_provisions` có
  `status=published`; `legal_sources` phải có `status` khác `draft`. Danh sách
  phân trang bằng `limit`/`offset`, mặc định 20 và trần 50 bản ghi mỗi lượt, để
  kho lớn dần không làm nặng một request.
- Nhãn hiệu lực lấy từ `legal_sources.status` và
  `legal_provisions.effectivity_status`, hiển thị bốn trạng thái: còn hiệu lực,
  hết hiệu lực, được thay thế, chưa xác định. Văn bản hết hiệu lực/được thay thế
  vẫn tra cứu được nhưng có nhãn cảnh báo nổi bật.
- `lib/legal-document-library.ts` — tầng đọc dữ liệu và lọc, thuần, có test.

### Bề mặt quản trị

`app/admin/AdminDashboard.tsx` hiện có hai tab (nội dung, game). Thêm tab **Văn
bản** quản lý `legal_sources` và `legal_provisions`, với
`app/admin/api/legal-documents/route.ts`:

- Bắt buộc `official_url` thuộc allowlist DEC-004.
- Chặn publish provision khi `legal_basis` trùng deny-list Nghị định 131/2013
  hiện có, giữ nguyên guard của CR-001.
- Giữ bốn mắt: người tạo không được tự duyệt (DEC-003), dùng lại sidecar
  editorial đã có ở `db/schema.ts:285-560`.

## GĐ3 — Bốn chuyên đề nội dung (#16–#19)

### Bộ lĩnh vực sau khi mở rộng

`lib/topics.ts` hiện có 5 lĩnh vực: Giao thông, Mạng xã hội, Bạo lực học đường,
An ninh trật tự, Sở hữu trí tuệ. Thêm 4:

| Lĩnh vực mới | Dòng sheet | Phạm vi nội dung |
|---|---|---|
| Ma túy | 16 | Nhận biết, tác hại, chế tài xử lý, kỹ năng từ chối |
| Game & không gian mạng | 18 | Game online, giới hạn giờ chơi với người dưới 18, an ninh mạng, lừa đảo trực tuyến, thông tin xấu độc |
| Tín dụng đen | 19 | Cho vay lãi nặng, app vay nhanh, đòi nợ trái pháp luật |
| Tệ nạn xã hội | 19 | Đánh bạc, cá độ, tổ chức đánh bạc |

Lĩnh vực `An ninh trật tự` (dòng 17) được bổ sung keywords *gây rối trật tự công
cộng*, *tụ tập đông người*, *mang vũ khí đến trường* và các câu hỏi tình huống
tương ứng. `Giao thông` (dòng 19) không thêm lĩnh vực mới và không sửa nội dung
hiện có; việc duy nhất là kiểm tra bốn `legal_entries` giao thông đang publish
có `legal_entry_citations` trỏ tới provision còn hiệu lực, và ghi kết quả kiểm
tra vào `docs/PROGRESS.md`. Thiếu citation thì mở thành mục việc riêng, không
âm thầm sửa căn cứ.

Nội dung ma túy viết theo hướng nhận biết – tác hại – chế tài – kỹ năng từ chối.
Không mô tả cách sử dụng, cách điều chế, hay bất cứ thứ gì có thể đọc thành chỉ
dẫn thực hành.

Chín lĩnh vực vượt sức chứa của dải chip lĩnh vực ở 320px. Bố cục dải chip được
xử lý trong GĐ4 (#20), không phải trong GĐ3.

### Rủi ro lan rộng khi sửa `lib/topics.ts`

`ContentTopic` là union type suy ra từ `contentTopicNames`, và chú thích đầu file
ghi rõ danh sách này từng bị chép ở bốn nơi. Trước khi sửa phải chạy
`impact({target: "contentTopicNames", direction: "upstream"})` và báo blast
radius, theo `CLAUDE.md`. Dự kiến bị ảnh hưởng: `app/page.tsx`,
`app/admin/api/content/route.ts`, form CMS trong `app/admin/AdminDashboard.tsx`,
`lib/knowledge-router.ts`, `lib/legal-content.ts`.

### Dữ liệu mỗi chuyên đề

Mỗi chuyên đề gồm: `legal_sources` (văn bản gốc) → `legal_provisions`
(`pending_review`) → `legal_entries` (`draft`) → `legal_entry_citations`, cộng
một bộ `quiz_questions` và một `roleplay_scenarios` + `roleplay_nodes`.

Danh mục văn bản dưới đây là **đề xuất để đối soát**, không phải dữ liệu đã xác
minh. Mỗi văn bản phải được mở trên `vbpl.vn` để xác nhận số hiệu, ngày hiệu
lực, tình trạng còn hiệu lực và điều/khoản/điểm chính xác **trước khi** seed.
Văn bản nào không xác nhận được thì bỏ khỏi đợt này, không suy diễn.

| Chuyên đề | Văn bản cần đối soát |
|---|---|
| Ma túy | Luật Phòng, chống ma túy 2021; Nghị định 105/2021/NĐ-CP; Nghị định 144/2021/NĐ-CP (xử phạt hành chính về ANTT); Bộ luật Hình sự 2015 sửa đổi 2017, chương các tội về ma túy |
| ANTT trường học | Nghị định 144/2021/NĐ-CP (gây rối trật tự công cộng); Bộ luật Hình sự 2015 sửa đổi 2017 (gây rối trật tự công cộng, cố ý gây thương tích); Nghị định 04/2021/NĐ-CP (xử phạt trong lĩnh vực giáo dục); Thông tư của Bộ GD&ĐT về điều lệ trường trung học |
| Game & không gian mạng | Luật An ninh mạng 2018; Nghị định quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng đang có hiệu lực; Nghị định 15/2020/NĐ-CP và văn bản sửa đổi |
| Tín dụng đen | Bộ luật Dân sự 2015 (lãi suất trong hợp đồng vay); Bộ luật Hình sự 2015 sửa đổi 2017 (cho vay lãi nặng trong giao dịch dân sự); Nghị định 144/2021/NĐ-CP |
| Tệ nạn xã hội | Nghị định 144/2021/NĐ-CP (đánh bạc); Bộ luật Hình sự 2015 sửa đổi 2017 (đánh bạc, tổ chức đánh bạc) |

Cổng hiển thị: lĩnh vực chỉ xuất hiện trong dải chip và bộ lọc khi có tối thiểu
một `legal_entries` `status=published` thuộc lĩnh vực đó. Trạng thái chờ duyệt
không tạo ra chuyên đề rỗng trên production.

## GĐ4 — Trải nghiệm

### #20 Rà soát mức độ phù hợp đối tượng

Đây là việc **đo trước, sửa sau**. Không sửa giao diện theo cảm tính.

Bước đo, có bằng chứng lưu lại:

- Độ khó câu chữ: đếm câu dài quá 25 từ, thuật ngữ pháp lý chưa được giải thích
  ngay tại chỗ, từ viết tắt xuất hiện lần đầu mà không mở ngoặc.
- Số bước từ trang chủ tới câu trả lời cho 5 tình huống mẫu.
- Tiếp cận: kiểm tra tự động bằng axe, tương phản màu, điều hướng bàn phím đủ
  vòng, `prefers-reduced-motion`, kích thước vùng chạm tối thiểu 44px.
- Ảnh chụp 320, 375, 768, 1024, 1440 cho trang chủ, tra cứu, kho văn bản, trợ
  giúp pháp lý, xếp hạng. Kiểm tra không tràn ngang.

Bước sửa: đi theo danh sách phát hiện, gồm cả bố cục dải chip 9 lĩnh vực ở màn
hình hẹp. Mỗi mục sửa phải trỏ được về một phát hiện cụ thể.

### #22 Xếp hạng và khen thưởng

Hiện trạng: quiz (`components/QuizPanel.tsx`), nhập vai
(`components/RoleplayPanel.tsx`), điểm và bậc huy hiệu
(`lib/gamification.ts`, `components/GameZone.tsx`) đã có. `game_progress` khóa
bằng hash một chiều của token random do trình duyệt sinh
(`db/pg-schema.ts:241`), nên hiện không thể xếp hạng ai với ai.

Thiết kế theo DEC-023:

- Bảng `schools`: `code`, `name`, `district`, `status`. Danh mục do quản trị
  nhập, học sinh chỉ chọn.
- Bảng `player_profiles`: `player_key` (khóa chính, dùng đúng hash đang có),
  `nickname`, `school_code`, `created_at`, `updated_at`. Không cột nào chứa định
  danh cá nhân.
- `lib/nickname-policy.ts`: giới hạn ký tự, chuẩn hóa, bộ lọc từ ngữ thô tục và
  từ trông giống tên thật đầy đủ. Hàm thuần, có test.
- `/xep-hang`: ba bảng — top trong trường của người chơi, top giữa các trường
  theo điểm trung bình, top toàn hệ thống theo tuần. Có mốc thời gian tính.
- `GET /api/xep-hang` và `POST /api/nguoi-choi` (đặt biệt danh/trường),
  `DELETE /api/nguoi-choi` (tự xóa hồ sơ, giữ điểm phi định danh).
- Khen thưởng: giấy khen sinh phía client dạng SVG tải về được, theo đúng cách
  `lib/qr-code.ts` đang làm — không gọi dịch vụ bên thứ ba, không gửi biệt danh
  ra ngoài.
- Chống gian: điểm vẫn chỉ cộng khi server xác nhận, giữ nguyên cơ chế khóa
  phần thưởng của DEC-018. Bảng xếp hạng đọc `game_progress`, không nhận điểm
  từ client.

### #21 Công cụ cho đợt trải nghiệm tại trường

Phần đi trường, tổ chức và thu thập tại chỗ là việc của chủ dự án. Phần trong
sản phẩm:

- Bảng `experience_feedback`: `id`, `school_code`, `role` (`hoc_sinh` |
  `sinh_vien` | `giao_vien`), `ease_score`, `useful_score`,
  `would_recommend_score` (thang 1–5), `comment` (giới hạn 500 ký tự),
  `created_at`. Không lưu IP, không lưu `player_key`, không định danh.
- `/phan-hoi-trai-nghiem` — form ngắn, có rate limit dùng lại `lib/rate-limit.ts`.
- Tab admin xem theo trường, có điểm trung bình và export CSV.
- Theo DEC-024: ô nhập có dòng chỉ dẫn rõ "đây là góp ý về ứng dụng; việc cần
  can thiệp hãy gọi 111 hoặc 113", không có đính kèm tệp.

## Ngoài code

### #2 Tên miền cố định

Cần chủ dự án quyết định, không phải việc lập trình:

- DEC-001 đã chốt Cloudflare Worker + D1 là production primary, nhưng PRD §12
  ghi rollout đang **BLOCKED** vì Sites `project_id` không resolve được và hành
  vi áp migration trước activation chưa được xác minh.
- Repo vẫn còn `vercel.json` và `.vercel/`, tức còn hai đường deploy song song.
- Chưa có tên miền nào được cấp.

Hệ quả cho các giai đoạn trên: mọi thứ chỉ verify được ở môi trường local. Theo
`AGENTS.md` mục 8, phải ghi rõ check nào không chạy được và vì sao.

### #21 phần tổ chức

Chọn trường, lịch, nhân sự hướng dẫn, thiết bị. Ngoài phạm vi code.

## Cách chia implementation plan

Bốn giai đoạn là quá lớn cho một plan. Mỗi giai đoạn có một plan riêng trong
`docs/superpowers/plans/`, thực hiện tuần tự, và chỉ bắt đầu plan sau khi plan
trước đã có bằng chứng hoàn thành trong `docs/PROGRESS.md`. GĐ3 còn thêm một
cổng nữa: không seed khi chưa đối soát xong danh mục văn bản.

## Kiểm thử

Theo `AGENTS.md`: mỗi acceptance criterion phải có bằng chứng trỏ tới file,
test, migration hoặc lệnh xác minh.

| Hạng mục | Kiểm thử |
|---|---|
| `lib/ai-disclosure.ts` | Unit: đúng hai mức, mọi `answerOrigin` đều map được, không có nhánh trả về rỗng |
| `lib/authority-referral.ts` | Unit: thứ tự leo thang theo lĩnh vực, lĩnh vực thiếu dữ liệu trả đầu mối mặc định |
| `/api/co-quan` | Integration: chỉ trả `published`, từ chối method sai |
| Cột mới `legal_sources` | Schema test cùng mẫu `tests/schema-foundation.test.mjs`: CHECK `document_type`, `topics` chỉ nhận lĩnh vực hợp lệ, migration expand-only chạy hai lần không lỗi |
| `lib/legal-document-library.ts` | Unit: lọc không dấu, bốn trục lọc kết hợp, provision chưa publish không lọt ra |
| `/api/van-ban` | Integration: `draft` không lọt, allowlist URL, phân trang |
| Admin văn bản | Integration: từ chối URL ngoài allowlist, chặn deny-list Nghị định 131, chặn người tạo tự duyệt |
| `lib/topics.ts` mở rộng | Regression suite hiện có phải còn pass; thêm test lĩnh vực không có entry published thì không hiện |
| `lib/nickname-policy.ts` | Unit: bộ lọc từ ngữ, độ dài, chuẩn hóa, biệt danh trùng |
| `/api/xep-hang` | Integration: không nhận điểm từ client, hồ sơ đã xóa không xuất hiện |
| `/phan-hoi-trai-nghiem` | Integration: rate limit, giới hạn ký tự, không lưu định danh |
| #20 | Playwright: ảnh chụp 5 breakpoint × 5 trang, axe không lỗi nghiêm trọng, điều hướng bàn phím |

## Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Bốn chuyên đề mới không được duyệt kịp | Cao | DEC-025: draft nằm sẵn chờ duyệt, lĩnh vực chỉ hiện khi có entry published |
| Văn bản trong danh mục đề xuất hóa ra đã hết hiệu lực | Cao | Đối soát vbpl.vn trước khi seed; deny-list và guard CR-001 giữ nguyên; nhãn hiệu lực DEC-021 |
| Sửa `lib/topics.ts` lan ra 5 file | Trung bình | `impact` trước khi sửa, báo blast radius, regression suite |
| Dữ liệu người dưới 18 tuổi trong xếp hạng | Trung bình | DEC-023: chỉ biệt danh + mã trường, bộ lọc từ ngữ, đường tự xóa |
| Form phản hồi bị dùng làm kênh tố giác | Trung bình | DEC-024: chỉ dẫn chuyển hotline, giới hạn ký tự, không đính kèm |
| Production vẫn blocked, không verify được end-to-end | Cao | Ghi rõ check không chạy được vào `docs/PROGRESS.md` |
| Kho văn bản tăng bề mặt admin trong lúc CMS chưa có actor/session thật | Trung bình | Dùng lại sidecar editorial đã có; không mở publish cho một admin duy nhất |

## User story

Spec này sinh 8 user story mới trong `docs/USER_STORIES.md`, Epic H. US-041 bắt
nguồn từ dòng 10 của sheet — dòng đang ở trạng thái `chưa duyệt` — và tồn tại
trong phạm vi này chỉ nhờ DEC-021; nó giới hạn ở nhãn hiển thị, không phải cơ
chế theo dõi hiệu lực đầy đủ mà dòng 10 mô tả.

| ID | Dòng sheet | Nội dung |
|---|---|---|
| US-038 | 7 | Khuyến cáo độ chính xác gắn vào từng câu trả lời |
| US-039 | 6 | Mục trợ giúp pháp lý chỉ ra cơ quan có thẩm quyền |
| US-040 | 8 | Chuyên mục tra cứu văn bản pháp luật |
| US-041 | 8, 10 | Nhãn hiệu lực văn bản trong kho tra cứu |
| US-042 | 16, 17, 18, 19 | Bốn chuyên đề nội dung mới |
| US-043 | 20 | Rà soát và chỉnh giao diện cho HSSV |
| US-044 | 22 | Xếp hạng và khen thưởng |
| US-045 | 21 | Thu phản hồi đợt trải nghiệm tại trường |

## Không làm

- Không thêm FTS5 hoặc vector index. Kho văn bản dùng lại bộ chấm điểm không
  dấu hiện có; nâng retrieval là việc của DEC-005/dòng 9, ngoài phạm vi.
- Không copy toàn văn văn bản pháp luật vào database.
- Không cho AI sinh tên cơ quan, số điện thoại, điều/khoản hoặc mức phạt.
- Không làm kênh tiếp nhận phản ánh an ninh trật tự, không đính kèm ảnh/video/
  ghi âm, không luồng chuyển tiếp lực lượng chức năng.
- Không đăng nhập, không tài khoản học sinh, không thu tên thật.
- Không AI nội bộ, không soạn thảo đơn từ, không tự động cập nhật văn bản.
- Không đổi nền tảng deploy, không mua tên miền.
