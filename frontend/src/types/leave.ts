export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  annualQuota: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  credited: number;
  used: number;
  pending: number;
  remaining: number;
  leaveType?: LeaveType;
  employee?: {
    user?: {
      name: string;
      email: string;
    };
  };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dayType: string;
  reason?: string | null;
  status: string;
  teamLeadRemarks?: string | null;
  hrRemarks?: string | null;
  rejectedReason?: string | null;
  employee?: {
    user?: {
      name: string;
      email: string;
    };
  };
  leaveType?: LeaveType;
  createdAt: string;
}

export interface LeaveDashboard {
  totalLeaveTypes: number;
  totalLeaveRequests: number;
  pendingRequests: number;
  teamLeadApprovedRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
}