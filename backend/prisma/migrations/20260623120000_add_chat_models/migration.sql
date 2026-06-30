-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT','GROUP','DEPARTMENT','PROJECT');
CREATE TYPE "ChatMemberRole" AS ENUM ('ADMIN','MEMBER');
CREATE TYPE "MessageType" AS ENUM ('TEXT','FILE','IMAGE','SYSTEM');

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL, "name" TEXT, "type" "ChatRoomType" NOT NULL,
    "projectId" TEXT, "departmentId" TEXT, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_rooms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "chat_rooms_type_idx" ON "chat_rooms"("type");

CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL, "chatRoomId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER', "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_members_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_members_chatRoomId_userId_key" UNIQUE ("chatRoomId","userId")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL, "chatRoomId" TEXT NOT NULL, "senderId" TEXT,
    "body" TEXT NOT NULL, "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "messages_chatRoomId_createdAt_idx" ON "messages"("chatRoomId","createdAt");

CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL, "fileType" TEXT, "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_reads_messageId_userId_key" UNIQUE ("messageId","userId")
);
