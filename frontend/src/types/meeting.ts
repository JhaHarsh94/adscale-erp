export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string; employee?: { id: string; employeeCode: string } | null } | null;
  joinedAt: string;
  leftAt?: string | null;
}

export interface MeetingRecording {
  id: string;
  meetingId: string;
  fileUrl: string;
  fileSize?: number | null;
  duration?: number | null;
  notes?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface VideoMeeting {
  id: string;
  title: string;
  description?: string | null;
  roomName: string;
  meetingType: "INSTANT" | "SCHEDULED";
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  participants: MeetingParticipant[];
  recordings: MeetingRecording[];
  _count?: { participants: number; recordings: number };
  createdAt: string;
}

export interface MeetingDashboard {
  total: number;
  scheduled: number;
  active: number;
  ended: number;
  myMeetings: number;
}
