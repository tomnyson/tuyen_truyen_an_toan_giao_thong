// Kịch bản nhập vai seed (US-036).
//
// Kịch bản là dữ liệu thuần: mỗi nút chỉ mô tả tình huống và các lựa chọn, mọi
// nhánh nằm trong mảng `nodes` chứ không nằm trong component. Căn cứ ở nút kết
// cục lấy từ kho nội dung đã duyệt, không viết tay dẫn chứng mới.
import {
  laws,
  reviewedLegalBasisOf,
  type LawItem,
} from "./legal-content";
import type {
  RoleplayChoice,
  RoleplayNode,
  RoleplayOutcomeKind,
  RoleplayScenario,
} from "./roleplay";
import type { ContentTopic } from "./topics";

const lawById = new Map<number, LawItem>(laws.map((law) => [law.id, law]));

function basisOf(lawId?: number): Readonly<{ legalBasis: string; sourceUrl: string }> {
  const law = lawId ? lawById.get(lawId) : undefined;
  return {
    legalBasis: law
      ? reviewedLegalBasisOf(law)
      : "Đang kiểm chứng căn cứ hiện hành",
    sourceUrl: law?.citation?.officialUrl ?? "",
  };
}

function step(
  key: string,
  text: string,
  choices: readonly RoleplayChoice[],
): RoleplayNode {
  return Object.freeze({
    key,
    kind: "step" as const,
    text,
    choices: Object.freeze(choices.map((choice) => Object.freeze({ ...choice }))),
    consequence: "",
    legalBasis: "",
    sourceUrl: "",
    outcomeKind: null,
    points: 1,
  });
}

const outcomePoints: Record<RoleplayOutcomeKind, number> = {
  safe: 15,
  risky: 8,
  harmful: 5,
};

function outcome(
  key: string,
  kind: RoleplayOutcomeKind,
  text: string,
  consequence: string,
  lawId?: number,
): RoleplayNode {
  const basis = basisOf(lawId);
  return Object.freeze({
    key,
    kind: "outcome" as const,
    text,
    choices: Object.freeze([]),
    consequence,
    legalBasis: basis.legalBasis,
    sourceUrl: basis.sourceUrl,
    outcomeKind: kind,
    points: outcomePoints[kind],
  });
}

function scenario(
  id: number,
  topic: ContentTopic,
  title: string,
  intro: string,
  nodes: readonly RoleplayNode[],
): RoleplayScenario {
  return Object.freeze({
    id,
    topic,
    title,
    intro,
    startKey: nodes[0].key,
    nodes: Object.freeze(nodes),
  });
}

export const roleplayScenarios: readonly RoleplayScenario[] = Object.freeze([
  scenario(
    1,
    "An ninh trật tự",
    "22h, nhóm bạn rủ đi xem đua xe",
    "Bạn vừa học bài xong thì điện thoại rung. Nhóm chat lớp đang rủ nhau ra cầu vượt xem đua xe, có bạn nói “chỉ đứng xem thôi, không sao đâu”.",
    [
      step(
        "bat-dau",
        "Tin nhắn hiện lên: “Ra không, 15 phút thôi, vui lắm!”. Bạn trả lời thế nào?",
        [
          { label: "Đi cùng cho vui, chỉ xem một lát", next: "toi-noi" },
          { label: "Từ chối và ở nhà", next: "tu-choi" },
          { label: "Đi nhưng đứng xa quay clip đăng lên mạng", next: "quay-clip" },
        ],
      ),
      step(
        "tu-choi",
        "Bạn nhắn “Mình không đi đâu”. Nhóm tiếp tục thuyết phục: “Sợ à? Có ai làm gì đâu”.",
        [
          {
            label: "Giữ nguyên quyết định và kể lại với phụ huynh",
            next: "ket-cuc-an-toan",
          },
          { label: "Thôi thì ra một lát cho bạn khỏi giận", next: "toi-noi" },
        ],
      ),
      step(
        "toi-noi",
        "Ở cầu vượt, tiếng nẹt pô inh ỏi. Một bạn dúi chìa khóa vào tay bạn: “Chạy thử một vòng đi!”.",
        [
          { label: "Cầm lái chạy thử một vòng", next: "ket-cuc-nang" },
          {
            label: "Trả lại chìa khóa, gọi người nhà tới đón",
            next: "ket-cuc-rui-ro",
          },
        ],
      ),
      step(
        "quay-clip",
        "Bạn đứng cách xa quay clip. Vài phút sau clip được đăng lên nhóm lớp, bình luận rủ nhau ra xem tiếp mỗi lúc một nhiều.",
        [
          {
            label: "Gỡ clip và báo với thầy cô, phụ huynh",
            next: "ket-cuc-rui-ro",
          },
          {
            label: "Để nguyên clip cho nhiều người xem",
            next: "ket-cuc-nang",
          },
        ],
      ),
      outcome(
        "ket-cuc-an-toan",
        "safe",
        "Bạn ở nhà. Sáng hôm sau, cả nhóm bị nhà trường mời làm việc vì có mặt tại điểm tụ tập.",
        "Từ chối tham gia và báo cho người lớn là hướng xử lý an toàn nhất: bạn không có mặt tại nơi tụ tập nên không phát sinh trách nhiệm, đồng thời giúp người lớn can thiệp sớm với nhóm bạn.",
        6,
      ),
      outcome(
        "ket-cuc-rui-ro",
        "risky",
        "Bạn trả lại chìa khóa nhưng vẫn đứng trong đám đông tới khi người nhà tới đón.",
        "Bạn đã tránh được hành vi nguy hiểm nhất, nhưng có mặt trong nhóm tụ tập vẫn khiến bạn bị ghi nhận liên quan khi lực lượng chức năng xử lý. Rời khỏi hiện trường ngay từ đầu mới là bước xử lý trọn vẹn.",
        6,
      ),
      outcome(
        "ket-cuc-nang",
        "harmful",
        "Bạn cầm lái khi chưa đủ điều kiện, trên đoạn đường đang có nhóm đua xe. Xe mất lái, bạn ngã và bị đưa về trụ sở công an cùng cả nhóm.",
        "Chưa đủ tuổi, không có giấy phép mà điều khiển xe trong nhóm tụ tập là hành vi vừa nguy hiểm tính mạng vừa có thể bị xử lý; người giao xe và người cổ vũ cũng có thể phát sinh trách nhiệm tùy hành vi, tình tiết.",
        6,
      ),
    ],
  ),
  scenario(
    2,
    "Mạng xã hội",
    "Tin nhắn báo trúng thưởng",
    "Một tài khoản lạ nhắn cho bạn: “Chúc mừng bạn trúng điện thoại! Chỉ cần đóng 350.000đ phí vận chuyển là nhận hàng ngay hôm nay.”",
    [
      step(
        "bat-dau",
        "Tin nhắn kèm ảnh hộp điện thoại và một số tài khoản ngân hàng. Bạn làm gì?",
        [
          { label: "Chuyển 350.000đ cho kịp nhận hàng", next: "ket-cuc-nang" },
          { label: "Nhắn lại hỏi thêm thông tin", next: "hoi-them" },
          {
            label: "Chặn tài khoản và kể lại với phụ huynh",
            next: "ket-cuc-an-toan",
          },
        ],
      ),
      step(
        "hoi-them",
        "Họ gửi một đường dẫn “xác minh người nhận”, giao diện giống hệt trang ngân hàng và yêu cầu đăng nhập.",
        [
          { label: "Đăng nhập để xác minh", next: "ket-cuc-nang" },
          {
            label: "Đóng đường dẫn, gọi tổng đài ngân hàng và báo phụ huynh",
            next: "ket-cuc-an-toan",
          },
          { label: "Đóng đường dẫn nhưng không kể với ai", next: "ket-cuc-rui-ro" },
        ],
      ),
      outcome(
        "ket-cuc-an-toan",
        "safe",
        "Bạn dừng lại đúng lúc. Phụ huynh giúp bạn báo cáo tài khoản lừa đảo và nhắc cả lớp cùng cảnh giác.",
        "Yêu cầu chuyển tiền trước để nhận thưởng và đường dẫn đăng nhập giả là dấu hiệu lừa đảo điển hình. Dừng lại, xác minh qua kênh chính thức và báo người lớn là cách xử lý an toàn.",
        3,
      ),
      outcome(
        "ket-cuc-rui-ro",
        "risky",
        "Bạn không mất tiền, nhưng tài khoản lừa đảo vẫn tiếp tục nhắn cho các bạn khác trong lớp.",
        "Tự bảo vệ được mình mới là một nửa. Không báo lại thì nhóm lừa đảo tiếp tục tiếp cận người khác; chia sẻ với thầy cô, phụ huynh giúp ngăn thiệt hại cho cả tập thể.",
        3,
      ),
      outcome(
        "ket-cuc-nang",
        "harmful",
        "Tiền chuyển đi không lấy lại được, tài khoản mạng xã hội của bạn bị chiếm và dùng để nhắn tin lừa tiếp bạn bè trong danh bạ.",
        "Chuyển tiền hoặc đăng nhập vào trang giả khiến bạn vừa mất tiền vừa mất tài khoản, và tài khoản đó tiếp tục bị dùng để phát tán thông tin sai sự thật tới người khác.",
        3,
      ),
    ],
  ),
  scenario(
    3,
    "Bạo lực học đường",
    "Chứng kiến bạn cùng lớp bị vây đánh",
    "Giờ ra chơi, bạn thấy một nhóm vây quanh bạn cùng lớp ở góc sân. Vài người đã giơ điện thoại lên quay.",
    [
      step(
        "bat-dau",
        "Tiếng xô đẩy mỗi lúc một to. Bạn chọn làm gì?",
        [
          { label: "Quay clip rồi đăng lên nhóm lớp", next: "quay-clip" },
          { label: "Lao vào can ngăn một mình", next: "can-mot-minh" },
          { label: "Chạy đi gọi giáo viên, bảo vệ", next: "goi-nguoi-lon" },
        ],
      ),
      step(
        "can-mot-minh",
        "Bạn xen vào giữa nhưng bị đẩy ngã, nhóm kia quay sang phía bạn.",
        [
          { label: "Đẩy lại để tự vệ", next: "ket-cuc-nang" },
          { label: "Rút ra khỏi vòng vây và gọi người lớn", next: "goi-nguoi-lon" },
        ],
      ),
      step(
        "goi-nguoi-lon",
        "Giáo viên tới nơi, sự việc dừng lại. Thầy hỏi bạn có nắm được gì trước đó không.",
        [
          { label: "Chỉ kể miệng rồi thôi", next: "ket-cuc-rui-ro" },
          {
            label: "Kể lại kèm ảnh chụp tin nhắn đe dọa mà bạn từng thấy",
            next: "ket-cuc-an-toan",
          },
        ],
      ),
      outcome(
        "quay-clip",
        "harmful",
        "Clip lan khắp các nhóm chat. Bạn bị hại bị chế giễu thêm và không dám đến lớp.",
        "Quay clip để đăng lại khiến người bị hại tổn thương lần thứ hai và có thể bị xử lý vì phát tán hình ảnh xâm phạm quyền riêng tư, danh dự của người khác.",
        4,
      ),
      outcome(
        "ket-cuc-nang",
        "harmful",
        "Xô xát lan rộng, cả bạn và nhóm kia đều bị thương và bị lập biên bản.",
        "Can ngăn một mình dễ biến người giúp đỡ thành một bên trong vụ xô xát, gây hậu quả về sức khỏe và trách nhiệm kỷ luật cho chính bạn. Gọi người lớn là cách can thiệp hiệu quả và an toàn hơn.",
        5,
      ),
      outcome(
        "ket-cuc-rui-ro",
        "risky",
        "Sự việc tạm lắng, nhưng vài hôm sau bạn cùng lớp lại tiếp tục bị nhắn tin đe dọa.",
        "Không có bằng chứng thì nhà trường khó xử lý tận gốc, sự việc dễ tái diễn. Việc lưu lại tin nhắn, ảnh chụp là bước cần thiết để người lớn can thiệp dứt điểm.",
        5,
      ),
      outcome(
        "ket-cuc-an-toan",
        "safe",
        "Nhà trường có đủ cơ sở để làm việc với nhóm học sinh kia và mời phụ huynh cùng tham gia xử lý.",
        "Tách khỏi nơi xô xát, gọi người lớn và cung cấp bằng chứng đã lưu là chuỗi xử lý an toàn cho cả bạn lẫn người bị hại; khi cần, tổng đài bảo vệ trẻ em 111 tiếp nhận thông tin 24/7.",
        5,
      ),
    ],
  ),
]);

export function findRoleplayScenario(id: number): RoleplayScenario | null {
  return roleplayScenarios.find((item) => item.id === id) ?? null;
}
