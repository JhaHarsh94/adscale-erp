export interface TicketCategory {
  id: string;
  name: string;
  description?: string | null;
  defaultSlaHours: number;
  isActive: boolean;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string | null;
  body: string;
  isInternal: boolean;
  author?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface TicketStatusLog {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  remarks?: string | null;
  changedBy?: { name: string } | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "RESOLVED" | "CLOSED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  source: "INTERNAL" | "CLIENT";
  dueAt?: string | null;
  category?: TicketCategory | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string; projectCode: string } | null;
  assignedTo?: { id: string; employeeCode: string; user: { name: string; email: string } } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  comments: TicketComment[];
  statusLogs: TicketStatusLog[];
  createdAt: string;
}

export interface TicketDashboard {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  waitingOnClient: number;
  resolved: number;
  closed: number;
  escalated: number;
}
