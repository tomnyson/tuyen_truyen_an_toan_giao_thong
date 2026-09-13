export interface ParsedCccdData {
  idNumber: string;
  oldIdNumber?: string;
  fullName: string;
  birthDate: string;
  birthYear: string;
  gender: string;
  permanentAddress: string;
  issueDate: string;
  issuePlace: string;
}

export function formatCccdDate(rawDate: string): string {
  if (!rawDate || typeof rawDate !== "string") return "";
  const cleaned = rawDate.trim();
  if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) return "";
  const day = cleaned.slice(0, 2);
  const month = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);
  return `${day}/${month}/${year}`;
}

export function parseCccdQrCode(qrText: string): ParsedCccdData | null {
  if (!qrText || typeof qrText !== "string") return null;
  const parts = qrText.split("|").map((p) => p.trim());
  if (parts.length < 6) return null;

  const idNumber = parts[0];
  if (!idNumber || idNumber.length < 9) return null;

  const oldIdNumber = parts[1] || undefined;
  const fullName = parts[2] || "";
  const rawBirth = parts[3] || "";
  const gender = parts[4] || "";
  const permanentAddress = parts[5] || "";
  const rawIssueDate = parts[6] || "";

  const birthDate = formatCccdDate(rawBirth);
  const birthYear = rawBirth.length === 8 ? rawBirth.slice(4, 8) : "";
  const issueDate = formatCccdDate(rawIssueDate);

  return {
    idNumber,
    oldIdNumber,
    fullName,
    birthDate,
    birthYear,
    gender,
    permanentAddress,
    issueDate,
    issuePlace: "Cục Cảnh sát QLHC về TTXH",
  };
}
