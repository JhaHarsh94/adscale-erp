-- CreateTable
CREATE TABLE "reporting_hierarchy" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportsToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reporting_hierarchy_employeeId_key" ON "reporting_hierarchy"("employeeId");

-- AddForeignKey
ALTER TABLE "reporting_hierarchy" ADD CONSTRAINT "reporting_hierarchy_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_hierarchy" ADD CONSTRAINT "reporting_hierarchy_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
