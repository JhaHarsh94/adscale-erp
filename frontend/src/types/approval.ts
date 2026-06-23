export interface ApprovalStep {
  id: string;
  approvalId: string;
  stepOrder: number;
  reviewerId?: string | null;
  reviewer?: { id: string; employeeCode: string; user: { name: string; email: string } } | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  comments?: string | null;
  actedAt?: string | null;
  createdAt: string;
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  body: string;
  createdAt: string;
}

export interface ApprovalFile {
  id: string;
  approvalId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Approval {
  id: string;
  title: string;
  description?: string | null;
  type: "DESIGN" | "VIDEO" | "WEBSITE" | "CONTENT" | "REPORT" | "CAMPAIGN" | "PROPOSAL" | "OTHER";
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REVISIONS_REQUESTED" | "REJECTED" | "CANCELLED";
  priority: string;
  createdBy?: { id: string; name: string; email: string } | null;
  steps: ApprovalStep[];
  comments: ApprovalComment[];
  files: ApprovalFile[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDashboard {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  myRequests: number;
  pendingMyReview: number;
}
