# Runbook — Observability và log an toàn

Runbook này áp dụng cho slice local của US-020 và event contract
`telemetry-v1`. Nó không phải bằng chứng rằng Workers Logs, retention, access
hoặc alert đã được bật trên production. Mọi bước production bên dưới chỉ được
thực hiện sau khi xác minh đúng Sites project/environment.

## 1. Contract và ranh giới tin cậy

Outer Worker tạo UUID v4 mới cho từng request, ghi đè `X-Request-ID` do client
gửi, truyền UUID này vào application route và trả lại trên response. Route chỉ
tạo UUID fallback khi được gọi trực tiếp trong test/local. Rate limiter chỉ
chấp nhận UUID v4 từ header nội bộ `x-request-id`; nó không dùng `CF-Ray` làm
application correlation ID.

Ba event hiện có:

| Event | Owner phát event | Mục đích |
|---|---|---|
| `http.response_ready` | Outer Worker | Volume, status và handler-to-response-headers latency |
| `chat.completed` | Chat route | Mode, retrieval no-match và trạng thái chat |
| `auth.login` | Login route | Login success/failure, rate limit và dependency |

`http.response_ready.durationMs` bắt đầu khi outer handler nhận request và kết
thúc khi application trả `Response` với headers sẵn sàng. Đây là
handler-to-headers/TTFB proxy, không bao gồm thời gian consume streaming body,
truyền mạng hoặc client render; không dùng metric này như request
completion/end-to-end latency.

Field chung bắt buộc là `schemaVersion`, `timestamp`, `event`, `requestId`,
`route`, `method`, `status`, `outcome`, `durationMs`. Optional field chỉ được
serialize khi nằm trong typed allowlist và qua giới hạn độ dài/số lượng. Không
suy ra `retrievedRecordIds` hoặc `citationIds` từ answer text; hai field này chỉ
được phát khi retriever trả metadata có cấu trúc.

Không được ghi raw URL/query, request/response body, question/message/evidence,
legal text, header/cookie, password/hash, session/API key, raw IP,
username/email, rate-limit key/hash, provider payload/refusal, exception message
hoặc stack. Error chỉ map sang stable outcome/provider outcome.

Rate limiter runtime không ghi một event/console log riêng. Chat/login route sở
hữu semantic event và map deny/dependency thành stable outcome. Callback
rate-limit chỉ được inject trong test/diagnostic cô lập, không phải production
sink thứ hai.

Telemetry sink có contract synchronous-only. Serializer bắt synchronous throw
để không đổi HTTP response; contract không hứa hẹn delivery, retry hoặc xử lý
bất đồng bộ.

## 2. Policy production cần phê duyệt

Policy đề xuất cho MVP:

- Workers Logs, sampling 100% khi lưu lượng còn thấp;
- retention 3 ngày;
- quyền đọc log theo least privilege cho on-call vận hành và security reviewer;
- không Logpush/export và không lưu telemetry vào D1 nếu chưa có approval riêng;
- editorial audit của US-014 không phụ thuộc sampling hoặc retention telemetry.

Trước activation, owner vận hành phải chụp/ghi evidence từ control plane rằng:

1. project và environment đúng với artifact dự kiến;
2. Workers Logs đang bật, sampling đúng policy và client không override được;
3. retention là 3 ngày và danh sách principal có quyền đọc đã được review;
4. không có Logpush/export/D1 sink ngoài phạm vi;
5. UTC được dùng làm timezone chuẩn khi điều tra và báo cáo.

Sampling dưới 100% làm count/ratio/percentile chỉ là ước lượng theo sample; mọi
dashboard và báo cáo phải ghi sampling version/rate. Security audit và
editorial audit không được suy luận đầy đủ từ head-sampled log.

## 3. Query recipes

Thực hiện trong Workers Logs Query Builder trên đúng environment. Luôn chọn
time range tuyệt đối theo UTC, ghi sampling rate/version cùng kết quả và không
search bằng question, username, IP hoặc credential.

| Mục tiêu | Filter/group/aggregate | Owner và caveat |
|---|---|---|
| Volume/status | `event = http.response_ready`; group `route,status`; count theo bucket 5 phút | On-call; UTC, ghi sampling rate |
| P50/P95 response-ready latency | `event = http.response_ready`; group `route`; percentile 50/95 của `durationMs` | On-call; TTFB proxy, không phải stream/end-to-end; percentile của sample nếu sampling <100% |
| Mode/unavailable | `event = chat.completed`; group `mode,outcome`; count và tỷ lệ trên tổng chat | PM + on-call; `mode=unavailable` gồm nhiều nguyên nhân |
| Retrieval no-match | `event = chat.completed AND outcome = retrieval_no_match`; group `route` | PM; chỉ là exact no-match của retriever hiện hành |
| Provider stable error | `event = chat.completed AND providerOutcome IN (timeout,error,refusal,invalid_output)`; group `providerOutcome,providerModel` | AI owner; hiện chưa có producer cho tới khi evidence-bound provider được nối |
| Evidence/provider correlation | `event = chat.completed AND requestId = <UUID>`; inspect `retrievedRecordIds,citationIds,providerOutcome,providerLatencyMs,providerInputTokens,providerOutputTokens` | PM + AI owner; chỉ chạy sau US-025/US-026 integration và phải đối chiếu IDs với canonical response/evidence trong D1 |
| Login failure | `event = auth.login AND outcome IN (invalid_credentials,forbidden)`; group `outcome` | Security on-call; không cố suy ra account/IP |
| Abuse/dependency | `status IN (429,503)`; group `route,outcome,policyVersion` | On-call; 429 không chứng minh user độc nhất |
| Correlation | `requestId = <UUID từ response>`; sort `timestamp` tăng dần | On-call; kỳ vọng một HTTP event và tối đa một event route tương ứng |

Alert threshold ban đầu chỉ là proposal, chưa được bật ngầm:

- `dependency_error` hoặc HTTP 503 liên tục 5 phút;
- P95 `http.response_ready.durationMs` vượt target đã duyệt trong 10 phút
  (handler-to-headers/TTFB proxy, không phải stream completion);
- tỷ lệ `retrieval_no_match` tăng gấp đôi baseline đã duyệt;
- login `rate_limited` tăng bất thường so với baseline.

PM + on-call phải chốt baseline, threshold, notification channel và người nhận
trước khi tạo alert. Không alert dựa trên raw identity hoặc nội dung câu hỏi.

## 4. Smoke test trước production cutover

1. Gửi một request chat synthetic không chứa dữ liệu thật, có canary dạng
   `OBS-CANARY-email@example.test-203.0.113.99`.
2. Xác nhận response có `X-Request-ID` là UUID v4 và khác mọi
   `X-Request-ID` client cố gửi.
3. Query theo exact UUID; xác nhận `http.response_ready` và `chat.completed` dùng
   cùng ID, route/status/outcome đúng.
4. Xác nhận canary, query string, body, header, cookie và IP không xuất hiện
   trong serialized log.
5. Chạy login bằng một synthetic credential chắc chắn sai; xác nhận response
   401, `auth.login.outcome = invalid_credentials`, và credential/username
   không xuất hiện trong log.
6. Dùng môi trường smoke cô lập để tạo 429/503; xác nhận status, stable outcome,
   `Retry-After` và correlation ID. Không gây brute force trên account thật.
7. Sau khi US-025/US-026 được tích hợp, dùng response synthetic có evidence để
   xác nhận `retrievedRecordIds`/`citationIds` khớp canonical response và D1,
   provider fields đến từ đúng owner, cùng `requestId` và không có duplicate
   provider event.
8. Xác nhận query recipes ở mục 3 trả đúng field; ghi UTC range, sampling,
   operator và evidence link vào release record.

Nếu canary hoặc secret-like value xuất hiện, dừng cutover, hạn chế quyền đọc,
không export thêm log, ghi nhận time range bị ảnh hưởng và sửa serializer/sink
trước khi thử lại. Không dán payload rò rỉ vào issue hoặc chat.

## 5. Rollback và incident

- Synchronous telemetry sink/serialization failure không được thay đổi HTTP
  response. Async delivery/retry nằm ngoài contract hiện tại.
- Nếu logging gây regression, rollback application artifact về version đã xác
  minh; không nới allowlist và không fallback log raw object/error.
- Nếu correlation mất nhưng HTTP vẫn hoạt động, ghi nhận đây là observability
  degradation; kiểm tra outer Worker trước route instrumentation.
- Nếu nghi lộ secret/PII, xử lý như security incident: hạn chế access, xác định
  UTC window, rotate credential liên quan và dùng metadata an toàn để điều tra.
- Sau rollback, lặp lại no-secret canary và correlation smoke trước cutover mới.
