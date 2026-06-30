-- Add WorkLog and DailyReport models
CREATE TABLE IF NOT EXISTS "work_logs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationMins" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "work_logs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "work_logs_employeeId_date_idx" ON "work_logs"("employeeId", "date");
CREATE INDEX IF NOT EXISTS "work_logs_taskId_idx" ON "work_logs"("taskId");
CREATE INDEX IF NOT EXISTS "work_logs_date_idx" ON "work_logs"("date");

CREATE TABLE IF NOT EXISTS "daily_reports" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "highlights" TEXT,
    "blockers" TEXT,
    "mood" INTEGER DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_reports_employeeId_date_key" UNIQUE ("employeeId", "date"),
    CONSTRAINT "daily_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
