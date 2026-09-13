// Demo situations for the 7 legal topics that currently lack situations in DB.
// Citations are based on authentic official Vietnamese legal documents from vanban.chinhphu.vn.

const ND144 = {
  documentNumber: "144/2021/NĐ-CP",
  title:
    "Nghị định 144/2021/NĐ-CP quy định xử phạt vi phạm hành chính trong lĩnh vực an ninh, trật tự, an toàn xã hội; phòng, chống tệ nạn xã hội; phòng cháy, chữa cháy; cứu nạn, cứu hộ; phòng, chống bạo lực gia đình",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=205096",
  issuedAt: "2021-12-31",
  effectiveFrom: "2022-01-01",
};

const ND147 = {
  documentNumber: "147/2024/NĐ-CP",
  title:
    "Nghị định 147/2024/NĐ-CP về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=211756",
  issuedAt: "2024-11-09",
  effectiveFrom: "2024-12-25",
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

const BLHS = {
  documentNumber: "100/2015/QH13",
  title: "Bộ luật Hình sự năm 2015 (sửa đổi, bổ sung năm 2017)",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=183073",
  issuedAt: "2015-11-27",
  effectiveFrom: "2018-01-01",
};

const ND52 = {
  documentNumber: "52/2024/NĐ-CP",
  title: "Nghị định 52/2024/NĐ-CP quy định về thanh toán không dùng tiền mặt",
  officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=210134",
  issuedAt: "2024-05-15",
  effectiveFrom: "2024-07-01",
};

export const demoSituations = [
  // ===== 03. BẠO LỰC HỌC ĐƯỜNG =====
  {
    slug: "blhd-co-lap-de-doa",
    topic: "Bạo lực học đường",
    icon: "FaUserShield",
    title: "Bị bạn học cô lập, tẩy chay và đe dọa bạo lực trong trường",
    tags: ["baoluchocduong", "batnat", "tongdai111", "xucpham"],
    legalBasis: "Điểm a khoản 1 Điều 7 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 1.000.000 đến 2.000.000 đồng đối với hành vi có lời nói, hành động khiêu khích, trêu ghẹo, xúc phạm danh dự, nhân phẩm của người khác (người từ 14 đến dưới 16 tuổi chỉ bị nhắc nhở, giáo dục; từ 16 đến dưới 18 tuổi mức phạt không quá một nửa).",
    remedy:
      "Bình tĩnh rời khỏi khu vực căng thẳng, không đáp trả bằng bạo lực; báo ngay cho thầy cô chủ nhiệm, ban giám hiệu hoặc gọi Tổng đài quốc gia bảo vệ trẻ em 111.",
    caseStudy:
      "Một nhóm học sinh lập hội nhóm cô lập và nhắn tin đe dọa một bạn cùng lớp. Sau khi em học sinh báo cho giáo viên chủ nhiệm kèm bằng chứng tin nhắn, nhà trường đã mời phụ huynh và phối hợp công an xã/phường răn đe, giáo dục.",
    source: ND144,
    provision: {
      article: "7",
      clause: "1",
      point: "a",
      originalText:
        "1. Phạt cảnh cáo hoặc phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi sau đây: a) Có lời nói, hành động khiêu khích, trêu ghẹo, xúc phạm, lăng mạ, bôi nhọ danh dự, nhân phẩm của người khác, trừ trường hợp quy định tại điểm b khoản 2 Điều 21 và Điều 54 Nghị định này;",
      simplifiedText:
        "Hành vi khiêu khích, xúc phạm, lăng mạ hoặc bôi nhọ danh dự, nhân phẩm người khác bị phạt từ 1.000.000 đến 2.000.000 đồng.",
    },
  },
  {
    slug: "blhd-danh-nhau-xo-xat",
    topic: "Bạo lực học đường",
    icon: "FaUserShield",
    title: "Đánh nhau hoặc tham gia tụ tập đánh nhau tại trường học",
    tags: ["danhnhau", "xoxat", "hocduong", "anninh"],
    legalBasis: "Điểm a khoản 5 Điều 7 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 5.000.000 đến 8.000.000 đồng đối với hành vi cố ý gây thương tích hoặc gây tổn hại cho sức khỏe của người khác nhưng chưa đến mức truy cứu trách nhiệm hình sự.",
    remedy:
      "Tuyệt đối không tham gia, can ngăn nếu an toàn và hô hoán nhờ bảo vệ trường can thiệp; không quay video xô xát để phát tán lên mạng xã hội.",
    caseStudy:
      "Do mâu thuẫn cá nhân, hai nhóm học sinh hẹn đánh nhau sau giờ học ở cổng trường. Công an cơ sở đã lập biên bản xử phạt hành chính đối với người trên 16 tuổi và chuyển hồ sơ giáo dục tại xã/phường.",
    source: ND144,
    provision: {
      article: "7",
      clause: "5",
      point: "a",
      originalText:
        "5. Phạt tiền từ 5.000.000 đồng đến 8.000.000 đồng đối với một trong những hành vi sau đây: a) Cố ý gây thương tích hoặc gây tổn hại cho sức khỏe của người khác nhưng không bị truy cứu trách nhiệm hình sự;",
      simplifiedText:
        "Cố ý đánh nhau, gây thương tích cho người khác chưa đến mức hình sự bị phạt từ 5 đến 8 triệu đồng.",
    },
  },
  {
    slug: "blhd-quay-clip-tung-mang",
    topic: "Bạo lực học đường",
    icon: "FaUserShield",
    title: "Bị quay clip đánh nhau rồi đăng tải lên mạng xã hội",
    tags: ["quayclip", "phattantin", "mangxahoi", "baolucmang"],
    legalBasis: "Khoản 1 Điều 101 Nghị định 15/2020/NĐ-CP và NĐ 174/2026/NĐ-CP",
    penalty:
      "Phạt tiền từ 10.000.000 đến 20.000.000 đồng đối với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (5.000.000 - 10.000.000 đồng); buộc gỡ bỏ thông tin vi phạm.",
    remedy:
      "Yêu cầu người đăng gỡ bài, chụp ảnh màn hình lưu bằng chứng và gửi đơn tố giác đến cơ quan công an nơi cư trú để xử lý hành vi phát tán hình ảnh xúc phạm danh dự.",
    caseStudy:
      "Một clip bạn bị bắt nạt bị chuyền tay chia sẻ trên TikTok và Zalo nhóm. Cơ quan chức năng đã xử phạt hành chính người đăng tải và yêu cầu các nền tảng gỡ bỏ clip triệt để.",
    source: ND174,
    provision: {
      article: "101",
      clause: "1",
      point: "a",
      originalText:
        "1. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;",
      simplifiedText:
        "Đăng tải clip đánh nhau, bôi nhọ danh dự bạn học lên mạng xã hội bị phạt 5-10 triệu đồng đối với cá nhân và buộc gỡ bỏ.",
    },
  },

  // ===== 04. AN NINH TRẬT TỰ =====
  {
    slug: "antt-gay-roi-cong-cong",
    topic: "An ninh trật tự",
    icon: "FaShieldHalved",
    title: "Gây rối trật tự công cộng, tụ tập hò hét nơi công cộng",
    tags: ["gayroitrattu", "anninhtrattu", "tratcongcong", "khudancu"],
    legalBasis: "Khoản 1 và khoản 2 Điều 7 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 1.000.000 đến 2.000.000 đồng đối với hành vi gây rối trật tự công cộng ở khu dân cư, trường học hoặc nơi sinh hoạt cộng đồng.",
    remedy:
      "Tự giác chấp hành quy định trật tự khu dân cư, giải tán nhóm tụ tập đêm khuya gây ồn ào; báo cơ quan công an phường/xã (113) khi phát hiện điểm nóng.",
    caseStudy:
      "Nhóm thanh thiếu niên thường xuyên tụ tập nẹt pô, bấm còi inh ỏi tại khu vực công viên lúc nửa đêm. Lực lượng tuần tra 113 đã mời về trụ sở lập biên bản xử phạt và nhắc nhở gia đình.",
    source: ND144,
    provision: {
      article: "7",
      clause: "2",
      point: "a",
      originalText:
        "2. Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi sau đây: a) Sử dụng rượu, bia, các chất kích thích gây mất trật tự công cộng; b) Tụ tập nhiều người ở nơi công cộng gây mất trật tự công cộng;",
      simplifiedText:
        "Tụ tập đông người gây mất trật tự công cộng, hò hét kích động bị phạt từ 1.000.000 đến 2.000.000 đồng.",
    },
  },
  {
    slug: "antt-dot-phao-no",
    topic: "An ninh trật tự",
    icon: "FaShieldHalved",
    title: "Đốt pháo nổ, tàng trữ và sử dụng pháo trái phép",
    tags: ["phaono", "tuchephao", "nguyhiem", "tet"],
    legalBasis: "Điểm i khoản 3 Điều 11 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 5.000.000 đến 10.000.000 đồng đối với hành vi sử dụng các loại pháo, thuốc pháo trái phép; tịch thu toàn bộ tang vật vi phạm.",
    remedy:
      "Chỉ sử dụng pháo hoa không tiếng nổ do nhà máy Z121 của Bộ Quốc phòng sản xuất; tuyệt đối không tự chế, mua bán hoặc đốt pháo nổ trên mạng.",
    caseStudy:
      "Hai học sinh mua hóa chất trên mạng về tự cuốn pháo nổ đốt Tết. Quả pháo phát nổ gây bỏng tay và vỡ kính nhà bên cạnh; hai bạn vừa bị phạt tiền vừa phải bồi thường thiệt hại.",
    source: ND144,
    provision: {
      article: "11",
      clause: "3",
      point: "i",
      originalText:
        "3. Phạt tiền từ 5.000.000 đồng đến 10.000.000 đồng đối với một trong những hành vi sau đây: ... i) Sử dụng các loại pháo, thuốc pháo trái phép;",
      simplifiedText:
        "Đốt pháo nổ, sử dụng pháo trái phép bị phạt từ 5 đến 10 triệu đồng và tịch thu tang vật.",
    },
  },
  {
    slug: "antt-mang-hung-khi",
    topic: "An ninh trật tự",
    icon: "FaShieldHalved",
    title: "Mang theo hung khí, dao tự chế nơi công cộng hoặc trường học",
    tags: ["hungkhi", "daotuche", "congcong", "canhbao"],
    legalBasis: "Điểm b khoản 4 Điều 11 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 3.000.000 đến 5.000.000 đồng và tịch thu tang vật hung khí; xử lý hình sự nếu mang theo nhằm mục đích gây rối hoặc cố ý gây thương tích.",
    remedy:
      "Tuyệt đối không tàng trữ, mang theo hoặc cất giấu hung khí trong cặp sách, xe máy; giao nộp vũ khí thô sơ cho cơ quan công an gần nhất.",
    caseStudy:
      "Khi kiểm tra hành chính cổng trường, lực lượng chức năng phát hiện trong cốp xe của học sinh có dao tự chế. Đối tượng bị lập biên bản tịch thu và thông báo về ban giám hiệu.",
    source: ND144,
    provision: {
      article: "11",
      clause: "4",
      point: "b",
      originalText:
        "4. Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng đối với một trong những hành vi sau đây: ... b) Vận chuyển, tàng trữ trái phép đồ chơi nguy hiểm bị cấm, vũ khí thô sơ, công cụ hỗ trợ;",
      simplifiedText:
        "Tàng trữ, mang theo vũ khí thô sơ, dao tự chế, đồ chơi nguy hiểm bị phạt từ 3 đến 5 triệu đồng và tịch thu.",
    },
  },

  // ===== 06. CHUYÊN ĐỀ PHÒNG CHỐNG MA TÚY =====
  {
    slug: "pcmt-ru-re-thu-matuy",
    topic: "Chuyên đề phòng chống ma túy",
    icon: "FaCapsules",
    title: "Bị rủ rê dùng thử thuốc lắc, cỏ Mỹ, ma túy 'nước vui', 'trà sữa'",
    tags: ["matuy", "thuoclac", "nuocvui", "phongchongmatuy"],
    legalBasis: "Khoản 1 Điều 23 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt cảnh cáo hoặc phạt tiền từ 1.000.000 đến 2.000.000 đồng đối với hành vi sử dụng trái phép chất ma túy; có thể bị áp dụng biện pháp cai nghiện bắt buộc nếu đủ điều kiện.",
    remedy:
      "Kiên quyết từ chối mọi lời mời chào dùng thử đồ uống, kẹo ngậm hoặc thuốc lạ ở quán bar, quán nước; báo ngay cho người thân hoặc cơ quan công an.",
    caseStudy:
      "Tại một buổi tiệc sinh nhật ở quán karaoke, một số đối tượng mang ra 'nước vui' pha sẵn mời cả nhóm uống thử để 'tăng độ hưng phấn'. Một bạn từ chối và bí mật báo người nhà đến đón an toàn.",
    source: ND144,
    provision: {
      article: "23",
      clause: "1",
      point: null,
      originalText:
        "1. Phạt cảnh cáo hoặc phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với hành vi sử dụng trái phép chất ma túy.",
      simplifiedText:
        "Sử dụng trái phép chất ma túy (kể cả dùng thử một lần) bị phạt tiền từ 1 đến 2 triệu đồng và quản lý theo dõi cai nghiện.",
    },
  },
  {
    slug: "pcmt-bong-cuoi-n2o",
    topic: "Chuyên đề phòng chống ma túy",
    icon: "FaCapsules",
    title: "Hút hoặc rủ nhau hít bóng cười khí N2O và tác hại pháp lý",
    tags: ["bongcuoi", "khi-n2o", "suckhoe", "nguyhiem"],
    legalBasis: "Điều 17 Nghị định 71/2019/NĐ-CP và Nghị định 144/2021/NĐ-CP",
    penalty:
      "Kinh doanh, chiết rót bóng cười trái phép bị phạt từ 10.000.000 đến 25.000.000 đồng; người tụ tập sử dụng gây mất an ninh trật tự bị xử phạt theo quy định pháp luật.",
    remedy:
      "Khí N2O trong bóng cười làm tổn thương hệ thần kinh tủy sống và gây ngạt khí; học sinh kiên quyết không dùng thử dù ở quán cà phê hay quán bar.",
    caseStudy:
      "Một nhóm học sinh rủ nhau mua bình khí N2O về phòng trọ để hút bóng cười. Sau một tuần sử dụng liên tục, một bạn bị tê liệt hai chân phải nhập viện cấp cứu tổn thương thần kinh.",
    source: ND144,
    provision: {
      article: "7",
      clause: "2",
      point: "a",
      originalText:
        "2. Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi sau đây: a) Sử dụng rượu, bia, các chất kích thích gây mất trật tự công cộng;",
      simplifiedText:
        "Hít bóng cười, sử dụng chất kích thích gây mất trật tự bị xử phạt hành chính; đối tượng cung cấp trái phép bị truy quét thu giữ bình khí nén.",
    },
  },
  {
    slug: "pcmt-pod-tinh-dau-matuy",
    topic: "Chuyên đề phòng chống ma túy",
    icon: "FaCapsules",
    title: "Sử dụng và buôn bán thuốc lá điện tử chứa tinh dầu ma túy ngụy trang",
    tags: ["pod", "thuocladientu", "tinhdaumatuy", "canhgiac"],
    legalBasis: "Điều 23 Nghị định 144/2021/NĐ-CP và Điều 251 Bộ luật Hình sự 2015",
    penalty:
      "Mua bán, tàng trữ tinh dầu pod chứa chất ma túy tổng hợp (như ADB-BUTINACA) bị truy cứu trách nhiệm hình sự về tội Mua bán trái phép chất ma túy (phạt tù từ 2 năm đến chung thân).",
    remedy:
      "Tuyệt đối không mua pod, tinh dầu thuốc lá điện tử không rõ nguồn gốc trôi nổi trên mạng; nếu phát hiện bạn học rao bán trong trường, cần báo ngay ban giám hiệu.",
    caseStudy:
      "Một học sinh được người quen giao bán pod giá rẻ có mùi lạ cho các bạn học. Qua xét nghiệm công an xác định tinh dầu có chứa chất ma túy mới ADB-BUTINACA; đối tượng cung cấp đã bị khởi tố hình sự.",
    source: BLHS,
    provision: {
      article: "251",
      clause: "1",
      point: null,
      originalText:
        "1. Người nào mua bán trái phép chất ma túy, thì bị phạt tù từ 02 năm đến 07 năm.",
      simplifiedText:
        "Hành vi mua bán tinh dầu thuốc lá điện tử chứa chất ma túy bị truy cứu trách nhiệm hình sự rất nghiêm khắc với mức tù từ 2 năm trở lên.",
    },
  },

  // ===== 07. CHUYÊN ĐỀ AN NINH TRẬT TỰ TRƯỜNG HỌC =====
  {
    slug: "anttth-nguoi-la-dot-nhap",
    topic: "Chuyên đề an ninh trật tự trường học",
    icon: "FaSchool",
    title: "Người lạ mặt trèo tường, trà trộn đột nhập khuôn viên trường học",
    tags: ["nguoila", "dotnhap", "truonghoc", "baove"],
    legalBasis: "Điểm a khoản 1 Điều 7 và Điều 15 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 1.000.000 đến 2.000.000 đồng đối với hành vi xâm nhập trái phép khu vực trụ sở cơ quan, trường học; xử lý hình sự nếu có mục đích trộm cắp hoặc quấy rối.",
    remedy:
      "Báo ngay cho nhân viên bảo vệ hoặc giáo viên trực ban; không tự ý tiếp cận người lạ có biểu hiện nghi vấn.",
    caseStudy:
      "Một đối tượng lạ mặt mặc đồng phục học sinh lẻn vào hành lang lớp học giờ ra chơi để tìm cách móc túi balo. Học sinh phát hiện kịp thời hô hoán bảo vệ bắt giữ bàn giao công an.",
    source: ND144,
    provision: {
      article: "7",
      clause: "1",
      point: "a",
      originalText:
        "1. Phạt cảnh cáo hoặc phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi sau đây: a) Vào khu vực cấm, địa điểm cấm, nơi đóng quân của lực lượng vũ trang nhân dân, trụ sở cơ quan nhà nước, tổ chức chính trị - xã hội mà không được phép;",
      simplifiedText:
        "Đột nhập, xâm nhập trái phép trụ sở trường học hoặc nơi cấm bị phạt từ 1 đến 2 triệu đồng.",
    },
  },
  {
    slug: "anttth-dap-pha-ban-ghe",
    topic: "Chuyên đề an ninh trật tự trường học",
    icon: "FaSchool",
    title: "Cố ý đập phá làm hư hỏng bàn ghế, máy móc thiết bị trường học",
    tags: ["phahoaitaisan", "banghe", "maychieu", "taisancong"],
    legalBasis: "Điểm a khoản 2 Điều 15 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 3.000.000 đến 5.000.000 đồng về hành vi hủy hoại hoặc cố ý làm hư hỏng tài sản; bồi thường toàn bộ chi phí sửa chữa, thay thế tài sản công.",
    remedy:
      "Tôn trọng tài sản công cộng của nhà trường; học sinh tự giác giữ gìn bàn ghế, máy chiếu, thiết bị thí nghiệm và nhắc nhở bạn bè không vẽ bậy, đập phá.",
    caseStudy:
      "Sau giờ tan trường, một nhóm nam sinh dùng gậy đập gãy cánh cửa lớp và làm hỏng máy chiếu. Nhà trường đã trích xuất camera, mời phụ huynh đến làm việc và yêu cầu bồi thường 15 triệu đồng kèm hạ hạnh kiểm.",
    source: ND144,
    provision: {
      article: "15",
      clause: "2",
      point: "a",
      originalText:
        "2. Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng đối với một trong những hành vi sau đây: a) Hủy hoại hoặc cố ý làm hư hỏng tài sản của cá nhân, tổ chức, trừ trường hợp vi phạm quy định tại điểm b khoản 3 Điều 21 Nghị định này;",
      simplifiedText:
        "Hành vi cố ý đập phá, làm hư hỏng bàn ghế, thiết bị trường học bị phạt từ 3 đến 5 triệu đồng và buộc bồi thường toàn bộ thiệt hại.",
    },
  },
  {
    slug: "anttth-trom-cap-bai-xe",
    topic: "Chuyên đề an ninh trật tự trường học",
    icon: "FaSchool",
    title: "Kẻ gian trà trộn bãi xe trường học trộm cắp tài sản, xe đạp điện",
    tags: ["tromcap", "baixetruonghoc", "xedapdien", "canhgiac"],
    legalBasis: "Điểm a khoản 1 Điều 15 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 2.000.000 đến 3.000.000 đồng đối với hành vi trộm cắp tài sản dưới 2 triệu đồng; nếu tài sản từ 2 triệu đồng trở lên bị truy cứu trách nhiệm hình sự (Điều 173 BLHS).",
    remedy:
      "Khóa cổ, khóa bánh xe cẩn thận, để xe đúng vị trí được phân công trong bãi giữ xe của trường; không để ví tiền, điện thoại trong cốp xe.",
    caseStudy:
      "Đối tượng bên ngoài trà trộn vào bãi xe giờ tan tầm để bẻ khóa xe đạp điện. Nhờ có thẻ xe và hệ thống camera giám sát của trường, bảo vệ đã giữ đối tượng và bàn giao cho công an phường.",
    source: ND144,
    provision: {
      article: "15",
      clause: "1",
      point: "a",
      originalText:
        "1. Phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng đối với một trong những hành vi sau đây: a) Trộm cắp tài sản, xâm phạm tài sản của cơ quan, tổ chức, doanh nghiệp, cá nhân;",
      simplifiedText:
        "Hành vi trộm cắp tài sản trong trường học bị phạt từ 2 đến 3 triệu đồng, nếu giá trị tài sản từ 2 triệu trở lên sẽ bị xử lý hình sự.",
    },
  },

  // ===== 08. CHUYÊN ĐỀ GAME VÀ KHÔNG GIAN MẠNG =====
  {
    slug: "game-gio-choi-duoi-18",
    topic: "Chuyên đề game và không gian mạng",
    icon: "FaGamepad",
    title: "Thời gian chơi trò chơi điện tử trực tuyến dưới 18 tuổi",
    tags: ["gameonline", "giochoi", "duoi18", "vanminhgame"],
    legalBasis: "Khoản 3 Điều 39 Nghị định 147/2024/NĐ-CP",
    penalty:
      "Doanh nghiệp phát hành trò chơi phải có hệ thống quản lý giờ chơi không quá 180 phút/ngày đối với người chơi dưới 18 tuổi; vi phạm có thể bị phạt tiền đến 50.000.000 đồng.",
    remedy:
      "Cân đối thời gian hợp lý giữa học tập và giải trí; tự đặt giới hạn không chơi game quá 1-2 tiếng mỗi ngày để bảo vệ thị lực và thể lực.",
    caseStudy:
      "Một bạn học sinh thức thâu đêm chơi game xếp hạng dẫn đến ngủ gật trong lớp và suy giảm thị lực. Gia đình đã cùng bạn cài đặt ứng dụng giới hạn thời gian màn hình trên điện thoại.",
    source: ND147,
    provision: {
      article: "39",
      clause: "3",
      point: null,
      originalText:
        "3. Doanh nghiệp cung cấp dịch vụ trò chơi điện tử G1 trên mạng có biện pháp kỹ thuật quản lý thời gian chơi của người chơi dưới 18 tuổi không quá 180 phút trong 24 giờ mỗi ngày đối với tất cả các trò chơi của doanh nghiệp.",
      simplifiedText:
        "Pháp luật giới hạn tổng thời gian chơi game online không quá 180 phút (3 tiếng) mỗi ngày đối với người dưới 18 tuổi để bảo vệ sức khỏe thanh thiếu niên.",
    },
  },
  {
    slug: "game-lua-dao-nap-the",
    topic: "Chuyên đề game và không gian mạng",
    icon: "FaGamepad",
    title: "Lừa đảo nạp thẻ hoặc mua bán vật phẩm, tài khoản game online",
    tags: ["napthegame", "luadaogame", "taikhoangame", "antoanmang"],
    legalBasis: "Điểm c khoản 1 Điều 15 Nghị định 144/2021/NĐ-CP và Điều 174 BLHS",
    penalty:
      "Hành vi dùng thủ đoạn gian dối để chiếm đoạt tài sản bị phạt từ 2.000.000 đến 3.000.000 đồng; nếu chiếm đoạt từ 2 triệu đồng trở lên bị xử lý hình sự (phạt tù từ 6 tháng đến 3 năm).",
    remedy:
      "Chỉ nạp thẻ qua cổng thanh toán chính thức của nhà phát hành game; không giao dịch tài khoản game qua mạng xã hội với người không quen biết.",
    caseStudy:
      "Một học sinh chuyển 1,5 triệu đồng tiền tiết kiệm cho người lạ trên Facebook để mua tài khoản game VIP, nhưng sau khi nhận tiền đối tượng lập tức chặn liên lạc. Em đã báo công an kèm sao kê ngân hàng.",
    source: ND144,
    provision: {
      article: "15",
      clause: "1",
      point: "c",
      originalText:
        "1. Phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng đối với một trong những hành vi sau đây: ... c) Dùng thủ đoạn gian dối hoặc bỏ trốn để chiếm đoạt tài sản của người khác;",
      simplifiedText:
        "Lừa đảo nạp thẻ ảo hoặc mua bán nick game chiếm đoạt tiền bị phạt từ 2 đến 3 triệu đồng; từ 2 triệu trở lên bị phạt tù hình sự.",
    },
  },
  {
    slug: "game-bai-doi-thuong-that",
    topic: "Chuyên đề game và không gian mạng",
    icon: "FaGamepad",
    title: "Chơi game bài đổi điểm lấy tiền thật hoặc thẻ cào điện thoại",
    tags: ["gamebai", "taixiu", "danhbac", "nohu"],
    legalBasis: "Khoản 2 Điều 28 Nghị định 144/2021/NĐ-CP và Điều 321 BLHS",
    penalty:
      "Hành vi đánh bạc trái phép dưới hình thức game bài đổi điểm ra tiền hoặc thẻ cào bị phạt từ 1.000.000 đến 2.000.000 đồng; số tiền cá cược từ 5 triệu đồng trở lên bị phạt tù từ 6 tháng đến 3 năm.",
    remedy:
      "Tránh xa các tựa game bài như tài xỉu, nổ hũ, bắn cá đổi tiền; đây là hình thức cờ bạc trá hình núp bóng game số.",
    caseStudy:
      "Hai nam sinh tải app game tài xỉu đổi thẻ cào điện thoại rồi bán lấy tiền mặt. Khi công an triệt phá đường dây đánh bạc online qua app, danh sách tài khoản của các bạn đều bị sao kê phục vụ điều tra.",
    source: ND144,
    provision: {
      article: "28",
      clause: "2",
      point: "a",
      originalText:
        "2. Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi đánh bạc sau đây: a) Đánh bạc trái phép bằng một trong các hình thức như xóc đĩa, tá lả, tổ tôm, tú lơ khơ, tam cúc, 3 cây, tứ sắc, đỏ đen, cờ thế, binh ấn độ, binh xập xám, tiến lên, tài xỉu hoặc các hình thức khác với mục đích được, thua bằng tiền, tài sản, hiện vật;",
      simplifiedText:
        "Game bài đổi thưởng ăn thua bằng tiền thật hoặc hiện vật bị coi là hành vi đánh bạc trái phép và bị xử phạt nghiêm minh.",
    },
  },

  // ===== 09. TÀI CHÍNH - TÍN DỤNG ĐEN =====
  {
    slug: "tctdd-vay-tien-qua-app",
    topic: "Tài chính - tín dụng đen",
    icon: "FaMoneyBillWave",
    title: "Vướng bẫy vay tiền qua app tín dụng đen với lãi suất cắt cổ",
    tags: ["tindungden", "appvaytien", "lainang", "bayno"],
    legalBasis: "Khoản 3 Điều 12 Nghị định 144/2021/NĐ-CP và Điều 201 BLHS",
    penalty:
      "Cho vay nặng lãi trong giao dịch dân sự với mức lãi suất gấp 5 lần quy định có thể bị phạt tiền đến 1 tỷ đồng hoặc phạt tù đến 3 năm; người vay cần tỉnh táo để không trở thành nạn nhân.",
    remedy:
      "Không bao giờ cài đặt các app vay tiền lạ yêu cầu quyền truy cập danh bạ, ảnh cá nhân; chia sẻ ngay với phụ huynh khi vướng vào nợ nần để được bảo vệ.",
    caseStudy:
      "Cần 3 triệu đồng mua điện thoại, một học sinh tải app vay online. Chỉ sau 2 tuần, số tiền bị nhân lên 30 triệu đồng với các khoản phí phạt vô lý; các đối tượng gọi điện đe dọa người thân trong danh bạ.",
    source: BLHS,
    provision: {
      article: "201",
      clause: "1",
      point: null,
      originalText:
        "1. Người nào trong giao dịch dân sự mà cho vay với mức lãi suất gấp 05 lần trở lên của mức lãi suất cao nhất quy định trong Bộ luật Dân sự, thu lợi bất chính từ 30.000.000 đồng đến dưới 100.000.000 đồng... thì bị phạt tiền từ 50.000.000 đồng đến 200.000.000 đồng hoặc phạt cải tạo không giam giữ đến 03 năm.",
      simplifiedText:
        "Cho vay nặng lãi qua app với lãi suất cắt cổ là tội phạm hình sự; các đối tượng vận hành app 'tín dụng đen' sẽ bị truy tố trước pháp luật.",
    },
  },
  {
    slug: "tctdd-mo-tai-khoan-thue",
    topic: "Tài chính - tín dụng đen",
    icon: "FaMoneyBillWave",
    title: "Đứng tên mở tài khoản ngân hàng thuê cho người lạ lấy tiền công",
    tags: ["motaikhoan", "banthe", "ruatien", "canhgiac"],
    legalBasis: "Điểm h khoản 2 Điều 23 Nghị định 52/2024/NĐ-CP",
    penalty:
      "Phạt tiền từ 40.000.000 đến 50.000.000 đồng đối với hành vi thuê, cho thuê, mua, bán tài khoản thanh toán; có thể bị truy cứu trách nhiệm hình sự với vai trò đồng phạm lừa đảo, rửa tiền.",
    remedy:
      "Tài khoản ngân hàng và thẻ căn cước là tài sản định danh cá nhân thiêng liêng; tuyệt đối không mở hộ, cho mượn hay bán cho bất kỳ ai với bất kỳ giá nào.",
    caseStudy:
      "Được hứa trả công 500.000đ/thẻ, sinh viên mở 3 tài khoản ngân hàng rồi giao cho người lạ. Sau đó tài khoản bị đối tượng dùng để nhận 2 tỷ đồng tiền lừa đảo trực tuyến; bạn bị công an mời làm việc vì tiếp tay rửa tiền.",
    source: ND52,
    provision: {
      article: "23",
      clause: "2",
      point: "h",
      originalText:
        "2. Phạt tiền từ 40.000.000 đồng đến 50.000.000 đồng đối với một trong các hành vi sau: ... h) Thuê, cho thuê, mượn, cho mượn tài khoản thanh toán, mua, bán thông tin tài khoản thanh toán với số lượng từ 01 tài khoản thanh toán đến dưới 10 tài khoản thanh toán mà chưa đến mức bị truy cứu trách nhiệm hình sự;",
      simplifiedText:
        "Mở hộ, cho thuê hoặc bán tài khoản ngân hàng bị phạt tiền rất nặng từ 40 đến 50 triệu đồng và có nguy cơ bị xử lý hình sự vì tiếp tay cho lừa đảo.",
    },
  },
  {
    slug: "tctdd-khung-bo-doi-no",
    topic: "Tài chính - tín dụng đen",
    icon: "FaMoneyBillWave",
    title: "Đối tượng cho vay nặng lãi khủng bố tin nhắn, gọi điện đe dọa đòi nợ",
    tags: ["doinothue", "khungbotinnhan", "dedoa", "baocongan"],
    legalBasis: "Điểm a khoản 3 Điều 7 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 3.000.000 đến 5.000.000 đồng đối với hành vi đe dọa bạo lực hoặc xúc phạm uy tín người khác để đòi nợ; xử lý hình sự về tội Cưỡng đoạt tài sản nếu có hành vi đe dọa dùng vũ lực.",
    remedy:
      "Chặn các số điện thoại quấy rối, ghi âm cuộc gọi và lưu giữ tin nhắn đe dọa; gửi đơn trình báo đến cơ quan công an quận/huyện để được can thiệp bảo vệ.",
    caseStudy:
      "Phụ huynh và giáo viên chủ nhiệm liên tục bị các số lạ gọi điện đe dọa vì một học sinh vay tiền app đen. Nhà trường đã phối hợp với công an địa phương xác minh nguồn cuộc gọi và ngăn chặn hành vi khủng bố tinh thần.",
    source: ND144,
    provision: {
      article: "7",
      clause: "3",
      point: "a",
      originalText:
        "3. Phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng đối với một trong những hành vi sau đây: a) Có hành vi khiêu khích, trêu ghẹo, xúc phạm, lăng mạ, bôi nhọ danh dự, nhân phẩm của người khác;",
      simplifiedText:
        "Gọi điện, nhắn tin khủng bố đòi nợ, bôi nhọ hình ảnh trên mạng là hành vi vi phạm pháp luật và bị xử lý hình sự nếu có dấu hiệu cưỡng đoạt tài sản.",
    },
  },

  // ===== 10. PHÒNG CHỐNG TỆ NẠN XÃ HỘI =====
  {
    slug: "pctnxh-danh-bai-an-tien",
    topic: "Phòng chống tệ nạn xã hội",
    icon: "FaTriangleExclamation",
    title: "Chơi bài tây ăn tiền ăn thua bạc bịp trong học sinh, sinh viên",
    tags: ["danhbac", "tulokho", "cobac", "hocsinh"],
    legalBasis: "Khoản 2 Điều 28 Nghị định 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 1.000.000 đến 2.000.000 đồng đối với hành vi đánh bạc trái phép (dưới 5 triệu đồng); tịch thu toàn bộ tiền và tang vật dùng để đánh bạc.",
    remedy:
      "Giải trí lành mạnh bằng các môn thể thao, cờ vua, cờ tướng trí tuệ; không tham gia bất kỳ trò chơi nào có ăn thua bằng tiền mặt hay hiện vật.",
    caseStudy:
      "Một nhóm học sinh chơi bài tú lơ khơ ăn tiền ở quán trà đá sau giờ học. Công an phường kiểm tra, lập biên bản tạm giữ số tiền 800.000đ và ra quyết định xử phạt hành chính các cá nhân trên 16 tuổi.",
    source: ND144,
    provision: {
      article: "28",
      clause: "2",
      point: "a",
      originalText:
        "2. Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi đánh bạc sau đây: a) Đánh bạc trái phép bằng một trong các hình thức như xóc đĩa, tá lả, tổ tôm, tú lơ khơ, tam cúc, 3 cây, tứ sắc, đỏ đen, cờ thế, binh ấn độ, binh xập xám, tiến lên, tài xỉu hoặc các hình thức khác với mục đích được, thua bằng tiền, tài sản, hiện vật;",
      simplifiedText:
        "Đánh bài ăn tiền dù số tiền nhỏ vài chục nghìn đồng vẫn bị coi là đánh bạc trái phép và bị xử phạt từ 1 đến 2 triệu đồng.",
    },
  },
  {
    slug: "pctnxh-ca-do-bong-da",
    topic: "Phòng chống tệ nạn xã hội",
    icon: "FaTriangleExclamation",
    title: "Tham gia cá cược cá độ bóng đá độ tiền trong mùa giải",
    tags: ["cadobongda", "cacuoc", "cobac", "phongngua"],
    legalBasis: "Điểm c khoản 2 Điều 28 Nghị định 144/2021/NĐ-CP và Điều 321 BLHS",
    penalty:
      "Cá độ bóng đá bằng tiền hoặc hiện vật bị phạt từ 1.000.000 đến 2.000.000 đồng; nếu tổng số tiền cá cược từ 5.000.000 đồng trở lên sẽ bị phạt tù từ 6 tháng đến 7 năm.",
    remedy:
      "Xem bóng đá với tinh thần thể thao trong sáng; kiên quyết từ chối những kèo cá độ 'vui', 'ăn ly nước ngọt' vì đó là bước đầu dẫn tới nghiện cờ bạc.",
    caseStudy:
      "Học sinh tham gia vào trang web cá độ bóng đá qua mạng theo rủ rê của bạn bè, ban đầu thắng vài trăm nghìn sau đó thua hơn 20 triệu đồng. Em phải giấu gia đình và rơi vào khủng hoảng tâm lý nghiêm trọng.",
    source: ND144,
    provision: {
      article: "28",
      clause: "2",
      point: "c",
      originalText:
        "2. Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng đối với một trong những hành vi đánh bạc sau đây: ... c) Cá cược trái phép trong hoạt động thi đấu thể thao, vui chơi giải trí hoặc các hoạt động khác;",
      simplifiedText:
        "Cá cược, cá độ bóng đá ăn tiền bị xử phạt từ 1 đến 2 triệu đồng; nếu số tiền từ 5 triệu đồng trở lên sẽ bị truy cứu trách nhiệm hình sự.",
    },
  },
  {
    slug: "pctnxh-boi-toan-me-tin",
    topic: "Phòng chống tệ nạn xã hội",
    icon: "FaTriangleExclamation",
    title: "Bị dụ dỗ vào các hội nhóm bói toán mê tín dị đoan lừa đảo giải hạn",
    tags: ["boitoan", "tarot", "metindidoan", "luadaotamlinh"],
    legalBasis: "Điểm a khoản 2 Điều 15 Nghị định 158/2013/NĐ-CP và NĐ 144/2021/NĐ-CP",
    penalty:
      "Phạt tiền từ 3.000.000 đến 5.000.000 đồng đối với hành vi lợi dụng hoạt động lên đồng, xem bói, gọi hồn để trục lợi; lừa đảo chiếm đoạt tài sản lớn bị truy cứu trách nhiệm hình sự.",
    remedy:
      "Giữ vững tư duy khoa học, tin tưởng vào năng lực học tập của bản thân; không tin vào bùa ngải, giải hạn thi cử trên mạng xã hội.",
    caseStudy:
      "Trước kỳ thi tốt nghiệp, một nữ sinh lo lắng nên tìm đến dịch vụ bói bài tarot trên TikTok và bị yêu cầu chuyển 4 triệu đồng để 'làm lễ cúng đỗ đạt'. Sau khi chuyển tiền tài khoản bói toán biến mất.",
    source: ND144,
    provision: {
      article: "15",
      clause: "1",
      point: "c",
      originalText:
        "1. Phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng đối với một trong những hành vi sau đây: ... c) Dùng thủ đoạn gian dối hoặc bỏ trốn để chiếm đoạt tài sản của người khác;",
      simplifiedText:
        "Lợi dụng mê tín dị đoan, bói toán để lừa tiền người khác bị xử phạt hành chính và bồi thường; số tiền từ 2 triệu trở lên bị truy tố hình sự tội lừa đảo.",
    },
  },
];
