export interface ComplainantInfo {
  fullName: string;
  birthYear: string;
  birthDate?: string;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  permanentAddress: string;
  currentAddress: string;
  phone: string;
}

export interface AccusedInfo {
  fullName: string;
  addressOrAccount: string;
  relationship: string;
}

export interface IncidentInfo {
  behaviorSummary: string;
  occurrenceTime: string;
  location: string;
  chronology: string;
  damageOrLoss: string;
}

export interface EvidenceInfo {
  items: string[];
  witnessInfo?: string;
}

export interface RecipientAuthority {
  name: string;
  level: "xa_phuong" | "huyen" | "tinh";
  address: string;
  phone?: string;
}

export interface ComplaintFormState {
  complainant: ComplainantInfo;
  accused: AccusedInfo;
  incident: IncidentInfo;
  evidence: EvidenceInfo;
  recipient: RecipientAuthority;
  createdDate: string;
}

const STORAGE_KEY = "safe_legal_complaint_form_v1";

export function createEmptyComplaintForm(): ComplaintFormState {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  return {
    complainant: {
      fullName: "",
      birthYear: "",
      birthDate: "",
      idNumber: "",
      idIssueDate: "",
      idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
      permanentAddress: "",
      currentAddress: "",
      phone: "",
    },
    accused: {
      fullName: "",
      addressOrAccount: "",
      relationship: "",
    },
    incident: {
      behaviorSummary: "",
      occurrenceTime: "",
      location: "",
      chronology: "",
      damageOrLoss: "",
    },
    evidence: {
      items: [],
      witnessInfo: "",
    },
    recipient: {
      name: "Cơ quan Cảnh sát điều tra Công an...",
      level: "huyen",
      address: "",
      phone: "",
    },
    createdDate: `ngày ${day} tháng ${month} năm ${year}`,
  };
}

export function calculateFormCompletionProgress(state: ComplaintFormState): {
  completedCount: number;
  totalCount: number;
  percentage: number;
} {
  const checkpoints = [
    Boolean(state.complainant.fullName && state.complainant.idNumber),
    Boolean(state.complainant.permanentAddress || state.complainant.currentAddress),
    Boolean(state.accused.fullName || state.accused.addressOrAccount),
    Boolean(state.incident.behaviorSummary),
    Boolean(state.incident.chronology || state.incident.location),
    Boolean(state.evidence.items.length > 0 || state.incident.damageOrLoss),
    Boolean(state.recipient.name && state.recipient.name !== "Cơ quan Cảnh sát điều tra Công an..."),
  ];

  const completedCount = checkpoints.filter(Boolean).length;
  const totalCount = checkpoints.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return { completedCount, totalCount, percentage };
}

export function saveComplaintStateLocal(state: ComplaintFormState): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Gracefully handle storage errors
  }
}

export function loadComplaintStateLocal(): ComplaintFormState | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearComplaintStateLocal(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
