export interface WorkLog {
  id: string;
  employeeId: string;
  taskId?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMins: number;
  description: string | null;
  billable: boolean;
  approved: boolean;
  approvedById?: string | null;
  approvedAt?: string | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  employee?: { id: string; employeeCode: string; user: { name: string; email: string } } | null;
  task?: { id: string; taskNumber: string; title: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogDashboard {
  totalLogs: number;
  todayLogs: number;
  todayHours: number;
  pendingApprovals: number;
  recentLogs: WorkLog[];
}

export interface TodayWorkLogs {
  logs: WorkLog[];
  totalMins: number;
  totalHours: number;
}

export interface DailyReportGroup {
  date: string;
  totalMins: number;
  totalHours: number;
  count: number;
  billableMins: number;
  logs: WorkLog[];
}
