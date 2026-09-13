import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
} from "docx";
import type { ComplaintFormState } from "./complaint-form-state";

export async function buildComplaintDocx(
  state: ComplaintFormState,
): Promise<Blob | Buffer> {
  const c = state.complainant;
  const a = state.accused;
  const inc = state.incident;
  const ev = state.evidence;
  const r = state.recipient;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2cm
              bottom: 1134,
              left: 1701, // 3cm
              right: 1134, // 2cm
            },
          },
        },
        children: [
          // Quốc hiệu & Tiêu ngữ
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                bold: true,
                size: 24, // 12pt
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Độc lập - Tự do - Hạnh phúc",
                bold: true,
                size: 26, // 13pt
                font: "Times New Roman",
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Ngày tháng năm
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `..........., ${state.createdDate || "ngày ..... tháng .... năm....."}`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Tiêu đề đơn
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ĐƠN TỐ GIÁC TỘI PHẠM",
                bold: true,
                size: 30, // 15pt
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `(Về hành vi: ${inc.behaviorSummary || "…………………………"})`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Kính gửi
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: "Kính gửi: ",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: r.name || "Cơ quan điều tra, Công an quận/huyện ………………………",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Người làm đơn
          new Paragraph({
            children: [
              new TextRun({ text: "Tôi tên là: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.fullName || "…………………………………………", bold: Boolean(c.fullName), font: "Times New Roman", size: 24 }),
              new TextRun({ text: "    Sinh năm: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.birthYear || c.birthDate || "……………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CMND/CCCD số: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idNumber || "…………………………", font: "Times New Roman", size: 24 }),
              new TextRun({ text: "  do: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idIssuePlace || "Cục Cảnh sát QLHC về TTXH", font: "Times New Roman", size: 24 }),
              new TextRun({ text: "  cấp ngày: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.idIssueDate || "………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hộ khẩu thường trú: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.permanentAddress || "…………………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hiện đang cư ngụ tại: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.currentAddress || c.permanentAddress || "…………………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Số điện thoại liên hệ: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: c.phone || "……………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Nội dung tố giác đối tượng
          new Paragraph({
            children: [
              new TextRun({
                text: "Nay tôi làm đơn này kính mong quý cơ quan tiến hành điều tra làm rõ hành vi vi phạm của đối tượng:",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Họ và tên đối tượng: ", font: "Times New Roman", size: 24, bold: true }),
              new TextRun({ text: a.fullName || "…………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Địa chỉ / Tài khoản / Nơi cư ngụ: ", font: "Times New Roman", size: 24 }),
              new TextRun({ text: a.addressOrAccount || "………………………………………………………………………………", font: "Times New Roman", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Hành vi vi phạm & Diễn biến
          new Paragraph({
            children: [
              new TextRun({
                text: "Đối tượng này đã có hành vi vi phạm như sau:",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: inc.chronology || inc.behaviorSummary || "………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Chứng cứ chứng minh
          new Paragraph({
            children: [
              new TextRun({
                text: "Chứng cứ chứng minh kèm theo (nếu có):",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          ...(ev.items.length > 0
            ? ev.items.map(
                (item, idx) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `  ${idx + 1}. ${item}`,
                        font: "Times New Roman",
                        size: 24,
                      }),
                    ],
                  }),
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "- ………………………………………………………………………………………………………………………",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
              ]),
          new Paragraph({ text: "" }),

          // Cam đoan
          new Paragraph({
            children: [
              new TextRun({
                text: "Từ vụ việc xảy ra nêu trên, tôi cho rằng cá nhân này đã có hành vi vi phạm pháp luật. Kính đề nghị quý cơ quan điều tra làm rõ hành vi trên để đảm bảo quyền lợi hợp pháp của tôi và giữ vững an ninh, trật tự trên địa bàn.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Tôi xin cam đoan những gì tôi vừa trình bày là sự thật và hoàn toàn chịu trách nhiệm trước pháp luật về những lời khai trên.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Xin chân thành cảm ơn./.",
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Chữ ký
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Người làm đơn               ",
                bold: true,
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "(Ký và ghi rõ họ tên)         ",
                italics: true,
                font: "Times New Roman",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: c.fullName ? `${c.fullName}               ` : "………………………………………         ",
                bold: Boolean(c.fullName),
                font: "Times New Roman",
                size: 24,
              }),
            ],
          }),
        ],
      },
    ],
  });

  if (typeof window !== "undefined") {
    return await Packer.toBlob(doc);
  }
  return await Packer.toBuffer(doc);
}

export function downloadDocxInBrowser(blob: Blob, filename = "don-to-giac-toi-pham.docx"): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
