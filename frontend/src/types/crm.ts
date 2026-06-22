import type { Employee } from "./employee";

export interface CrmDashboard {
  totalLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  activeClients: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  openPipelineValue: number;
  wonPipelineValue: number;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  source: string;
  status: string;
  estimatedValue?: number | null;
  notes?: string | null;
  assignedToId?: string | null;
  assignedTo?: Employee | null;
  convertedClientId?: string | null;
  convertedClient?: Client | null;
  convertedAt?: string | null;
  createdAt: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
  notes?: string | null;
}

export interface Client {
  id: string;
  name: string;
  status: string;
  source: string;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  retainerValue?: number | null;
  contractValue?: number | null;
  accountOwnerId?: string | null;
  accountOwner?: Employee | null;
  contacts?: ClientContact[];
  createdAt: string;
}

export interface FollowUp {
  id: string;
  leadId?: string | null;
  clientId?: string | null;
  subject: string;
  type: string;
  status: string;
  scheduledAt: string;
  completedAt?: string | null;
  outcome?: string | null;
  notes?: string | null;
  lead?: Lead | null;
  client?: Client | null;
  assignedTo?: Employee | null;
}

export interface SalesPipelineItem {
  id: string;
  name: string;
  stage: string;
  amount?: number | null;
  probability: number;
  expectedCloseDate?: string | null;
  closedAt?: string | null;
  notes?: string | null;
  lead?: Lead | null;
  client?: Client | null;
  owner?: Employee | null;
}
