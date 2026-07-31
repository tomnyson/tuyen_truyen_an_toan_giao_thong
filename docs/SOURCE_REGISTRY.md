# Source Registry — RAG ingestion candidates

> Cập nhật: 2026-07-31  
> Owner đăng ký: Product owner  
> Trạng thái: feasibility only; không nguồn nào được phép tự động publish hoặc
> trở thành citation.

DEC-012 cho phép `thuvienphapluat.vn` xuất hiện ở live reference fallback sau
official no-result, nhưng chỉ với nhãn “không chính thống, cần xác minh”. Ngoại
lệ trình bày này không thay đổi readiness: nguồn không được persist, ingest,
promote hoặc dùng làm căn cứ pháp lý/citation của RAG.

Tài liệu này là registry có thể review của US-023. Contract máy đọc và
validation tương ứng nằm tại `lib/source-registry.ts`; sample kỹ thuật nằm tại
`fixtures/source-registry/vbpl-nd168.sample.json`.

## Quy tắc readiness

- `official`: nguồn do cơ quan nhà nước vận hành; vẫn phải kiểm tra terms,
  freshness và mapping trước khi dùng làm citation.
- `discovery_only`: chỉ dùng để phát hiện văn bản mới; item phải được refetch từ
  URL chính thức, canonicalize và review.
- `rejected`: không dùng cho corpus.
- `yellow`: đủ để spike thủ công, chưa đủ để ingest production.
- `green`: chỉ được gán qua workflow durable khi PM và internal content reviewer
  đã xác thực đều phê duyệt, cả hai khác người đăng ký; có sample, terms/license
  đã review, audit và quyết định `go`.

Static registry hiện từ chối mọi record `green`, kể cả caller truyền các actor
ID có vẻ hợp lệ. Việc persist `green` được để lại cho authenticated workflow có
role check và audit; không có fallback từ API key/model AI để tự nâng readiness.

## Registry hiện tại

### `vbpl_national`

| Field | Giá trị |
|---|---|
| Owner | Cơ quan vận hành CSDL quốc gia về văn bản pháp luật |
| Base URL | `https://vbpl.vn/` |
| Endpoint/export | Public HTML và DOC/PDF attachment; chưa xác minh API/export có versioning |
| Format | HTML, DOC/PDF |
| Auth | Không |
| Quota | Không công bố; chỉ spike thủ công, chưa chạy batch |
| Cadence | Theo lịch đăng/cập nhật văn bản; chưa có SLA công bố |
| Fields | số hiệu, tiêu đề, ngày ban hành/hiệu lực, lịch sử hiệu lực, toàn văn, attachment |
| Availability | Public HTML |
| Terms/license | Chưa xác minh quyền bulk retrieval/retention |
| Attribution | “Nguồn: Cơ sở dữ liệu quốc gia về văn bản pháp luật” |
| Trust/readiness | `official` / `yellow` |
| Decision | `conditional_go` cho spike; `no-go` cho production ingestion |

Nguồn chính thức hiện có trang thuộc tính, toàn văn và lịch sử hiệu lực cho
Nghị định 168/2024/NĐ-CP:

- [Thuộc tính văn bản 168/2024/NĐ-CP](https://vbpl.vn/TW/Pages/vbpq-thuoctinh.aspx?ItemID=173920)
- [Toàn văn 168/2024/NĐ-CP](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=173920)
- [Lịch sử hiệu lực 168/2024/NĐ-CP](https://vbpl.vn/TW/Pages/vbpq-lichsu.aspx?ItemID=173920)

Rủi ro chính là không có connector contract ổn định, HTML/attachment có thể
đổi, và terms/retention chưa được duyệt. Chi phí spike thấp; chi phí parser,
monitoring, retry và change detection production chưa được ước lượng.

### `government_documents`

| Field | Giá trị |
|---|---|
| Owner | Cổng Thông tin điện tử Chính phủ |
| Base URL | `https://vanban.chinhphu.vn/` |
| Endpoint/export | Public HTML và PDF attachment; chưa xác minh API |
| Format | HTML, PDF |
| Auth | Không |
| Quota | Không công bố; chưa cho phép batch |
| Cadence | Theo lịch đăng văn bản; chưa có SLA |
| Fields | số hiệu, tiêu đề, ngày ban hành/hiệu lực, cơ quan, người ký, attachment |
| Availability | Public HTML |
| Terms/license | Chưa xác minh bulk retrieval/retention |
| Attribution | “Nguồn: Cổng Thông tin điện tử Chính phủ” |
| Trust/readiness | `official` / `yellow` |
| Decision | `conditional_go` cho đối chiếu metadata; `no-go` cho connector production |

[Trang Chính phủ của Nghị định 168/2024/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=212167&pageid=27160)
cung cấp metadata và PDF đã ký để đối chiếu. Đây chưa phải bằng chứng về API,
quota hay quyền lưu raw snapshot.

Đáng lưu ý, Cổng văn bản Chính phủ đã đăng
[Nghị định 238/2026/NĐ-CP](https://vanban.chinhphu.vn/?classid=0&docid=218613&pageid=27160),
sửa đổi Nghị định 168/2024/NĐ-CP và có hiệu lực từ 15/08/2026. Vì ngày hiện tại
là 31/07/2026, nội dung giao thông đang có trong repository phải được internal
content reviewer đánh giá tác động trước thời điểm đó; code không tự suy ra
mapping hoặc mức phạt mới.

### `government_gazette_rss`

| Field | Giá trị |
|---|---|
| Owner | Cổng Thông tin điện tử Chính phủ |
| Base URL | `https://congbao.chinhphu.vn/rss` |
| Export | `https://congbao.chinhphu.vn/cac_van_ban_moi_ban_hanh.rss` |
| Format | RSS/XML, link PDF |
| Auth | Không |
| Quota | Không công bố |
| Cadence | Theo văn bản mới đăng; chưa có SLA |
| Fields | title, link, summary, published timestamp |
| Availability | Public RSS discovery feed |
| Terms/license | Chưa xác minh raw/bulk retention |
| Attribution | “Nguồn: Công báo nước CHXHCN Việt Nam” |
| Trust/readiness | `discovery_only` / `yellow` |
| Decision | `conditional_go` cho discovery; `no-go` làm citation trực tiếp |

[Trang RSS Công báo](https://congbao.chinhphu.vn/rss) mô tả feed văn bản mới.
RSS item chỉ dùng để phát hiện thay đổi; không đủ provision text, effectivity và
review evidence để tham gia RAG.

## Feasibility spike

Sample `vbpl-nd168.sample.json` ghi:

- provider/upstream ID, canonical full-text URL và metadata URL;
- thời điểm lấy mẫu;
- checksum của exact text span và section anchor;
- source metadata;
- một span kỹ thuật từ Điều 53 để kiểm tra mapping.

`mapOfficialSampleToDraft()` kiểm tra provider, HTTPS, exact allowed host và
field bắt buộc, sau đó chỉ tạo shape:

- `legalSource.status = draft`, chưa có `verifiedBy/lastVerifiedAt`;
- `legalProvision.status = draft`, chưa có `reviewedBy/reviewedAt`;
- provenance giữ provider, upstream ID, canonical URL và `fetchedAt`.

Spike không ghi D1, không tải raw file, không publish và không thêm sample vào
retrieval. Test bắt buộc sample ngoài allowlist bị từ chối.

## Go/no-go và xử lý thay thế/xóa

Quyết định hiện tại:

- **Go** cho registry và mapping spike local.
- **Conditional go** cho manual discovery/metadata comparison.
- **No-go** cho production connector, batch ingestion, raw retention hoặc dùng
  làm citation cho tới khi có terms/license, quota/SLA, reviewer approval và
  hạ tầng US-024.

Khi upstream thay đổi hoặc yêu cầu xóa:

1. dừng index/citation activation và quarantine candidate liên quan;
2. đánh dấu stale/invalidate graph phụ thuộc, không tự thay bằng model output;
3. giữ provenance/checksum và audit tối thiểu theo policy;
4. cleanup raw snapshot chỉ sau khi kiểm tra reference, legal hold và terms;
5. version mới phải đi lại quy trình editor → reviewer.

## Verification

```text
node --experimental-strip-types --test tests/source-registry.test.mjs
```

Expected: 8 tests pass, gồm contract/no-secret, green promotion gate, draft-only
mapping, exact checksum binding và URL/host allowlist rejection.
