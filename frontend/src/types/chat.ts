export interface ChatMember {
  id: string;
  chatRoomId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  lastReadAt?: string | null;
  joinedAt: string;
  user: { id: string; name: string; email: string; employee?: { id: string; employeeCode: string } | null };
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  user: { id: string; name: string; email: string };
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId?: string | null;
  sender?: { id: string; name: string; email: string; employee?: { id: string; employeeCode: string } | null } | null;
  body: string;
  messageType: "TEXT" | "FILE" | "IMAGE" | "SYSTEM";
  attachments: MessageAttachment[];
  reads: MessageRead[];
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  name?: string | null;
  type: "DIRECT" | "GROUP" | "DEPARTMENT" | "PROJECT";
  projectId?: string | null;
  departmentId?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  members: ChatMember[];
  messages?: Message[];
  _count?: { messages: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  employee?: { id: string; employeeCode: string; department?: { name: string } | null } | null;
}
