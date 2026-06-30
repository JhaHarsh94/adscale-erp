export interface MeetingAgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  durationMins?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingAttendanceRecord {
  id: string;
  meetingId: string;
  employeeId: string;
  attended: boolean;
  joinedAt?: string | null;
  leftAt?: string | null;
  notes?: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    user: { id: string; name: string; email: string };
  } | null;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  content: string;
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  description: string;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeCode: string;
    user: { id: string; name: string; email: string };
  } | null;
  dueDate?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: string | null;
  notes?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormalMeeting {
  id: string;
  title: string;
  description?: string | null;
  meetingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdBy?: { id: string; name: string; email: string } | null;
  agendaItems: MeetingAgendaItem[];
  attendance: MeetingAttendanceRecord[];
  minutes?: MeetingMinutes | null;
  actionItems: MeetingActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingManagementDashboard {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  myMeetings: number;
}
