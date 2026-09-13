// Dữ liệu văn bản pháp luật mẫu từ Cổng thông tin điện tử Chính phủ & VBPL
// Phục vụ tra cứu học tập, nghiên cứu và kiểm thử công cụ kiểm tra link (Check Link).

export type DemoLegalDocument = {
  title: string;
  documentNumber: string;
  documentType: "luat" | "nghi_dinh" | "thong_tu" | "quyet_dinh" | "van_ban_hop_nhat" | "khac";
  topic: string;
  issuingAuthority: string;
  officialUrl: string;
  summary: string;
  effectivityStatus: "in_force" | "expired" | "superseded" | "draft";
  status: "published" | "draft" | "archived";
  displayOrder: number;
};

export const demoLegalDocuments: readonly DemoLegalDocument[] = [
  {
    title: "Luật Trật tự, an toàn giao thông đường bộ năm 2024",
    documentNumber: "36/2024/QH15",
    documentType: "luat",
    topic: "Giao thông",
    issuingAuthority: "Quốc hội",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=210543",
    summary: "Quy định toàn diện về quy tắc giao thông, phương tiện, người điều khiển và trật tự an toàn giao thông đường bộ (có hiệu lực từ 01/01/2025).",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 10,
  },
  {
    title: "Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông đường bộ",
    documentNumber: "168/2024/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "Giao thông",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=212167",
    summary: "Quy định chi tiết mức phạt hành chính các lỗi giao thông đường bộ; trừ điểm và phục hồi điểm giấy phép lái xe (hiệu lực từ 01/01/2025).",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 20,
  },
  {
    title: "Nghị định 144/2021/NĐ-CP quy định xử phạt vi phạm hành chính trong lĩnh vực an ninh, trật tự, tệ nạn xã hội, phòng chống bạo lực học đường",
    documentNumber: "144/2021/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "An ninh trật tự",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=205096",
    summary: "Xử phạt hành vi gây rối trật tự công cộng, xúc phạm danh dự bạn học, sử dụng pháo trái phép, tệ nạn ma túy và đánh bạc.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 30,
  },
  {
    title: "Nghị định 147/2024/NĐ-CP về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng",
    documentNumber: "147/2024/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "Chuyên đề game và không gian mạng",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=211756",
    summary: "Quy định biện pháp quản lý dịch vụ mạng xã hội, trò chơi điện tử trực tuyến, giới hạn giờ chơi game dưới 180 phút/ngày đối với trẻ vị thành niên.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 40,
  },
  {
    title: "Luật An ninh mạng năm 2018",
    documentNumber: "24/2018/QH14",
    documentType: "luat",
    topic: "Mạng xã hội",
    issuingAuthority: "Quốc hội",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=206114",
    summary: "Bảo vệ an ninh quốc gia và trật tự an toàn xã hội trên không gian mạng; bảo vệ bí mật đời tư và dữ liệu cá nhân của công dân.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 50,
  },
  {
    title: "Nghị định 174/2026/NĐ-CP xử phạt vi phạm hành chính trong lĩnh vực bưu chính, viễn thông và giao dịch điện tử",
    documentNumber: "174/2026/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "Mạng xã hội",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?classid=1&docid=218185&pageid=27160&typegroupid=4",
    summary: "Xử phạt hành vi cung cấp tin giả, thông tin sai sự thật, xúc phạm uy tín cá nhân trên mạng xã hội (thay thế Nghị định 15/2020).",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 60,
  },
  {
    title: "Luật Phòng, chống ma túy năm 2021",
    documentNumber: "73/2021/QH14",
    documentType: "luat",
    topic: "Chuyên đề phòng chống ma túy",
    issuingAuthority: "Quốc hội",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=203028",
    summary: "Quy định về phòng ngừa, ngăn chặn, đấu tranh chống tội phạm và tệ nạn ma túy; kiểm soát các hoạt động hợp pháp liên quan đến ma túy.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 70,
  },
  {
    title: "Văn bản hợp nhất 155/VBHN-VPQH — Luật Sở hữu trí tuệ",
    documentNumber: "155/VBHN-VPQH",
    documentType: "van_ban_hop_nhat",
    topic: "Sở hữu trí tuệ",
    issuingAuthority: "Văn phòng Quốc hội",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=215309",
    summary: "Hợp nhất các quy định pháp luật về quyền tác giả, quyền liên quan, sở hữu công nghiệp và bảo vệ tác phẩm sáng tạo học đường.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 80,
  },
  {
    title: "Nghị định 52/2024/NĐ-CP quy định về thanh toán không dùng tiền mặt",
    documentNumber: "52/2024/NĐ-CP",
    documentType: "nghi_dinh",
    topic: "Tài chính - tín dụng đen",
    issuingAuthority: "Chính phủ",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=210134",
    summary: "Nghiêm cấm thuê, cho thuê, mua bán tài khoản thanh toán; tăng cường an toàn bảo mật và phòng chống lừa đảo, tín dụng đen.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 90,
  },
  {
    title: "Thông tư 06/2019/TT-BGDĐT Quy định Quy tắc ứng xử trong cơ sở giáo dục",
    documentNumber: "06/2019/TT-BGDĐT",
    documentType: "thong_tu",
    topic: "Chuyên đề an ninh trật tự trường học",
    issuingAuthority: "Bộ Giáo dục và Đào tạo",
    officialUrl: "https://vanban.chinhphu.vn/?pageid=27160&docid=196884",
    summary: "Xây dựng văn hóa học đường lành mạnh, thân thiện; phòng ngừa và xử lý hành vi bạo lực học đường giữa người học với nhau.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 100,
  },
  // 1 văn bản demo lỗi 404 để kiểm thử công cụ Check Link và hiển thị cảnh báo cho Admin
  {
    title: "Văn bản thử nghiệm kiểm tra link chết (Mô phỏng liên kết 404)",
    documentNumber: "DEMO-404/TEST",
    documentType: "khac",
    topic: "Phòng chống tệ nạn xã hội",
    issuingAuthority: "Cơ quan kiểm thử",
    officialUrl: "https://vanban.chinhphu.vn/demo-test-link-404-canh-bao-admin",
    summary: "Văn bản mẫu với đường link không tồn tại để kiểm tra công cụ phát hiện link 404 và hiển thị cảnh báo trực quan cho Quản trị viên.",
    effectivityStatus: "in_force",
    status: "published",
    displayOrder: 999,
  },
];
