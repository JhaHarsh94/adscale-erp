-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('NORMAL', 'QR', 'SELFIE', 'GPS', 'BIOMETRIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttendanceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BiometricProvider" AS ENUM ('WEBAUTHN', 'MANTRA', 'SECUGEN', 'ZKTECO', 'ESSL', 'OTHER');

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "checkInMethod" "AttendanceMethod",
    "checkOutMethod" "AttendanceMethod",
    "totalBreakMins" INTEGER NOT NULL DEFAULT 0,
    "totalWorkMins" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "checkInQrSessionId" TEXT,
    "checkOutQrSessionId" TEXT,
    "checkInSelfieUrl" TEXT,
    "checkOutSelfieUrl" TEXT,
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "checkOutLatitude" DOUBLE PRECISION,
    "checkOutLongitude" DOUBLE PRECISION,
    "checkInAccuracyM" DOUBLE PRECISION,
    "checkOutAccuracyM" DOUBLE PRECISION,
    "checkInLocationVerified" BOOLEAN NOT NULL DEFAULT false,
    "checkOutLocationVerified" BOOLEAN NOT NULL DEFAULT false,
    "checkInBiometricVerified" BOOLEAN NOT NULL DEFAULT false,
    "checkOutBiometricVerified" BOOLEAN NOT NULL DEFAULT false,
    "checkInBiometricDeviceId" TEXT,
    "checkOutBiometricDeviceId" TEXT,
    "checkInBiometricUserId" TEXT,
    "checkOutBiometricUserId" TEXT,
    "checkInBiometricLogId" TEXT,
    "checkOutBiometricLogId" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_breaks" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "breakStart" TIMESTAMP(3) NOT NULL,
    "breakEnd" TIMESTAMP(3),
    "durationMins" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL,
    "officeStartTime" TEXT NOT NULL DEFAULT '10:00',
    "officeEndTime" TEXT NOT NULL DEFAULT '19:00',
    "lateAfterMins" INTEGER NOT NULL DEFAULT 15,
    "halfDayMins" INTEGER NOT NULL DEFAULT 270,
    "fullDayMins" INTEGER NOT NULL DEFAULT 480,
    "officeLatitude" DOUBLE PRECISION,
    "officeLongitude" DOUBLE PRECISION,
    "gpsRadiusMeters" INTEGER NOT NULL DEFAULT 200,
    "allowNormalAttendance" BOOLEAN NOT NULL DEFAULT true,
    "requireQrAttendance" BOOLEAN NOT NULL DEFAULT false,
    "requireSelfieAttendance" BOOLEAN NOT NULL DEFAULT false,
    "requireGpsAttendance" BOOLEAN NOT NULL DEFAULT false,
    "requireBiometricAttendance" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_qr_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "requestType" TEXT NOT NULL,
    "reason" TEXT,
    "status" "AttendanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedCheckInTime" TIMESTAMP(3),
    "requestedCheckOutTime" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "BiometricProvider" NOT NULL DEFAULT 'OTHER',
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "apiBaseUrl" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_enrollments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "biometricUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_attendance_logs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "deviceId" TEXT NOT NULL,
    "biometricUserId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_attendanceDate_key" ON "attendance"("employeeId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_sessions_token_key" ON "attendance_qr_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_devices_serialNumber_key" ON "biometric_devices"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_enrollments_employeeId_deviceId_key" ON "biometric_enrollments"("employeeId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_enrollments_deviceId_biometricUserId_key" ON "biometric_enrollments"("deviceId", "biometricUserId");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checkInQrSessionId_fkey" FOREIGN KEY ("checkInQrSessionId") REFERENCES "attendance_qr_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checkOutQrSessionId_fkey" FOREIGN KEY ("checkOutQrSessionId") REFERENCES "attendance_qr_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_enrollments" ADD CONSTRAINT "biometric_enrollments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_enrollments" ADD CONSTRAINT "biometric_enrollments_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "biometric_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_attendance_logs" ADD CONSTRAINT "biometric_attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_attendance_logs" ADD CONSTRAINT "biometric_attendance_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "biometric_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
