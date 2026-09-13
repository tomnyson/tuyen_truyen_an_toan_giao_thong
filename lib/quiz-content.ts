// Ngân hàng câu hỏi seed cho quiz (US-035).
//
// Mỗi câu hỏi trỏ về một entry trong kho nội dung đã duyệt (`lib/legal-content`)
// và LẤY căn cứ từ đó qua `reviewedLegalBasisOf` — không có câu căn cứ nào được
// viết tay ở file này. Chủ đề chưa có citation bốn mắt sẽ hiển thị đúng trạng
// thái "Đang kiểm chứng căn cứ hiện hành" thay vì một dẫn chứng bịa ra.
import { boundedPoints, type QuizQuestion } from "./gamification";
import {
  laws,
  reviewedLegalBasisOf,
  reviewedPenaltyOf,
  type LawItem,
} from "./legal-content";
import { contentTopicNames, type ContentTopic } from "./topics";

export const minQuestionsPerTopic = 3;
export const maxQuestionsPerTopic = 5;

type QuizSeed = Readonly<{
  id: number;
  topic: ContentTopic;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  explanation: string;
  // Entry kho nội dung dùng làm căn cứ; bỏ trống khi lĩnh vực chưa có entry nào
  // được duyệt, khi đó câu hỏi vẫn chạy nhưng căn cứ ghi rõ là đang kiểm chứng.
  lawId?: number;
  points?: number;
}>;

const seeds: readonly QuizSeed[] = Object.freeze([
  // Giao thông
  {
    id: 1,
    topic: "Giao thông",
    prompt:
      "Bạn đi xe máy điện tới trường, có mang mũ bảo hiểm nhưng để trong cốp. Điều đó có được coi là chấp hành quy định không?",
    options: [
      "Có, vì đã mang mũ theo xe",
      "Không, phải đội mũ và cài quai đúng quy cách",
      "Chỉ cần đội khi đi qua chốt kiểm tra",
    ],
    correctIndex: 1,
    explanation:
      "Mũ bảo hiểm chỉ bảo vệ được khi đội và cài quai đúng cách. Mang mũ theo xe nhưng không đội vẫn bị coi là vi phạm.",
    lawId: 1,
    points: 10,
  },
  {
    id: 2,
    topic: "Giao thông",
    prompt:
      "Bạn 15 tuổi, mượn xe 110 cm³ của anh trai để đi học thêm. Ai có thể phát sinh trách nhiệm?",
    options: [
      "Chỉ người điều khiển xe",
      "Chỉ người cho mượn xe",
      "Cả người điều khiển và người giao xe",
      "Không ai, vì đi quãng đường ngắn",
    ],
    correctIndex: 2,
    explanation:
      "Người chưa đủ tuổi không được điều khiển xe từ 50 cm³ trở lên; người giao xe cho người chưa đủ điều kiện cũng có thể phải chịu trách nhiệm.",
    lawId: 2,
    points: 10,
  },
  {
    id: 3,
    topic: "Giao thông",
    prompt:
      "Đi xe đạp điện, bạn nên làm gì trước khi rẽ ở ngã tư đông người?",
    options: [
      "Bấm còi liên tục rồi rẽ nhanh cho thoáng",
      "Giảm tốc, quan sát và ra tín hiệu xin đường trước khi rẽ",
      "Bám sát xe phía trước để rẽ cùng lúc",
    ],
    correctIndex: 1,
    explanation:
      "Giảm tốc, quan sát và ra tín hiệu là thao tác bắt buộc để người đi đường khác đoán được hướng đi của bạn, giảm nguy cơ va chạm.",
    lawId: 1,
    points: 10,
  },
  {
    id: 4,
    topic: "Giao thông",
    prompt:
      "Nhóm bạn rủ chở ba trên một xe máy điện cho vui. Bạn nên phản hồi thế nào?",
    options: [
      "Đồng ý vì chỉ đi trong khu vực gần trường",
      "Từ chối, chở quá số người quy định là vi phạm và rất dễ mất lái",
      "Đồng ý nếu người ngồi giữa không đội mũ cho gọn",
    ],
    correctIndex: 1,
    explanation:
      "Chở quá số người quy định làm xe mất cân bằng, quãng đường phanh dài hơn và là hành vi vi phạm quy định về trật tự, an toàn giao thông.",
    lawId: 1,
    points: 10,
  },

  // Mạng xã hội
  {
    id: 5,
    topic: "Mạng xã hội",
    prompt:
      "Bạn thấy một bài tố cáo giáo viên gian lận điểm nhưng không kèm bằng chứng. Cách xử lý đúng là gì?",
    options: [
      "Chia sẻ ngay để mọi người cùng biết",
      "Không chia sẻ, kiểm chứng và phản ánh qua kênh chính thức của trường",
      "Bình luận thêm suy đoán của mình cho rõ chuyện",
    ],
    correctIndex: 1,
    explanation:
      "Đăng hoặc lan truyền thông tin sai sự thật, xúc phạm người khác có thể bị yêu cầu gỡ bỏ và xử lý; phản ánh qua kênh chính thức vừa an toàn vừa hiệu quả hơn.",
    lawId: 3,
    points: 10,
  },
  {
    id: 6,
    topic: "Mạng xã hội",
    prompt:
      "Một ảnh riêng tư của bạn cùng lớp bị gửi vào nhóm chat. Bạn nên làm gì?",
    options: [
      "Chuyển tiếp cho vài người thân để cảnh báo",
      "Không phát tán, báo giáo viên và đề nghị nhóm gỡ ảnh",
      "Lưu lại phòng khi cần dùng sau này",
    ],
    correctIndex: 1,
    explanation:
      "Người tiếp tục phát tán hình ảnh riêng tư vẫn có thể phải chịu trách nhiệm dù không phải người chụp; việc cần làm là dừng lan truyền và báo người có trách nhiệm.",
    lawId: 4,
    points: 10,
  },
  {
    id: 7,
    topic: "Mạng xã hội",
    prompt:
      "Một tài khoản lạ nhắn tin nói bạn trúng thưởng, chỉ cần chuyển trước phí vận chuyển. Đây là dấu hiệu gì?",
    options: [
      "Chương trình khuyến mãi bình thường",
      "Dấu hiệu lừa đảo: yêu cầu chuyển tiền trước để nhận thưởng",
      "Chỉ cần chuyển số tiền nhỏ để thử là an toàn",
    ],
    correctIndex: 1,
    explanation:
      "Yêu cầu chuyển tiền trước để nhận thưởng là dấu hiệu lừa đảo điển hình. Hãy dừng lại, không chuyển khoản và báo cho phụ huynh hoặc thầy cô.",
    lawId: 3,
    points: 10,
  },
  {
    id: 8,
    topic: "Mạng xã hội",
    prompt:
      "Ảnh của bạn bị ghép để chế giễu trên mạng. Bước đầu tiên nên làm là gì?",
    options: [
      "Đăng bài đáp trả cho hả giận",
      "Lưu bằng chứng (ảnh chụp màn hình, đường dẫn) rồi báo người lớn và yêu cầu gỡ",
      "Im lặng bỏ qua vì rồi cũng chìm",
    ],
    correctIndex: 1,
    explanation:
      "Bằng chứng là cơ sở để nhà trường hoặc nền tảng xử lý và yêu cầu gỡ nội dung; đáp trả công khai thường làm sự việc lan rộng hơn.",
    lawId: 4,
    points: 10,
  },

  // Bạo lực học đường
  {
    id: 9,
    topic: "Bạo lực học đường",
    prompt:
      "Bạn chứng kiến hai bạn đánh nhau ở sân trường. Việc KHÔNG nên làm là gì?",
    options: [
      "Quay clip rồi đăng lên mạng",
      "Báo ngay giáo viên hoặc bảo vệ",
      "Rời khỏi đám đông và gọi người lớn tới",
    ],
    correctIndex: 0,
    explanation:
      "Quay clip để đăng lại khiến người bị hại tổn thương thêm và có thể làm sự việc leo thang. Việc cần làm là tách khỏi nơi xô xát và báo người có trách nhiệm.",
    lawId: 5,
    points: 10,
  },
  {
    id: 10,
    topic: "Bạo lực học đường",
    prompt:
      "Bạn liên tục nhận tin nhắn đe dọa từ một nhóm bạn cùng khối. Nên làm gì trước tiên?",
    options: [
      "Xóa hết tin nhắn cho đỡ sợ",
      "Lưu lại tin nhắn làm bằng chứng và báo giáo viên chủ nhiệm hoặc phụ huynh",
      "Nhắn lại đe dọa để đối phương chùn bước",
    ],
    correctIndex: 1,
    explanation:
      "Im lặng hoặc xóa bằng chứng khiến sự việc kéo dài và nhà trường không có cơ sở xử lý. Ảnh chụp tin nhắn chính là căn cứ để người lớn can thiệp.",
    lawId: 5,
    points: 10,
  },
  {
    id: 11,
    topic: "Bạo lực học đường",
    prompt:
      "Tổng đài quốc gia bảo vệ trẻ em có số điện thoại là bao nhiêu?",
    options: ["113", "111", "115"],
    correctIndex: 1,
    explanation:
      "Tổng đài 111 là tổng đài quốc gia bảo vệ trẻ em, hoạt động miễn phí 24/7 để tiếp nhận thông tin về trẻ em bị bạo lực, xâm hại.",
    lawId: 5,
    points: 10,
  },

  // An ninh trật tự
  {
    id: 12,
    topic: "An ninh trật tự",
    prompt:
      "Bạn được rủ đi cổ vũ đua xe ban đêm. Đâu là cách xử lý an toàn nhất?",
    options: [
      "Đi cùng nhưng chỉ đứng xem từ xa",
      "Từ chối, rời khỏi nhóm và báo cho phụ huynh hoặc nhà trường",
      "Đi cùng để quay clip đăng lên mạng",
    ],
    correctIndex: 1,
    explanation:
      "Cả người tham gia lẫn người cổ vũ, giúp sức đều có thể phát sinh trách nhiệm tùy hành vi và tình tiết. Rời khỏi nhóm và báo người lớn là hướng an toàn nhất.",
    lawId: 6,
    points: 10,
  },
  {
    id: 13,
    topic: "An ninh trật tự",
    prompt:
      "Một người bạn nhờ bạn giữ hộ balo có dao trong đó. Bạn nên làm gì?",
    options: [
      "Giữ hộ vì đó là đồ của bạn mình",
      "Từ chối giữ hộ và báo cho giáo viên hoặc phụ huynh",
      "Giữ hộ nhưng để ở tủ đồ cho an toàn",
    ],
    correctIndex: 1,
    explanation:
      "Giữ hoặc mang hộ hung khí có thể khiến bạn liên đới trách nhiệm. Từ chối và báo người lớn giúp ngăn nguy cơ trước khi xảy ra sự việc.",
    lawId: 6,
    points: 10,
  },
  {
    id: 14,
    topic: "An ninh trật tự",
    prompt:
      "Khi thấy nguy cơ mất an toàn cần báo công an khẩn cấp, bạn gọi số nào?",
    options: ["111", "113", "114"],
    correctIndex: 1,
    explanation:
      "113 là số gọi khẩn cấp của lực lượng công an. 114 là cứu hỏa, cứu nạn; 111 là tổng đài bảo vệ trẻ em.",
    lawId: 6,
    points: 10,
  },

  // Sở hữu trí tuệ
  {
    id: 15,
    topic: "Sở hữu trí tuệ",
    prompt:
      "Bạn chép nguyên một bài viết trên mạng để nộp làm bài tập. Cách làm đúng là gì?",
    options: [
      "Nộp nguyên bài vì tài liệu trên mạng là của chung",
      "Tự viết bằng lời của mình và ghi rõ nguồn tham khảo",
      "Đổi vài từ trong bài cho khác đi rồi nộp",
    ],
    correctIndex: 1,
    explanation:
      "Chép nguyên tác phẩm của người khác và nhận là của mình là đạo văn. Tham khảo thì phải diễn đạt lại và ghi rõ nguồn.",
    points: 10,
  },
  {
    id: 16,
    topic: "Sở hữu trí tuệ",
    prompt:
      "Lớp bạn làm video kỷ yếu và muốn dùng một bài hát đang thịnh hành. Nên làm gì?",
    options: [
      "Dùng thoải mái vì video không bán vé",
      "Xin phép chủ sở hữu hoặc chọn nhạc có giấy phép sử dụng miễn phí",
      "Dùng nhưng ghi tên ca sĩ trong phần mô tả là đủ",
    ],
    correctIndex: 1,
    explanation:
      "Ghi tên tác giả không thay thế cho việc xin phép. Cách an toàn là dùng nhạc có giấy phép cho phép sử dụng hoặc xin phép chủ sở hữu.",
    points: 10,
  },
  {
    id: 17,
    topic: "Sở hữu trí tuệ",
    prompt:
      "Bạn tìm thấy bản bẻ khóa của một phần mềm học tập có phí. Rủi ro lớn nhất là gì?",
    options: [
      "Không có rủi ro gì, chỉ là tiết kiệm tiền",
      "Vừa xâm phạm quyền của tác giả vừa có nguy cơ nhiễm mã độc, mất tài khoản",
      "Chỉ chạy chậm hơn bản có phí",
    ],
    correctIndex: 1,
    explanation:
      "Bản bẻ khóa xâm phạm quyền của chủ sở hữu và thường bị cài kèm mã độc đánh cắp tài khoản. Nhiều phần mềm học tập có bản miễn phí cho học sinh, sinh viên.",
    points: 10,
  },
  // Chuyên đề phòng chống ma túy
  {
    id: 18,
    topic: "Chuyên đề phòng chống ma túy",
    prompt:
      "Một người quen rủ bạn thử viên ngậm màu sắc sặc sỡ và bảo đây là 'kẹo vui' giúp tỉnh táo học bài. Bạn nên xử lý thế nào?",
    options: [
      "Dùng thử một lần vì nghĩ chỉ là kẹo ngậm thông thường",
      "Từ chối dứt khoát và báo ngay cho thầy cô, cha mẹ hoặc người có trách nhiệm",
      "Cầm lấy đem về phòng chia cho các bạn cùng thử",
    ],
    correctIndex: 1,
    explanation:
      "Nhiều loại ma túy tổng hợp mới được ngụy trang tinh vi dưới dạng bánh kẹo, đồ uống. Tuyệt đối không thử và cần báo người lớn khi bị rủ rê.",
    points: 10,
  },
  {
    id: 19,
    topic: "Chuyên đề phòng chống ma túy",
    prompt:
      "Hành vi sử dụng bóng cười chứa khí N2O để giải trí trong giới trẻ bị pháp luật xử lý như thế nào?",
    options: [
      "Khí N2O thuộc danh mục hóa chất hạn chế sản xuất kinh doanh; hành vi sử dụng sai mục đích làm bóng cười giải trí là vi phạm và bị xử phạt",
      "Được sử dụng tự do ở bất kỳ nơi nào vì không phải chất cấm",
      "Chỉ bị nhắc nhở khi hít ở trường học, ngoài quán xá thì được phép",
    ],
    correctIndex: 0,
    explanation:
      "Khí dinitơ monoxit (N2O) là hóa chất hạn chế sản xuất, kinh doanh trong lĩnh vực công nghiệp và y tế; hành vi chiết rót, sử dụng vào mục đích vui chơi giải trí là vi phạm quy định pháp luật.",
    points: 10,
  },
  {
    id: 20,
    topic: "Chuyên đề phòng chống ma túy",
    prompt:
      "Nếu vô tình phát hiện bạn bè hoặc người khác có hành vi tàng trữ chất ma túy, học sinh nên làm gì để bảo vệ bản thân?",
    options: [
      "Giấu kín giúp bạn vì sợ bạn bị kỷ luật",
      "Tìm cách tống tiền người tàng trữ để kiếm lợi ích",
      "Giữ khoảng cách an toàn và bí mật trình báo với nhà trường hoặc cơ quan công an nơi gần nhất",
    ],
    correctIndex: 2,
    explanation:
      "Bao che hành vi tàng trữ chất ma túy có thể dẫn tới trách nhiệm pháp lý liên đới. Việc báo cáo kịp thời giúp ngăn chặn tội phạm và bảo vệ an toàn cho bản thân, học đường.",
    points: 10,
  },
  // Chuyên đề an ninh trật tự trường học
  {
    id: 21,
    topic: "Chuyên đề an ninh trật tự trường học",
    prompt:
      "Thấy người lạ mặt trèo tường hoặc lẻn vào khu vực lớp học khi không có bảo vệ, hành động đúng đắn nhất là gì?",
    options: [
      "Tự mình lao vào bắt giữ người lạ ngay lập tức",
      "Báo ngay cho nhân viên bảo vệ, giám thị hoặc giáo viên gần nhất",
      "Không quan tâm vì không liên quan đến đồ đạc của mình",
    ],
    correctIndex: 1,
    explanation:
      "Bảo đảm an toàn bản thân là ưu tiên hàng đầu. Khi phát hiện kẻ lạ xâm nhập trường học, học sinh cần báo ngay cho lực lượng bảo vệ và nhà trường để kịp thời xử lý.",
    points: 10,
  },
  {
    id: 22,
    topic: "Chuyên đề an ninh trật tự trường học",
    prompt:
      "Học sinh cố ý làm hư hỏng bàn ghế, thiết bị máy chiếu trong phòng học của trường thì phát sinh trách nhiệm gì?",
    options: [
      "Không chịu trách nhiệm vì tài sản là của chung nhà trường",
      "Chỉ cần xin lỗi giáo viên chủ nhiệm là xong",
      "Bị xử lý kỷ luật học sinh và người vi phạm (hoặc phụ huynh) phải bồi thường thiệt hại tài sản đã gây ra",
    ],
    correctIndex: 2,
    explanation:
      "Hành vi phá hoại tài sản trường học ngoài việc bị xử lý kỷ luật theo nội quy còn phải chịu trách nhiệm dân sự bồi thường thiệt hại theo quy định pháp luật.",
    points: 10,
  },
  {
    id: 23,
    topic: "Chuyên đề an ninh trật tự trường học",
    prompt:
      "Để bảo đảm an toàn khuôn viên trường học, điều nào sau đây là đúng quy định?",
    options: [
      "Học sinh phải chấp hành nội quy, đeo thẻ học sinh và không được dẫn người lạ vào trường khi chưa được phép",
      "Học sinh có quyền dẫn bạn bè ngoài trường vào lớp chơi tự do bất kỳ lúc nào",
      "Bảo vệ không có quyền kiểm tra người ra vào cổng trường",
    ],
    correctIndex: 0,
    explanation:
      "Nội quy trường học nhằm bảo đảm môi trường giáo dục an toàn, lành mạnh; việc quản lý người ra vào khuôn viên trường là biện pháp phòng ngừa rủi ro an ninh.",
    points: 10,
  },
  // Chuyên đề game và không gian mạng
  {
    id: 24,
    topic: "Chuyên đề game và không gian mạng",
    prompt:
      "Theo quy định pháp luật về quản lý trò chơi điện tử trực tuyến, tổng thời gian chơi của người dưới 18 tuổi đối với các trò chơi của một doanh nghiệp là bao nhiêu?",
    options: [
      "Không quá 180 phút mỗi ngày",
      "Không quá 60 phút mỗi ngày",
      "Chơi không giới hạn thời gian",
    ],
    correctIndex: 0,
    explanation:
      "Nghị định quy định về quản lý dịch vụ Internet và thông tin trên mạng quy định tổng thời gian chơi trò chơi điện tử G1 của người dưới 18 tuổi không quá 180 phút trong 24 giờ mỗi ngày để tránh ảnh hưởng học tập và sức khỏe.",
    points: 10,
  },
  {
    id: 25,
    topic: "Chuyên đề game và không gian mạng",
    prompt:
      "Tham gia các trò chơi điện tử có tính chất đổi điểm lấy tiền thật, thẻ cào hoặc hiện vật có giá trị có bị coi là đánh bạc không?",
    options: [
      "Không, vì chơi qua mạng chỉ là trò chơi giải trí ảo",
      "Có, hành vi dùng tiền ảo trong game đổi ra tiền thật hoặc hiện vật có thể bị xem là hành vi đánh bạc trái phép",
      "Chỉ là đánh bạc nếu chơi ở tiệm nét, chơi trên điện thoại cá nhân thì không vi phạm",
    ],
    correctIndex: 1,
    explanation:
      "Game bài đổi thưởng hoặc quy đổi vật phẩm ảo sang tiền thật/thẻ cào có dấu hiệu của tội đánh bạc hoặc tổ chức đánh bạc trái phép trên không gian mạng.",
    points: 10,
  },
  {
    id: 26,
    topic: "Chuyên đề game và không gian mạng",
    prompt:
      "Người lạ trên mạng nhắn tin tặng 'code quà tặng xịn' và yêu cầu bạn nhập tài khoản, mật khẩu kèm mã OTP để nhận quà. Bạn nên làm gì?",
    options: [
      "Lập tức cung cấp tài khoản và OTP để nhận quà miễn phí",
      "Cảnh giác đây là chiêu trò lừa đảo (phishing), tuyệt đối không cung cấp mật khẩu và mã OTP cho bất kỳ ai",
      "Nhờ bạn cùng lớp nhập thử tài khoản của bạn ấy trước",
    ],
    correctIndex: 1,
    explanation:
      "Mã OTP và mật khẩu là thông tin bảo mật tối mật. Cung cấp OTP cho đối tượng lạ sẽ dẫn tới mất quyền kiểm soát tài khoản hoặc mất tiền.",
    points: 10,
  },
  // Tài chính - tín dụng đen
  {
    id: 27,
    topic: "Tài chính - tín dụng đen",
    prompt:
      "Người lạ đề nghị trả 500.000đ để học sinh/sinh viên mở tài khoản ngân hàng rồi giao lại thẻ và thông tin đăng nhập cho họ. Việc này có vi phạm không?",
    options: [
      "Không vi phạm vì tài khoản đứng tên mình thì mình có quyền cho mượn",
      "Hành vi mở hộ, cho mượn hoặc bán tài khoản ngân hàng là vi phạm pháp luật và có thể bị phạt tiền hoặc truy cứu trách nhiệm hình sự",
      "Chỉ vi phạm nếu tài khoản đó có số dư lớn hơn 100 triệu",
    ],
    correctIndex: 1,
    explanation:
      "Nghị định xử phạt vi phạm hành chính trong lĩnh vực tiền tệ và ngân hàng nghiêm cấm hành vi thuê, cho thuê, mượn, cho mượn, mua bán tài khoản thanh toán; các tài khoản này thường bị tội phạm dùng để rửa tiền hoặc lừa đảo.",
    points: 10,
  },
  {
    id: 28,
    topic: "Tài chính - tín dụng đen",
    prompt:
      "Dấu hiệu nhận biết các ứng dụng (app) vay tiền tín dụng đen là gì?",
    options: [
      "Thủ tục mập mờ, giải ngân nhanh nhưng trừ phí dịch vụ rất cao, lãi suất thực tế hàng trăm phần trăm một năm và đòi quyền truy cập danh bạ điện thoại",
      "Hợp đồng công khai, lãi suất đúng quy định Ngân hàng Nhà nước và không đòi quyền truy cập danh bạ",
      "Chỉ cho người có chứng minh thu nhập cao vay tiền",
    ],
    correctIndex: 0,
    explanation:
      "App tín dụng đen thường gài bẫy lãi suất cắt cổ, phí dịch vụ vô lý và ép cấp quyền truy cập danh bạ để đe dọa, khủng bố tinh thần người vay và người thân khi chậm trả.",
    points: 10,
  },
  {
    id: 29,
    topic: "Tài chính - tín dụng đen",
    prompt:
      "Khi bị các đối tượng đòi nợ thuê gọi điện đe dọa, ghép ảnh vu khống xúc phạm danh dự, người bị hại nên xử lý như thế nào?",
    options: [
      "Lập tức vay app khác với lãi cao hơn để trả nợ cho yên chuyện",
      "Lưu lại chứng cứ (tin nhắn, ghi âm, hình ảnh vu khống) và gửi đơn tố giác đến cơ quan Công an có thẩm quyền",
      "Đăng bài chửi bới thách thức lại các đối tượng đòi nợ trên mạng",
    ],
    correctIndex: 1,
    explanation:
      "Người dân cần bình tĩnh ghi lại các bằng chứng quấy rối, khủng bố và làm đơn tố giác đến cơ quan Công an để được bảo vệ quyền lợi hợp pháp, tránh sa vào vòng xoáy nợ nần.",
    points: 10,
  },
  // Phòng chống tệ nạn xã hội
  {
    id: 30,
    topic: "Phòng chống tệ nạn xã hội",
    prompt:
      "Học sinh rủ nhau chơi bài ăn tiền trong lớp học (kể cả số tiền vài nghìn đồng mỗi ván) có bị xem là đánh bạc trái phép không?",
    options: [
      "Không, tiền lẻ vài nghìn chỉ là vui chơi giải trí",
      "Có, mọi hành vi được thua bằng tiền hoặc hiện vật mà không được cơ quan có thẩm quyền cho phép đều là đánh bạc trái phép và vi phạm nội quy, pháp luật",
      "Chỉ bị tính là đánh bạc nếu chơi từ 5 triệu đồng trở lên",
    ],
    correctIndex: 1,
    explanation:
      "Hành vi đánh bạc trái phép dù giá trị nhỏ vẫn bị xử phạt hành chính và kỷ luật nghiêm khắc trong nhà trường; nếu từ 5 triệu đồng trở lên hoặc đã bị xử phạt thì có thể bị truy cứu trách nhiệm hình sự.",
    points: 10,
  },
  {
    id: 31,
    topic: "Phòng chống tệ nạn xã hội",
    prompt:
      "Hành vi tham gia cá độ bóng đá trực tuyến qua các trang web nước ngoài bị xử lý như thế nào?",
    options: [
      "Là hành vi đánh bạc trái phép, tùy mức độ tiền cá cược có thể bị phạt hành chính hoặc bị phạt tù theo Bộ luật Hình sự",
      "Không bị xử lý vì máy chủ trang web đặt ở nước ngoài",
      "Chỉ người tổ chức mới phạm luật, người đặt cược không bị phạt",
    ],
    correctIndex: 0,
    explanation:
      "Cá độ bóng đá dưới mọi hình thức (kể cả qua mạng Internet) đều là hành vi đánh bạc trái phép, bị xử lý nghiêm minh theo quy định pháp luật.",
    points: 10,
  },
  {
    id: 32,
    topic: "Phòng chống tệ nạn xã hội",
    prompt:
      "Các tệ nạn xã hội như cờ bạc, ma túy, mại dâm, mê tín dị đoan để lại hậu quả gì lớn nhất cho lứa tuổi thanh thiếu niên?",
    options: [
      "Chỉ tốn kém một ít thời gian rảnh rỗi",
      "Làm suy đồi nhân cách, sa sút học tập, hủy hoại sức khỏe, vi phạm pháp luật và gánh nặng cho gia đình, xã hội",
      "Giúp học sinh có nhiều trải nghiệm sống hơn",
    ],
    correctIndex: 1,
    explanation:
      "Tệ nạn xã hội hủy hoại tương lai của thanh thiếu niên, kéo theo nhiều hệ lụy nghiêm trọng về sức khỏe, kinh tế và pháp lý.",
    points: 10,
  },
]);

const lawById = new Map<number, LawItem>(laws.map((law) => [law.id, law]));

function buildQuestion(seed: QuizSeed): QuizQuestion {
  const law = seed.lawId ? lawById.get(seed.lawId) : undefined;
  return Object.freeze({
    id: seed.id,
    topic: seed.topic,
    prompt: seed.prompt,
    options: Object.freeze([...seed.options]),
    correctIndex: seed.correctIndex,
    explanation: seed.explanation,
    legalBasis: law
      ? reviewedLegalBasisOf(law)
      : "Đang kiểm chứng căn cứ hiện hành",
    sourceUrl: law?.citation?.officialUrl,
    points: boundedPoints(seed.points ?? 10),
  });
}

export const quizQuestions: readonly QuizQuestion[] = Object.freeze(
  seeds.map(buildQuestion),
);

// Mức xử lý tham khảo của entry gốc, chỉ dùng khi entry đã có căn cứ duyệt.
export function quizReferencePenalty(question: QuizQuestion): string | null {
  const seed = seeds.find((item) => item.id === question.id);
  const law = seed?.lawId ? lawById.get(seed.lawId) : undefined;
  if (!law || !law.citation) return null;
  return reviewedPenaltyOf(law);
}

export function findQuizQuestion(id: number): QuizQuestion | null {
  return quizQuestions.find((question) => question.id === id) ?? null;
}

export function quizQuestionsOfTopic(topic: ContentTopic): QuizQuestion[] {
  return quizQuestions.filter((question) => question.topic === topic);
}

// Kiểm tra ngân hàng câu hỏi (seed lẫn dữ liệu CMS): mỗi lĩnh vực phải có 3–5
// câu, đáp án đúng phải nằm trong danh sách lựa chọn và mọi câu đều phải có
// giải thích kèm căn cứ. Trả về mảng rỗng nghĩa là hợp lệ.
export function validateQuizBank(
  questions: readonly QuizQuestion[],
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<number>();
  for (const question of questions) {
    if (ids.has(question.id)) errors.push(`Câu hỏi trùng id: ${question.id}`);
    ids.add(question.id);
    if (
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    ) {
      errors.push(`Câu ${question.id} có đáp án đúng nằm ngoài danh sách.`);
    }
    if (!question.explanation.trim()) {
      errors.push(`Câu ${question.id} thiếu giải thích.`);
    }
    if (!question.legalBasis.trim()) {
      errors.push(`Câu ${question.id} thiếu căn cứ.`);
    }
  }
  for (const topic of contentTopicNames) {
    const count = questions.filter(
      (question) => question.topic === topic,
    ).length;
    if (count < minQuestionsPerTopic || count > maxQuestionsPerTopic) {
      errors.push(
        `Lĩnh vực ${topic} đang có ${count} câu, cần từ ${minQuestionsPerTopic} đến ${maxQuestionsPerTopic} câu.`,
      );
    }
  }
  return errors;
}
