// Điều khoản sử dụng và quyền riêng tư (liên kết bắt buộc ở chân trang).
// Nội dung viết ở dạng tĩnh, không cần truy vấn dữ liệu.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ScalesIcon } from "@/components/icons";
import { brandDisplayName, brandName, brandTagline } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Điều khoản sử dụng | ${brandName}`,
  description:
    "Phạm vi sử dụng nội dung pháp luật trên trang, giới hạn trách nhiệm và cách chúng tôi xử lý dữ liệu người dùng.",
};

const lastUpdated = "05/09/2026";

export default function TermsPage() {
  return (
    <div className="detail-page">
      <header className="detail-head">
        <Link className="detail-brand" href="/">
          <span className="brand-mark">
            <ScalesIcon />
          </span>
          <span>
            <strong>{brandDisplayName}</strong>
            <small>{brandTagline}</small>
          </span>
        </Link>
        <Link className="detail-back" href="/">
          <ArrowLeftIcon /> Về trang tra cứu
        </Link>
      </header>

      <main>
        <article className="detail-card doc-card">
          <header>
            <span className="section-kicker">Điều khoản</span>
            <h1>Điều khoản sử dụng và quyền riêng tư</h1>
            <p>
              Trang này giúp học sinh, sinh viên tra cứu quy định pháp luật bằng
              ngôn ngữ dễ hiểu. Đọc phần dưới để biết bạn được dùng nội dung tới
              đâu và chúng tôi giữ lại những dữ liệu nào.
            </p>
            <p className="doc-updated">Cập nhật lần gần nhất: {lastUpdated}</p>
          </header>

          <section className="doc-section" id="pham-vi">
            <h2>Phạm vi nội dung</h2>
            <p>
              Nội dung được biên soạn lại từ văn bản quy phạm pháp luật đang có
              hiệu lực, kèm liên kết tới nguồn gốc để bạn tự đối chiếu. Bản tóm
              tắt chỉ nhằm mục đích tuyên truyền và học tập.
            </p>
            <ul>
              <li>
                Mỗi tình huống đều dẫn số hiệu văn bản, điều, khoản, điểm tương
                ứng.
              </li>
              <li>
                Văn bản pháp luật có thể được sửa đổi; khi hai bên khác nhau,
                bản gốc trên cổng thông tin của cơ quan nhà nước là bản đúng.
              </li>
              <li>
                Nội dung không thay thế tư vấn của luật sư hay quyết định của cơ
                quan có thẩm quyền.
              </li>
            </ul>
          </section>

          <section className="doc-section" id="su-dung">
            <h2>Cách sử dụng lại</h2>
            <p>
              Bạn được sao chép, in và trình chiếu nội dung cho hoạt động giáo
              dục phi lợi nhuận trong nhà trường, với điều kiện giữ nguyên phần
              trích dẫn căn cứ pháp lý. Khi dùng cho mục đích thương mại, vui
              lòng liên hệ trước.
            </p>
          </section>

          <section className="doc-section" id="tro-ly">
            <h2>Trợ lý hỏi đáp</h2>
            <p>
              Câu trả lời của trợ lý được dựng từ kho nội dung đã duyệt. Trợ lý
              vẫn có thể hiểu sai câu hỏi, nên hãy mở nguồn chính thống kèm theo
              trước khi dựa vào đó để quyết định việc quan trọng.
            </p>
          </section>

          <section className="doc-section tinted" id="rieng-tu">
            <h2>Quyền riêng tư</h2>
            <p>
              Trang không yêu cầu bạn đăng ký tài khoản và không thu thập họ
              tên, số điện thoại hay địa chỉ.
            </p>
            <ul>
              <li>
                Lượt xem và lượt đánh dấu &quot;nội dung này ý nghĩa&quot; được
                đếm ở dạng tổng số, không gắn với danh tính người đọc.
              </li>
              <li>
                Câu hỏi gửi cho trợ lý được dùng để tạo câu trả lời trong phiên
                đó. Đừng nhập thông tin nhận dạng cá nhân vào ô hỏi đáp.
              </li>
              <li>
                Điểm và huy hiệu của phần thử thách được lưu trên chính thiết bị
                của bạn; xóa dữ liệu trình duyệt là xóa hết.
              </li>
            </ul>
          </section>

          <section className="doc-section" id="lien-he">
            <h2>Báo nội dung sai</h2>
            <p>
              Nếu bạn thấy một mức phạt hoặc căn cứ pháp lý không còn đúng, hãy
              báo lại kèm đường dẫn tình huống. Chúng tôi kiểm tra với nguồn gốc
              và chỉnh trong thời gian sớm nhất. Trong trường hợp khẩn cấp, gọi{" "}
              <a href="tel:113">113</a> hoặc tổng đài bảo vệ trẻ em{" "}
              <a href="tel:111">111</a>.
            </p>
          </section>
        </article>
      </main>

      <footer className="detail-foot">
        <p>{brandTagline}</p>
      </footer>
    </div>
  );
}
