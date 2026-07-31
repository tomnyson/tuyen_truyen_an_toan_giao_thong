// Nội dung seed cho cổng tra cứu pháp luật. Nguyên văn điều khoản được
// trích từ bản PDF chính thức trên vanban.chinhphu.vn/datafiles.chinhphu.vn
// (đối chiếu ngày 2026-07-31). Người vận hành rà lại các con số mức phạt
// trước khi seed lên production.
//
// Lưu ý hiệu lực đã kiểm tra ngày 2026-07-31:
// - NĐ 168/2024/NĐ-CP: bị sửa đổi bởi NĐ 238/2026/NĐ-CP nhưng NĐ 238 chỉ
//   có hiệu lực từ 15-08-2026, nên bản dưới đây là bản đang áp dụng.
// - NĐ 15/2020/NĐ-CP: các Điều 98-106 đã bị bãi bỏ bởi Điều 117 NĐ
//   174/2026/NĐ-CP (hiệu lực 01-07-2026) — vì vậy seed dùng NĐ 174/2026.
// - Luật SHTT trích theo văn bản hợp nhất 155/VBHN-VPQH (ký 09-09-2025).

const ND168 = {
  documentNumber: "168/2024/NĐ-CP",
  title:
    "Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ; trừ điểm, phục hồi điểm giấy phép lái xe",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=212167",
  issuedAt: "2024-12-26",
  effectiveFrom: "2025-01-01",
};

const ND174 = {
  documentNumber: "174/2026/NĐ-CP",
  title:
    "Nghị định 174/2026/NĐ-CP quy định xử phạt vi phạm hành chính trong lĩnh vực bưu chính, viễn thông, tần số vô tuyến điện, giao dịch điện tử và công nghệ thông tin",
  officialUrl:
    "https://vanban.chinhphu.vn/?classid=1&docid=218185&pageid=27160&typegroupid=4",
  issuedAt: "2026-05-15",
  effectiveFrom: "2026-07-01",
};

const BLDS = {
  documentNumber: "91/2015/QH13",
  title: "Bộ luật Dân sự năm 2015",
  officialUrl:
    "https://vanban.chinhphu.vn/?pageid=27160&docid=183188&classid=1&typegroupid=3",
  issuedAt: "2015-11-24",
  effectiveFrom: "2017-01-01",
};

const LANM = {
  documentNumber: "24/2018/QH14",
  title: "Luật An ninh mạng năm 2018",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=206114",
  issuedAt: "2018-06-12",
  effectiveFrom: "2019-01-01",
};

const LSHTT = {
  documentNumber: "155/VBHN-VPQH",
  title:
    "Văn bản hợp nhất 155/VBHN-VPQH — Luật Sở hữu trí tuệ (hợp nhất các sửa đổi, bổ sung đến năm 2025)",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=215309",
  issuedAt: "2025-09-09",
  effectiveFrom: "2006-07-01",
};

const ND174_CANHAN_NUA =
  "Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP).";
const TRE_EM_NUA =
  "Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.";

export default {
  seedContentVersion: "seed-content-v1",
  situations: [
    // ===== GIAO THÔNG (9) =====
    {
      slug: "giao-thong-mu-bao-hiem",
      topic: "Giao thông",
      icon: "◉",
      title: "Không đội mũ bảo hiểm khi đi xe máy",
      tags: ["giao-thong", "mu-bao-hiem", "xe-may"],
      legalBasis: "Điểm h, i khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 400.000 đến 600.000 đồng với người điều khiển xe không đội mũ bảo hiểm hoặc đội mà không cài quai đúng quy cách; chở người ngồi sau không đội mũ cũng bị phạt cùng mức. " +
        TRE_EM_NUA,
      remedy:
        "Luôn đội mũ bảo hiểm đạt chuẩn và cài quai đúng cách cho cả người lái lẫn người ngồi sau, kể cả khi đi quãng đường ngắn.",
      caseStudy:
        "Nam 16 tuổi chở bạn đi học, cả hai đều không đội mũ bảo hiểm. Cả hành vi tự mình không đội và hành vi chở người không đội đều có thể bị xử phạt.",
      source: ND168,
      provision: {
        article: "7",
        clause: "2",
        point: "h",
        originalText:
          "2. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... h) Không đội \"mũ bảo hiểm cho người đi mô tô, xe máy\" hoặc đội \"mũ bảo hiểm cho người đi mô tô, xe máy\" không cài quai đúng quy cách khi điều khiển xe tham gia giao thông trên đường bộ; i) Chở người ngồi trên xe không đội \"mũ bảo hiểm cho người đi mô tô, xe máy\" hoặc đội \"mũ bảo hiểm cho người đi mô tô, xe máy\" không cài quai đúng quy cách, trừ trường hợp chở người bệnh đi cấp cứu, trẻ em dưới 06 tuổi, áp giải người có hành vi vi phạm pháp luật;",
        simplifiedText:
          "Người lái xe máy và người ngồi sau đều phải đội mũ bảo hiểm và cài quai đúng cách. Không đội, hoặc đội mà không cài quai, bị phạt 400.000-600.000 đồng; chở người không đội mũ cũng bị phạt như vậy.",
      },
    },
    {
      slug: "giao-thong-vuot-den-do",
      topic: "Giao thông",
      icon: "✕",
      title: "Vượt đèn đỏ",
      tags: ["giao-thong", "den-do", "tin-hieu"],
      legalBasis: "Điểm c khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người đi xe máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông. " +
        TRE_EM_NUA,
      remedy:
        "Dừng hẳn trước vạch khi đèn đỏ, kể cả khi đường vắng; đèn vàng cũng phải giảm tốc độ và dừng nếu chưa qua vạch.",
      caseStudy:
        "Bạn học sinh đi xe máy điện thấy đường vắng nên vượt đèn đỏ lúc sáng sớm. Hành vi này bị phạt rất nặng theo mức mới từ 2025, dù không gây tai nạn.",
      source: ND168,
      provision: {
        article: "7",
        clause: "7",
        point: "c",
        originalText:
          "7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... c) Không chấp hành hiệu lệnh của đèn tín hiệu giao thông;",
        simplifiedText:
          "Đi xe máy vượt đèn đỏ (không chấp hành đèn tín hiệu) bị phạt 4-6 triệu đồng — mức phạt đã tăng mạnh từ 01/01/2025.",
      },
    },
    {
      slug: "giao-thong-cho-qua-nguoi",
      topic: "Giao thông",
      icon: "▲",
      title: "Chở quá số người quy định",
      tags: ["giao-thong", "cho-qua-nguoi", "xe-may"],
      legalBasis: "Điểm g khoản 2, điểm b khoản 3 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Chở theo 2 người trên xe: phạt 400.000-600.000 đồng (trừ chở người bệnh đi cấp cứu, trẻ em dưới 12 tuổi, người già yếu, người khuyết tật). Chở theo từ 3 người trở lên: phạt 600.000-800.000 đồng. " +
        TRE_EM_NUA,
      remedy:
        "Xe máy chỉ chở tối đa một người ngồi sau; đừng 'kẹp ba' dù quãng đường ngắn hay có quen biết nhau.",
      caseStudy:
        "Ba bạn cùng lớp 'kẹp ba' trên một chiếc xe máy điện đi chơi cuối tuần. Người cầm lái bị xử phạt về hành vi chở quá số người, chưa kể nguy cơ tai nạn cao hơn hẳn.",
      source: ND168,
      provision: {
        article: "7",
        clause: "2",
        point: "g",
        originalText:
          "2. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... g) Chở theo 02 người trên xe, trừ trường hợp chở người bệnh đi cấp cứu, trẻ em dưới 12 tuổi, người già yếu hoặc người khuyết tật, áp giải người có hành vi vi phạm pháp luật;",
        simplifiedText:
          "Xe máy chở thêm 2 người bị phạt 400.000-600.000 đồng (trừ trường hợp cấp cứu, trẻ dưới 12 tuổi, người già yếu, khuyết tật). Chở từ 3 người trở lên mức phạt cao hơn.",
      },
    },
    {
      slug: "giao-thong-nguoc-chieu",
      topic: "Giao thông",
      icon: "↺",
      title: "Đi ngược chiều đường một chiều",
      tags: ["giao-thong", "nguoc-chieu"],
      legalBasis: "Điểm a khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người đi xe máy ngược chiều của đường một chiều hoặc trên đường có biển 'Cấm đi ngược chiều'. " +
        TRE_EM_NUA,
      remedy:
        "Đi đúng chiều đường kể cả khi phải vòng xa hơn; chú ý biển 'Cấm đi ngược chiều' ở đầu các tuyến một chiều.",
      caseStudy:
        "Để tiết kiệm vài trăm mét, một bạn đi xe máy ngược chiều đoạn đường một chiều gần trường. Mức phạt 4-6 triệu đồng cao gấp nhiều lần 'quãng đường tiết kiệm được'.",
      source: ND168,
      provision: {
        article: "7",
        clause: "7",
        point: "a",
        originalText:
          "7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Đi ngược chiều của đường một chiều, đi ngược chiều trên đường có biển \"Cấm đi ngược chiều\", trừ hành vi vi phạm quy định tại điểm b khoản này và các trường hợp xe ưu tiên đang đi làm nhiệm vụ khẩn cấp theo quy định; điều khiển xe đi trên vỉa hè, trừ trường hợp điều khiển xe đi qua vỉa hè để vào nhà, cơ quan;",
        simplifiedText:
          "Đi xe máy ngược chiều đường một chiều hoặc nơi có biển cấm đi ngược chiều bị phạt 4-6 triệu đồng.",
      },
    },
    {
      slug: "giao-thong-dien-thoai",
      topic: "Giao thông",
      icon: "☎",
      title: "Dùng điện thoại khi đang lái xe",
      tags: ["giao-thong", "dien-thoai", "xe-may"],
      legalBasis: "Điểm đ khoản 4 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 800.000 đến 1.000.000 đồng với người đang điều khiển xe máy mà dùng tay cầm và sử dụng điện thoại hoặc thiết bị điện tử khác. " +
        TRE_EM_NUA,
      remedy:
        "Cần nghe gọi hay xem bản đồ thì dừng xe ở nơi an toàn trước; tuyệt đối không vừa lái vừa nhắn tin.",
      caseStudy:
        "Một bạn vừa lái xe máy điện vừa xem tin nhắn, loạng choạng suýt va vào người đi bộ. Ngoài mức phạt tiền, đây là nguyên nhân tai nạn rất phổ biến ở tuổi học sinh.",
      source: ND168,
      provision: {
        article: "7",
        clause: "4",
        point: "đ",
        originalText:
          "4. Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... đ) Người đang điều khiển xe sử dụng ô (dù), thiết bị âm thanh (trừ thiết bị trợ thính), dùng tay cầm và sử dụng điện thoại hoặc các thiết bị điện tử khác.",
        simplifiedText:
          "Vừa lái xe máy vừa cầm điện thoại (hoặc che ô, đeo tai nghe) bị phạt 800.000-1.000.000 đồng.",
      },
    },
    {
      slug: "giao-thong-guong-hau",
      topic: "Giao thông",
      icon: "◐",
      title: "Không có gương chiếu hậu",
      tags: ["giao-thong", "guong", "xe-may"],
      legalBasis: "Điểm a khoản 1 Điều 14 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 400.000 đến 600.000 đồng nếu xe máy không có gương chiếu hậu bên trái người điều khiển hoặc có nhưng không có tác dụng. " +
        TRE_EM_NUA,
      remedy:
        "Lắp và giữ nguyên gương chiếu hậu (tối thiểu bên trái) đúng tiêu chuẩn; đừng tháo gương vì 'cho đẹp'.",
      caseStudy:
        "Một bạn tháo cả hai gương xe máy điện cho 'gọn'. Khi bị kiểm tra, hành vi thiếu gương bên trái đã đủ để bị xử phạt, chưa kể điểm mù khiến chuyển làn rất nguy hiểm.",
      source: ND168,
      provision: {
        article: "14",
        clause: "1",
        point: "a",
        originalText:
          "1. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với một trong các hành vi vi phạm sau đây: a) Điều khiển xe không có còi; đèn soi biển số; đèn báo hãm; gương chiếu hậu bên trái người điều khiển hoặc có nhưng không có tác dụng;",
        simplifiedText:
          "Xe máy phải có gương chiếu hậu bên trái còn dùng được; thiếu hoặc gương hỏng bị phạt 400.000-600.000 đồng.",
      },
    },
    {
      slug: "giao-thong-chua-du-tuoi",
      topic: "Giao thông",
      icon: "⚠",
      title: "Chưa đủ tuổi điều khiển xe máy",
      tags: ["giao-thong", "do-tuoi", "hoc-sinh"],
      legalBasis: "Khoản 1, điểm a khoản 4 Điều 18 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Người từ đủ 14 đến dưới 16 tuổi điều khiển xe mô tô, xe gắn máy: phạt cảnh cáo. Người từ đủ 16 đến dưới 18 tuổi điều khiển xe mô tô từ 50 cm³ (hoặc động cơ điện từ 4 kW) trở lên: phạt tiền 400.000-600.000 đồng. Người giao xe cho người chưa đủ điều kiện cũng bị xử phạt riêng.",
      remedy:
        "Dưới 16 tuổi chỉ dùng xe đạp, xe đạp điện; đủ 16 tuổi mới được đi xe gắn máy dưới 50 cm³; đủ 18 tuổi và có giấy phép lái xe mới được đi mô tô từ 50 cm³ trở lên.",
      caseStudy:
        "Phụ huynh giao xe tay ga 110cc cho con 16 tuổi đi học. Con bị phạt tiền vì chưa đủ tuổi với loại xe này, còn người giao xe cũng bị xử phạt về hành vi giao xe cho người chưa đủ điều kiện.",
      source: ND168,
      provision: {
        article: "18",
        clause: "4",
        point: "a",
        originalText:
          "1. Phạt cảnh cáo người từ đủ 14 tuổi đến dưới 16 tuổi điều khiển xe mô tô, xe gắn máy, các loại xe tương tự xe mô tô và các loại xe tương tự xe gắn máy hoặc điều khiển xe ô tô, điều khiển xe chở người bốn bánh có gắn động cơ, xe chở hàng bốn bánh có gắn động cơ và các loại xe tương tự xe ô tô. ... 4. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với một trong các hành vi vi phạm sau đây: a) Người từ đủ 16 tuổi đến dưới 18 tuổi điều khiển xe mô tô có dung tích xi-lanh từ 50 cm3 trở lên hoặc có công suất động cơ điện từ 04 kW trở lên;",
        simplifiedText:
          "14-16 tuổi lái xe máy: bị cảnh cáo. 16-18 tuổi lái mô tô từ 50 cm³ (hoặc xe điện từ 4 kW) trở lên: phạt 400.000-600.000 đồng. Chỉ đủ 18 tuổi, có giấy phép, mới được lái mô tô.",
      },
    },
    {
      slug: "giao-thong-via-he",
      topic: "Giao thông",
      icon: "▦",
      title: "Chạy xe máy trên vỉa hè",
      tags: ["giao-thong", "via-he"],
      legalBasis: "Điểm a khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người điều khiển xe máy đi trên vỉa hè (trừ trường hợp đi qua vỉa hè để vào nhà, cơ quan). " +
        TRE_EM_NUA,
      remedy:
        "Kẹt xe cũng phải đi dưới lòng đường đúng làn; vỉa hè là của người đi bộ.",
      caseStudy:
        "Giờ tan học đường đông, một bạn leo xe máy điện lên vỉa hè để vượt. Từ 2025 hành vi này bị phạt tới 4-6 triệu đồng vì gây nguy hiểm trực tiếp cho người đi bộ.",
      source: ND168,
      provision: {
        article: "7",
        clause: "7",
        point: "a",
        originalText:
          "7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Đi ngược chiều của đường một chiều, đi ngược chiều trên đường có biển \"Cấm đi ngược chiều\", trừ hành vi vi phạm quy định tại điểm b khoản này và các trường hợp xe ưu tiên đang đi làm nhiệm vụ khẩn cấp theo quy định; điều khiển xe đi trên vỉa hè, trừ trường hợp điều khiển xe đi qua vỉa hè để vào nhà, cơ quan;",
        simplifiedText:
          "Chạy xe máy trên vỉa hè (không phải để rẽ vào nhà, cơ quan) bị phạt 4-6 triệu đồng.",
      },
    },
    {
      slug: "giao-thong-lang-lach",
      topic: "Giao thông",
      icon: "∿",
      title: "Lạng lách, đánh võng",
      tags: ["giao-thong", "lang-lach", "dua-xe"],
      legalBasis: "Điểm a khoản 9 Điều 7 Nghị định 168/2024/NĐ-CP",
      penalty:
        "Phạt tiền từ 8.000.000 đến 10.000.000 đồng với người điều khiển xe máy lạng lách, đánh võng trên đường bộ. Gây tai nạn hoặc tái phạm còn bị xử lý nặng hơn theo các khoản khác của Điều 7. " +
        TRE_EM_NUA,
      remedy:
        "Không 'biểu diễn', không kéo ga bốc đầu, không tham gia đoàn xe rú ga lạng lách — kể cả chỉ để quay video.",
      caseStudy:
        "Một nhóm bạn rủ nhau lạng lách quay clip đăng mạng. Ngoài mức phạt tiền rất cao, clip tự đăng chính là bằng chứng để cơ quan chức năng xử lý.",
      source: ND168,
      provision: {
        article: "7",
        clause: "9",
        point: "a",
        originalText:
          "9. Phạt tiền từ 8.000.000 đồng đến 10.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Điều khiển xe lạng lách, đánh võng trên đường bộ; sử dụng chân chống hoặc vật khác quệt xuống đường khi xe đang chạy;",
        simplifiedText:
          "Lạng lách, đánh võng bằng xe máy bị phạt 8-10 triệu đồng; đây là một trong các mức phạt nặng nhất với xe máy.",
      },
    },

    // ===== MẠNG XÃ HỘI (9) =====
    {
      slug: "mang-xa-hoi-tin-sai",
      topic: "Mạng xã hội",
      icon: "⚑",
      title: "Đăng, chia sẻ tin sai sự thật",
      tags: ["mang-xa-hoi", "tin-gia", "chia-se"],
      legalBasis: "Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi lợi dụng mạng xã hội để cung cấp, chia sẻ thông tin giả mạo, sai sự thật. " +
        ND174_CANHAN_NUA +
        " Ngoài phạt tiền còn buộc gỡ bỏ thông tin.",
      remedy:
        "Kiểm tra nguồn trước khi bấm chia sẻ; nếu lỡ đăng thì gỡ ngay, đính chính và xin lỗi người bị ảnh hưởng.",
      caseStudy:
        "Một bạn chia sẻ lại bài 'trường X cho nghỉ học' do người khác bịa. Dù không phải người viết đầu tiên, hành vi chia sẻ vẫn là 'cung cấp, chia sẻ thông tin sai sự thật' và có thể bị xử phạt.",
      source: ND174,
      provision: {
        article: "95",
        clause: "1",
        point: "a",
        originalText:
          "1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;",
        simplifiedText:
          "Đăng hoặc chia sẻ lại tin giả, tin sai sự thật trên mạng xã hội bị phạt tiền (cá nhân 10-15 triệu đồng) và buộc gỡ bài. Chia sẻ lại cũng tính là vi phạm.",
      },
    },
    {
      slug: "mang-xa-hoi-xuc-pham",
      topic: "Mạng xã hội",
      icon: "✗",
      title: "Xúc phạm danh dự người khác trên mạng",
      tags: ["mang-xa-hoi", "xuc-pham", "danh-du"],
      legalBasis:
        "Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP; Điều 34 Bộ luật Dân sự 2015",
      penalty:
        "Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi lợi dụng mạng xã hội xúc phạm danh dự, nhân phẩm của cá nhân. " +
        ND174_CANHAN_NUA +
        " Người bị xúc phạm còn có quyền yêu cầu xin lỗi, cải chính công khai và bồi thường theo Bộ luật Dân sự.",
      remedy:
        "Bất đồng thì góp ý riêng, văn minh; không đăng bài bêu xấu, chửi bới, chế ảnh hạ nhục người khác.",
      caseStudy:
        "Sau mâu thuẫn, một bạn lập bài 'bóc phốt' kèm ảnh chế xúc phạm bạn cùng lớp. Ngoài nguy cơ bị phạt hành chính, bạn ấy còn có thể bị kiện đòi xin lỗi công khai và bồi thường.",
      source: ND174,
      provision: {
        article: "95",
        clause: "1",
        point: "a",
        originalText:
          "1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;",
        simplifiedText:
          "Dùng mạng xã hội để vu khống, xúc phạm danh dự, nhân phẩm người khác bị phạt tiền (cá nhân 10-15 triệu đồng), buộc gỡ nội dung, và có thể phải xin lỗi, bồi thường dân sự.",
      },
    },
    {
      slug: "mang-xa-hoi-dang-anh",
      topic: "Mạng xã hội",
      icon: "▣",
      title: "Đăng ảnh người khác không xin phép",
      tags: ["mang-xa-hoi", "hinh-anh", "quyen-rieng-tu"],
      legalBasis: "Điều 32 Bộ luật Dân sự 2015",
      penalty:
        "Việc sử dụng hình ảnh của cá nhân phải được người đó đồng ý. Người bị đăng ảnh trái phép có quyền yêu cầu Tòa án buộc thu hồi, tiêu hủy, chấm dứt việc sử dụng hình ảnh và bồi thường thiệt hại.",
      remedy:
        "Hỏi ý kiến trước khi đăng ảnh có mặt người khác — kể cả ảnh nhóm bạn; người ta yêu cầu gỡ thì gỡ ngay.",
      caseStudy:
        "Một bạn đăng ảnh dìm của bạn thân lên nhóm lớp cho vui, bạn kia yêu cầu gỡ nhưng không gỡ. Theo Điều 32 BLDS, người có ảnh có quyền yêu cầu chấm dứt sử dụng và bồi thường nếu có thiệt hại.",
      source: BLDS,
      provision: {
        article: "32",
        clause: "1",
        point: null,
        originalText:
          "1. Cá nhân có quyền đối với hình ảnh của mình. Việc sử dụng hình ảnh của cá nhân phải được người đó đồng ý. Việc sử dụng hình ảnh của người khác vì mục đích thương mại thì phải trả thù lao cho người có hình ảnh, trừ trường hợp các bên có thỏa thuận khác.",
        simplifiedText:
          "Muốn dùng (đăng) ảnh của ai thì phải được người đó đồng ý; dùng vào mục đích kiếm tiền còn phải trả thù lao. Vi phạm thì người có ảnh có quyền yêu cầu gỡ, hủy ảnh và bồi thường.",
      },
    },
    {
      slug: "mang-xa-hoi-lo-thong-tin",
      topic: "Mạng xã hội",
      icon: "◫",
      title: "Để lộ thông tin cá nhân, đời tư người khác",
      tags: ["mang-xa-hoi", "thong-tin-ca-nhan", "doi-tu"],
      legalBasis: "Điểm m khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi tiết lộ thông tin đời sống riêng tư, bí mật cá nhân, bí mật gia đình mà chưa đến mức truy cứu trách nhiệm hình sự. " +
        ND174_CANHAN_NUA,
      remedy:
        "Không đăng địa chỉ nhà, số điện thoại, tin nhắn riêng, chuyện gia đình của người khác; thấy người khác bị lộ thông tin thì không chia sẻ tiếp.",
      caseStudy:
        "Giận bạn, một bạn chụp tin nhắn riêng tư và số điện thoại của bạn kia đăng lên nhóm chat trăm người. Đây là hành vi tiết lộ bí mật cá nhân và có thể bị phạt tiền.",
      source: ND174,
      provision: {
        article: "96",
        clause: "3",
        point: "m",
        originalText:
          "3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... m) Tiết lộ thông tin thuộc danh mục bí mật nhà nước, đời sống riêng tư, bí mật cá nhân, bí mật gia đình mà chưa đến mức truy cứu trách nhiệm hình sự;",
        simplifiedText:
          "Tiết lộ đời tư, bí mật cá nhân, bí mật gia đình của người khác lên mạng bị phạt tiền (cá nhân 5-10 triệu đồng), nếu nghiêm trọng có thể bị xử lý hình sự.",
      },
    },
    {
      slug: "mang-xa-hoi-gia-mao",
      topic: "Mạng xã hội",
      icon: "⧉",
      title: "Giả mạo tài khoản, trang của người khác",
      tags: ["mang-xa-hoi", "gia-mao", "tai-khoan"],
      legalBasis: "Điểm n khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi giả mạo tổ chức, cá nhân và phát tán thông tin giả mạo, sai sự thật xâm hại quyền, lợi ích hợp pháp của người khác. " +
        ND174_CANHAN_NUA,
      remedy:
        "Không lập tài khoản mạo danh ai — kể cả 'cho vui'; phát hiện mình bị mạo danh thì báo cáo với nền tảng và lưu bằng chứng.",
      caseStudy:
        "Một nhóm bạn lập tài khoản giả tên và ảnh của thầy giáo để đăng bài đùa cợt. Hành vi giả mạo cá nhân này có thể bị phạt tiền, dù 'chỉ định trêu'.",
      source: ND174,
      provision: {
        article: "96",
        clause: "3",
        point: "n",
        originalText:
          "3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... n) Giả mạo tổ chức, cá nhân và phát tán thông tin giả mạo, thông tin sai sự thật xâm hại đến quyền và lợi ích hợp pháp của tổ chức, cá nhân;",
        simplifiedText:
          "Lập tài khoản, trang giả mạo người khác rồi phát tán thông tin giả bị phạt tiền (cá nhân 5-10 triệu đồng).",
      },
    },
    {
      slug: "mang-xa-hoi-lua-dao",
      topic: "Mạng xã hội",
      icon: "⚠",
      title: "Lừa đảo qua mạng",
      tags: ["mang-xa-hoi", "lua-dao", "an-toan"],
      legalBasis: "Điểm b khoản 1 Điều 18 Luật An ninh mạng 2018",
      penalty:
        "Sử dụng không gian mạng để chiếm đoạt tài sản là hành vi vi phạm pháp luật về an ninh mạng; tùy tính chất, mức độ mà bị xử phạt hành chính hoặc truy cứu trách nhiệm hình sự về tội lừa đảo chiếm đoạt tài sản.",
      remedy:
        "Không chuyển tiền cho người lạ trên mạng; cảnh giác 'việc nhẹ lương cao', trúng thưởng, giả danh công an; bị lừa thì giữ bằng chứng và báo ngay cho phụ huynh, nhà trường hoặc công an.",
      caseStudy:
        "Một bạn được 'tuyển cộng tác viên chốt đơn' yêu cầu nộp tiền cọc rồi mất liên lạc. Đây là thủ đoạn lừa đảo chiếm đoạt tài sản qua mạng rất phổ biến nhắm vào học sinh.",
      source: LANM,
      provision: {
        article: "18",
        clause: "1",
        point: "b",
        originalText:
          "1. Hành vi sử dụng không gian mạng, công nghệ thông tin, phương tiện điện tử để vi phạm pháp luật về an ninh quốc gia, trật tự, an toàn xã hội bao gồm: ... b) Chiếm đoạt tài sản; tổ chức đánh bạc, đánh bạc qua mạng Internet; trộm cắp cước viễn thông quốc tế trên nền Internet; vi phạm bản quyền và sở hữu trí tuệ trên không gian mạng;",
        simplifiedText:
          "Dùng mạng để chiếm đoạt tài sản (lừa đảo) là hành vi bị pháp luật nghiêm cấm; nghiêm trọng sẽ bị xử lý hình sự.",
      },
    },
    {
      slug: "mang-xa-hoi-quay-roi",
      topic: "Mạng xã hội",
      icon: "☲",
      title: "Quấy rối, bắt nạt qua mạng",
      tags: ["mang-xa-hoi", "quay-roi", "bat-nat"],
      legalBasis: "Điểm g khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi sử dụng thông tin số nhằm đe dọa, quấy rối, xuyên tạc, vu khống, xúc phạm danh dự, nhân phẩm người khác. " +
        ND174_CANHAN_NUA,
      remedy:
        "Là nạn nhân: chặn, lưu bằng chứng (ảnh chụp màn hình kèm thời gian), báo phụ huynh/giáo viên, báo cáo nền tảng. Là người chứng kiến: đừng hùa theo, đừng chia sẻ.",
      caseStudy:
        "Một nhóm lập group chat chỉ để chế ảnh, nhắn tin đe dọa một bạn trong lớp suốt nhiều tuần. Hành vi đe dọa, quấy rối qua mạng này có thể bị xử phạt và nhà trường xử lý kỷ luật.",
      source: ND174,
      provision: {
        article: "96",
        clause: "3",
        point: "g",
        originalText:
          "3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... g) Cung cấp, trao đổi, truyền đưa hoặc lưu trữ, sử dụng thông tin số nhằm đe dọa, quấy rối, xuyên tạc, vu khống, xúc phạm uy tín của tổ chức, danh dự, nhân phẩm, uy tín của người khác;",
        simplifiedText:
          "Nhắn tin đe dọa, quấy rối, bôi nhọ người khác qua mạng bị phạt tiền (cá nhân 5-10 triệu đồng); nạn nhân nên lưu bằng chứng để báo cáo.",
      },
    },
    {
      slug: "mang-xa-hoi-quang-cao-sai",
      topic: "Mạng xã hội",
      icon: "▤",
      title: "Bán hàng online quảng cáo sai sự thật",
      tags: ["mang-xa-hoi", "ban-hang", "quang-cao"],
      legalBasis: "Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Thông tin quảng cáo bịa đặt, sai sự thật về hàng hóa đăng trên mạng xã hội thuộc nhóm hành vi cung cấp, chia sẻ thông tin sai sự thật: phạt tiền từ 20.000.000 đến 30.000.000 đồng. " +
        ND174_CANHAN_NUA +
        " Vi phạm về quảng cáo còn có thể bị xử lý theo pháp luật quảng cáo, bảo vệ người tiêu dùng.",
      remedy:
        "Bán hàng online thì mô tả đúng sản phẩm, không dùng ảnh 'mượn', không thổi phồng công dụng; người mua nên lưu tin nhắn, hóa đơn làm bằng chứng.",
      caseStudy:
        "Một bạn nhập mỹ phẩm trôi nổi về bán, quảng cáo là 'hàng chính hãng, trị mụn 100%'. Quảng cáo sai sự thật kiểu này có thể bị phạt tiền và phải bồi thường cho người mua.",
      source: ND174,
      provision: {
        article: "95",
        clause: "1",
        point: "a",
        originalText:
          "1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;",
        simplifiedText:
          "Quảng cáo bịa đặt, sai sự thật khi bán hàng trên mạng xã hội là cung cấp thông tin sai sự thật, bị phạt tiền (cá nhân 10-15 triệu đồng).",
      },
    },
    {
      slug: "mang-xa-hoi-noi-dung-bao-luc",
      topic: "Mạng xã hội",
      icon: "⊘",
      title: "Chia sẻ nội dung bạo lực, rùng rợn",
      tags: ["mang-xa-hoi", "bao-luc", "noi-dung-doc-hai"],
      legalBasis: "Điểm c khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP",
      penalty:
        "Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi cung cấp, chia sẻ thông tin miêu tả tỉ mỉ hành động chém, giết, tai nạn, kinh dị, rùng rợn trên mạng xã hội. " +
        ND174_CANHAN_NUA,
      remedy:
        "Thấy clip đánh nhau, tai nạn thì đừng chia sẻ lại — kể cả để 'cảnh báo'; hãy báo cáo nội dung cho nền tảng.",
      caseStudy:
        "Một bạn chia sẻ clip đánh nhau trước cổng trường kèm bình luận cợt nhả. Chia sẻ nội dung bạo lực cũng là hành vi vi phạm, đồng thời làm nạn nhân trong clip thêm tổn thương.",
      source: ND174,
      provision: {
        article: "95",
        clause: "1",
        point: "c",
        originalText:
          "1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: ... c) Cung cấp, chia sẻ thông tin miêu tả tỉ mỉ hành động chém, giết, tai nạn, kinh dị, rùng rợn;",
        simplifiedText:
          "Đăng hoặc chia sẻ clip, hình ảnh miêu tả tỉ mỉ cảnh bạo lực, tai nạn, rùng rợn bị phạt tiền (cá nhân 10-15 triệu đồng).",
      },
    },

    // ===== SỞ HỮU TRÍ TUỆ (9) =====
    {
      slug: "shtt-phan-mem-crack",
      topic: "Sở hữu trí tuệ",
      icon: "⌘",
      title: "Dùng phần mềm crack, bẻ khóa",
      tags: ["so-huu-tri-tue", "phan-mem", "ban-quyen"],
      legalBasis: "Khoản 4 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Cố ý hủy bỏ hoặc làm vô hiệu biện pháp công nghệ bảo vệ quyền tác giả (bẻ khóa, crack) là hành vi xâm phạm quyền tác giả; người vi phạm có thể bị xử phạt hành chính, buộc gỡ bỏ và bồi thường thiệt hại cho chủ sở hữu.",
      remedy:
        "Dùng phần mềm miễn phí/mã nguồn mở hoặc bản quyền giáo dục (nhiều hãng giảm giá mạnh cho học sinh) thay vì tải bản crack — vừa vi phạm vừa dễ dính mã độc.",
      caseStudy:
        "Một bạn tải bản 'full crack' của phần mềm đồ họa về làm bài tập. Ngoài việc xâm phạm quyền tác giả, máy của bạn ấy còn bị nhiễm mã độc đánh cắp tài khoản.",
      source: LSHTT,
      provision: {
        article: "28",
        clause: "4",
        point: null,
        effectiveFrom: "2023-01-01",
        originalText:
          "4. Cố ý hủy bỏ hoặc làm vô hiệu biện pháp công nghệ hữu hiệu do tác giả, chủ sở hữu quyền tác giả thực hiện để bảo vệ quyền tác giả đối với tác phẩm của mình nhằm thực hiện hành vi quy định tại Điều này và Điều 35 của Luật này.",
        simplifiedText:
          "Bẻ khóa (crack) phần mềm, phá các biện pháp bảo vệ bản quyền là hành vi xâm phạm quyền tác giả, có thể bị xử phạt và phải bồi thường.",
      },
    },
    {
      slug: "shtt-dang-lai-phim",
      topic: "Sở hữu trí tuệ",
      icon: "▶",
      title: "Đăng lại phim, nhạc không xin phép",
      tags: ["so-huu-tri-tue", "phim", "nhac"],
      legalBasis:
        "Điểm đ khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Truyền đạt tác phẩm đến công chúng qua mạng là quyền tài sản độc quyền của chủ sở hữu; đăng lại phim, nhạc không phép là xâm phạm quyền tác giả — có thể bị gỡ nội dung, khóa kênh, xử phạt hành chính và bồi thường.",
      remedy:
        "Xem phim, nghe nhạc trên nền tảng chính thức; muốn dùng lại một đoạn thì kiểm tra giấy phép hoặc xin phép chủ sở hữu.",
      caseStudy:
        "Một bạn cắt nguyên tập phim đang chiếu rạp đăng lên kênh cá nhân để 'review'. Kênh bị đánh bản quyền, video bị gỡ và có nguy cơ bị yêu cầu bồi thường.",
      source: LSHTT,
      provision: {
        article: "20",
        clause: "1",
        point: "đ",
        effectiveFrom: "2023-01-01",
        originalText:
          "đ) Phát sóng, truyền đạt đến công chúng tác phẩm bằng phương tiện hữu tuyến, vô tuyến, mạng thông tin điện tử hoặc bất kỳ phương tiện kỹ thuật nào khác, bao gồm cả việc cung cấp tác phẩm đến công chúng theo cách mà công chúng có thể tiếp cận được tại địa điểm và thời gian do họ lựa chọn;",
        simplifiedText:
          "Đưa phim, nhạc của người khác lên mạng cho mọi người xem là quyền độc quyền của chủ sở hữu tác phẩm; tự ý đăng lại là xâm phạm bản quyền.",
      },
    },
    {
      slug: "shtt-dung-anh",
      topic: "Sở hữu trí tuệ",
      icon: "▣",
      title: "Dùng ảnh trên mạng không xin phép",
      tags: ["so-huu-tri-tue", "hinh-anh", "tac-gia"],
      legalBasis:
        "Điểm c khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Sao chép tác phẩm (kể cả ảnh chụp, tranh vẽ tải trên mạng) mà không được phép là xâm phạm quyền tài sản của tác giả; có thể bị buộc gỡ bỏ, xử phạt hành chính và bồi thường.",
      remedy:
        "Dùng kho ảnh miễn phí có giấy phép (ghi rõ điều kiện), hoặc xin phép và ghi nguồn tác giả; 'tải được trên Google' không có nghĩa là được dùng tự do.",
      caseStudy:
        "Làm bài thuyết trình bán áo lớp, một bạn lấy bộ tranh của một họa sĩ trên mạng in lên áo. Họa sĩ phát hiện và yêu cầu dừng sử dụng, bồi thường — đây là quyền hợp pháp của tác giả.",
      source: LSHTT,
      provision: {
        article: "20",
        clause: "1",
        point: "c",
        effectiveFrom: "2023-01-01",
        originalText:
          "c) Sao chép trực tiếp hoặc gián tiếp toàn bộ hoặc một phần tác phẩm bằng bất kỳ phương tiện hay hình thức nào, trừ trường hợp quy định tại điểm a khoản 3 Điều này;",
        simplifiedText:
          "Sao chép ảnh, tranh, tác phẩm của người khác (toàn bộ hay một phần) phải được phép của chủ sở hữu; tải về dùng lại tùy tiện là xâm phạm bản quyền.",
      },
    },
    {
      slug: "shtt-dao-van",
      topic: "Sở hữu trí tuệ",
      icon: "✍",
      title: "Đạo văn bài tập, đồ án",
      tags: ["so-huu-tri-tue", "dao-van", "hoc-tap"],
      legalBasis:
        "Khoản 2 Điều 19, khoản 1 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Chép bài của người khác rồi đứng tên mình xâm phạm quyền nhân thân của tác giả (quyền đứng tên trên tác phẩm); ngoài hệ quả pháp lý, nhà trường còn xử lý kỷ luật theo quy chế riêng.",
      remedy:
        "Được tham khảo nhưng phải tự viết và ghi rõ nguồn trích dẫn; chép nguyên đoạn phải để trong ngoặc kép kèm tên tác giả.",
      caseStudy:
        "Một bạn nộp bài văn chép gần nguyên từ blog của người khác và đạt giải. Khi bị phát hiện, giải bị thu hồi — quyền đứng tên tác phẩm thuộc về người viết thật.",
      source: LSHTT,
      provision: {
        article: "19",
        clause: "2",
        point: null,
        effectiveFrom: "2023-01-01",
        originalText:
          "2. Đứng tên thật hoặc bút danh trên tác phẩm; được nêu tên thật hoặc bút danh khi tác phẩm được công bố, sử dụng;",
        simplifiedText:
          "Quyền đứng tên trên tác phẩm thuộc về tác giả thật. Chép bài người khác rồi ký tên mình là xâm phạm quyền tác giả và là đạo văn.",
      },
    },
    {
      slug: "shtt-in-ao-nhan-vat",
      topic: "Sở hữu trí tuệ",
      icon: "◈",
      title: "In áo, đồ dùng hình nhân vật bản quyền để bán",
      tags: ["so-huu-tri-tue", "nhan-vat", "kinh-doanh"],
      legalBasis:
        "Điểm a khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Làm tác phẩm phái sinh (in hình nhân vật lên áo, ốp lưng, sticker...) để kinh doanh mà không được phép là xâm phạm quyền tài sản của chủ sở hữu; có thể bị buộc dừng bán, tiêu hủy hàng và bồi thường.",
      remedy:
        "Kinh doanh đồ in hình thì dùng thiết kế tự vẽ, thiết kế đã mua bản quyền, hoặc xin giấy phép chính thức từ chủ sở hữu nhân vật.",
      caseStudy:
        "Một nhóm bạn in áo hình nhân vật hoạt hình nổi tiếng bán gây quỹ lớp. Dù mục đích tốt, việc thương mại hóa hình ảnh nhân vật có bản quyền vẫn cần được phép của chủ sở hữu.",
      source: LSHTT,
      provision: {
        article: "20",
        clause: "1",
        point: "a",
        effectiveFrom: "2023-01-01",
        originalText: "a) Làm tác phẩm phái sinh;",
        simplifiedText:
          "Lấy nhân vật, hình vẽ có bản quyền chế thành sản phẩm khác (áo, sticker...) là 'làm tác phẩm phái sinh' — quyền độc quyền của chủ sở hữu; muốn kinh doanh phải xin phép.",
      },
    },
    {
      slug: "shtt-hang-nhai",
      topic: "Sở hữu trí tuệ",
      icon: "⊗",
      title: "Mua bán hàng nhái nhãn hiệu",
      tags: ["so-huu-tri-tue", "nhan-hieu", "hang-gia"],
      legalBasis: "Điểm a khoản 1 Điều 129 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Sử dụng dấu hiệu trùng với nhãn hiệu được bảo hộ cho hàng hóa cùng loại là xâm phạm quyền đối với nhãn hiệu; người kinh doanh hàng nhái có thể bị xử phạt hành chính, tịch thu hàng hóa, và bồi thường cho chủ nhãn hiệu.",
      remedy:
        "Không nhập, không rao bán 'hàng super fake'; người mua nên chọn kênh phân phối chính hãng — bán hàng nhái là vi phạm kể cả khi nói rõ đó là hàng nhái.",
      caseStudy:
        "Một bạn nhập giày gắn logo hãng nổi tiếng giá rẻ về bán online, quảng cáo là 'rep 1:1'. Việc gắn nhãn hiệu được bảo hộ lên hàng không phải chính hãng là xâm phạm nhãn hiệu.",
      source: LSHTT,
      provision: {
        article: "129",
        clause: "1",
        point: "a",
        originalText:
          "a) Sử dụng dấu hiệu trùng với nhãn hiệu được bảo hộ cho hàng hóa, dịch vụ trùng với hàng hóa, dịch vụ thuộc danh mục đăng ký kèm theo nhãn hiệu đó;",
        simplifiedText:
          "Gắn logo, nhãn hiệu của hãng lên hàng không phải do hãng sản xuất (hàng nhái) là xâm phạm nhãn hiệu; mua bán loại hàng này đều rủi ro pháp lý.",
      },
    },
    {
      slug: "shtt-truyen-scan",
      topic: "Sở hữu trí tuệ",
      icon: "▤",
      title: "Đăng lại truyện scan, sách lậu",
      tags: ["so-huu-tri-tue", "truyen", "scan"],
      legalBasis:
        "Điểm c khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Scan, chụp lại truyện, sách rồi đăng lên mạng là sao chép và truyền đạt tác phẩm không phép — xâm phạm quyền tài sản của tác giả, nhà xuất bản; trang đăng có thể bị yêu cầu gỡ và bồi thường.",
      remedy:
        "Đọc truyện trên nền tảng có bản quyền; ủng hộ bản in hoặc bản điện tử chính thức để tác giả còn tiếp tục sáng tác.",
      caseStudy:
        "Một bạn chụp trọn bộ truyện tranh mới phát hành đăng lên nhóm 'đọc chùa'. Nhà phát hành báo cáo, nhóm bị đóng — và doanh thu nuôi tác giả cũng biến mất theo.",
      source: LSHTT,
      provision: {
        article: "20",
        clause: "1",
        point: "c",
        effectiveFrom: "2023-01-01",
        originalText:
          "c) Sao chép trực tiếp hoặc gián tiếp toàn bộ hoặc một phần tác phẩm bằng bất kỳ phương tiện hay hình thức nào, trừ trường hợp quy định tại điểm a khoản 3 Điều này;",
        simplifiedText:
          "Scan/chụp truyện, sách rồi đăng lên mạng là sao chép tác phẩm không phép — xâm phạm bản quyền của tác giả và nhà xuất bản.",
      },
    },
    {
      slug: "shtt-nhac-nen",
      topic: "Sở hữu trí tuệ",
      icon: "♪",
      title: "Dùng nhạc bản quyền làm nhạc nền video",
      tags: ["so-huu-tri-tue", "nhac", "video"],
      legalBasis:
        "Điểm đ khoản 1, khoản 2 Điều 20 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Dùng bản nhạc có bản quyền trong video đăng mạng là khai thác quyền truyền đạt tác phẩm — phải được phép và trả tiền bản quyền cho chủ sở hữu, trừ các ngoại lệ luật định; video vi phạm có thể bị tắt tiếng, gỡ bỏ hoặc bị khiếu nại bản quyền.",
      remedy:
        "Dùng nhạc trong thư viện miễn phí bản quyền của nền tảng, nhạc đã mua giấy phép, hoặc nhạc tự sáng tác.",
      caseStudy:
        "Video kỷ yếu của lớp dùng một bản hit làm nhạc nền bị nền tảng tắt tiếng vì khiếu nại bản quyền. Chọn nhạc từ thư viện miễn phí ngay từ đầu thì video đã không bị ảnh hưởng.",
      source: LSHTT,
      provision: {
        article: "20",
        clause: "2",
        point: null,
        effectiveFrom: "2023-01-01",
        originalText:
          "Tổ chức, cá nhân khi khai thác, sử dụng một, một số hoặc toàn bộ các quyền quy định tại khoản 1 Điều này và khoản 3 Điều 19 của Luật này phải được sự cho phép của chủ sở hữu quyền tác giả và trả tiền bản quyền, các quyền lợi vật chất khác (nếu có) cho chủ sở hữu quyền tác giả, trừ trường hợp quy định tại khoản 3 Điều này, các điều 25, 25a, 26, 32 và 33 của Luật này.",
        simplifiedText:
          "Muốn dùng nhạc của người khác trong video phải được chủ sở hữu cho phép và trả tiền bản quyền, trừ một số ngoại lệ luật cho phép.",
      },
    },
    {
      slug: "shtt-chep-logo",
      topic: "Sở hữu trí tuệ",
      icon: "◎",
      title: "Chép, nhái thiết kế logo",
      tags: ["so-huu-tri-tue", "logo", "thiet-ke"],
      legalBasis: "Điểm c khoản 1 Điều 129 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)",
      penalty:
        "Sử dụng dấu hiệu tương tự với nhãn hiệu được bảo hộ đến mức gây nhầm lẫn về nguồn gốc hàng hóa, dịch vụ là xâm phạm quyền nhãn hiệu; có thể bị buộc chấm dứt sử dụng, đổi nhận diện và bồi thường.",
      remedy:
        "Thiết kế logo cho câu lạc bộ, dự án thì làm mới hoàn toàn; trước khi dùng nên tra cứu nhãn hiệu đã đăng ký để tránh 'giống vô tình'.",
      caseStudy:
        "Câu lạc bộ của trường 'chế' logo một thương hiệu đồ uống nổi tiếng thành logo nhóm và in lên đồng phục bán ra ngoài. Dùng dấu hiệu tương tự gây nhầm lẫn như vậy là xâm phạm nhãn hiệu.",
      source: LSHTT,
      provision: {
        article: "129",
        clause: "1",
        point: "c",
        originalText:
          "c) Sử dụng dấu hiệu tương tự với nhãn hiệu được bảo hộ cho hàng hóa, dịch vụ trùng, tương tự hoặc liên quan tới hàng hóa, dịch vụ thuộc danh mục đăng ký kèm theo nhãn hiệu đó, nếu việc sử dụng có khả năng gây nhầm lẫn về nguồn gốc hàng hóa, dịch vụ;",
        simplifiedText:
          "Nhái logo/nhãn hiệu của người khác đến mức dễ gây nhầm lẫn là xâm phạm quyền nhãn hiệu, dù có chỉnh sửa đôi chút.",
      },
    },
  ],
};
