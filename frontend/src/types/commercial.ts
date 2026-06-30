export type CommercialType = "proposals" | "quotations" | "contracts";
export type CommercialStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
export interface CommercialItem { id?: string; description: string; quantity: number; unitPrice: number; amount?: number; }
export interface CommercialDocument { id: string; type: "PROPOSAL" | "QUOTATION" | "CONTRACT"; documentNumber: string; title: string; status: CommercialStatus; currency: string; issueDate: string; validUntil?: string | null; scope?: string | null; terms?: string | null; subtotal: number; taxPercent: number; taxAmount: number; discountAmount: number; totalAmount: number; publicToken: string; client?: { id: string; name: string } | null; lead?: { id: string; companyName: string } | null; items: CommercialItem[]; }
export interface CommercialDashboard { total: number; draft: number; sent: number; accepted: number; acceptedValue: number; }
