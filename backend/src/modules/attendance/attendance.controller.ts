import { Request, Response } from "express";
import crypto from "crypto";
import {
  AttendanceMethod,
  AttendanceStatus,
  AttendanceRequestStatus,
  BiometricProvider,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

function startOfDay(dateInput?: string | Date) {
  const date = dateInput ? new Date(dateInput) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getRequestUserId(req: Request) {
  return (
    (req as any).user?.id ||
    (req as any).userId ||
    (req as any).authUser?.id ||
    null
  );
}

async function resolveEmployee(req: Request) {
  const userId = getRequestUserId(req);

  const employeeId =
    (req.body && req.body.employeeId) ||
    (req.query && (req.query.employeeId as string));

  if (employeeId) {
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    const adminRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"];

    if (!adminRoles.includes(user.role.name)) {
      throw new AppError("Not allowed to act on behalf of another employee", 403);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    return employee;
  }

  if (!userId) {
    throw new AppError("Employee ID is required", 400);
  }

  const employee = await prisma.employee.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  if (!employee) {
    throw new AppError("Employee profile not found for logged in user", 404);
  }

  return employee;
}

async function getActiveAttendanceSetting() {
  let setting = await prisma.attendanceSetting.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!setting) {
    setting = await prisma.attendanceSetting.create({
      data: {
        officeStartTime: "10:00",
        officeEndTime: "19:00",
        lateAfterMins: 15,
        halfDayMins: 270,
        fullDayMins: 480,
        gpsRadiusMeters: 200,
        allowNormalAttendance: true,
      },
    });
  }

  return setting;
}

function parseOfficeTime(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const officeTime = new Date(date);
  officeTime.setHours(hour || 0, minute || 0, 0, 0);
  return officeTime;
}

function calculateDistanceMeters(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
) {
  if (
    lat1 === undefined ||
    lat1 === null ||
    lon1 === undefined ||
    lon1 === null ||
    lat2 === undefined ||
    lat2 === null ||
    lon2 === undefined ||
    lon2 === null
  ) {
    return null;
  }

  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

async function validateQrSession(token?: string) {
  if (!token) {
    throw new AppError("QR token is required", 400);
  }

  const now = new Date();

  const qrSession = await prisma.attendanceQrSession.findUnique({
    where: { token },
  });

  if (!qrSession) {
    throw new AppError("Invalid QR session", 404);
  }

  if (!qrSession.isActive) {
    throw new AppError("QR session is inactive", 400);
  }

  if (now < qrSession.validFrom || now > qrSession.expiresAt) {
    throw new AppError("QR session expired or not active yet", 400);
  }

  return qrSession;
}

async function validateAttendanceMethod(req: Request, method: AttendanceMethod) {
  const {
    qrToken,
    selfieUrl,
    latitude,
    longitude,
    accuracyM,
    biometricVerified,
  } = req.body;

  const setting = await getActiveAttendanceSetting();

  let qrSessionId: string | null = null;
  let locationVerified = false;

  if (method === AttendanceMethod.QR) {
    const qrSession = await validateQrSession(qrToken);
    qrSessionId = qrSession.id;
  }

  if (method === AttendanceMethod.SELFIE) {
    if (!selfieUrl) {
      throw new AppError("Selfie URL is required for selfie attendance", 400);
    }
  }

  if (method === AttendanceMethod.GPS || latitude || longitude) {
    if (latitude === undefined || longitude === undefined) {
      throw new AppError("Latitude and longitude are required", 400);
    }

    if (setting.officeLatitude && setting.officeLongitude) {
      const distance = calculateDistanceMeters(
        Number(latitude),
        Number(longitude),
        setting.officeLatitude,
        setting.officeLongitude
      );

      locationVerified =
        distance !== null && distance <= setting.gpsRadiusMeters;
    } else {
      locationVerified = true;
    }
  }

  if (method === AttendanceMethod.BIOMETRIC) {
    if (biometricVerified !== true && biometricVerified !== "true") {
      throw new AppError("Biometric verification is required", 400);
    }
  }

  return {
    setting,
    qrSessionId,
    locationVerified,
    accuracyM:
      accuracyM !== undefined && accuracyM !== null ? Number(accuracyM) : null,
  };
}

function calculateWorkMinutes(
  checkInTime: Date,
  checkOutTime: Date,
  totalBreakMins: number
) {
  const totalMinutes = Math.floor(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );

  return Math.max(totalMinutes - totalBreakMins, 0);
}

/* =========================
   Settings APIs
========================= */

export const getAttendanceSettings = asyncHandler(async (req, res: Response) => {
  const settings = await prisma.attendanceSetting.findMany({
    orderBy: { createdAt: "desc" },
  });

  return successResponse(
    res,
    200,
    "Attendance settings fetched successfully",
    settings
  );
});

export const createAttendanceSetting = asyncHandler(
  async (req, res: Response) => {
    const {
      officeStartTime,
      officeEndTime,
      lateAfterMins,
      halfDayMins,
      fullDayMins,
      officeLatitude,
      officeLongitude,
      gpsRadiusMeters,
      allowNormalAttendance,
      requireQrAttendance,
      requireSelfieAttendance,
      requireGpsAttendance,
      requireBiometricAttendance,
      isActive,
    } = req.body;

    if (isActive !== false) {
      await prisma.attendanceSetting.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const setting = await prisma.attendanceSetting.create({
      data: {
        officeStartTime: officeStartTime || "10:00",
        officeEndTime: officeEndTime || "19:00",
        lateAfterMins: lateAfterMins ? Number(lateAfterMins) : 15,
        halfDayMins: halfDayMins ? Number(halfDayMins) : 270,
        fullDayMins: fullDayMins ? Number(fullDayMins) : 480,
        officeLatitude:
          officeLatitude !== undefined && officeLatitude !== null
            ? Number(officeLatitude)
            : null,
        officeLongitude:
          officeLongitude !== undefined && officeLongitude !== null
            ? Number(officeLongitude)
            : null,
        gpsRadiusMeters: gpsRadiusMeters ? Number(gpsRadiusMeters) : 200,
        allowNormalAttendance: allowNormalAttendance !== false,
        requireQrAttendance: Boolean(requireQrAttendance),
        requireSelfieAttendance: Boolean(requireSelfieAttendance),
        requireGpsAttendance: Boolean(requireGpsAttendance),
        requireBiometricAttendance: Boolean(requireBiometricAttendance),
        isActive: isActive !== false,
      },
    });

    return successResponse(
      res,
      201,
      "Attendance setting created successfully",
      setting
    );
  }
);

/* =========================
   Check In / Check Out APIs
========================= */

export const checkInAttendance = asyncHandler(async (req, res: Response) => {
  const employee = await resolveEmployee(req);

  const method = (req.body.method || AttendanceMethod.NORMAL) as AttendanceMethod;

  if (!Object.values(AttendanceMethod).includes(method)) {
    throw new AppError("Invalid attendance method", 400);
  }

  const {
    selfieUrl,
    latitude,
    longitude,
    biometricDeviceId,
    biometricUserId,
    biometricLogId,
    notes,
    deviceInfo,
  } = req.body;

  const attendanceDate = startOfDay();
  const now = new Date();

  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
  });

  if (existingAttendance?.checkInTime) {
    throw new AppError("Already checked in today", 409);
  }

  const { setting, qrSessionId, locationVerified, accuracyM } =
    await validateAttendanceMethod(req, method);

  const officeStart = parseOfficeTime(attendanceDate, setting.officeStartTime);
  officeStart.setMinutes(officeStart.getMinutes() + setting.lateAfterMins);

  const isLate = now > officeStart;

  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
    update: {
      checkInTime: now,
      checkInMethod: method,
      checkInQrSessionId: qrSessionId,
      checkInSelfieUrl: selfieUrl || null,
      checkInLatitude:
        latitude !== undefined && latitude !== null ? Number(latitude) : null,
      checkInLongitude:
        longitude !== undefined && longitude !== null ? Number(longitude) : null,
      checkInAccuracyM: accuracyM,
      checkInLocationVerified: locationVerified,
      checkInBiometricVerified: method === AttendanceMethod.BIOMETRIC,
      checkInBiometricDeviceId: biometricDeviceId || null,
      checkInBiometricUserId: biometricUserId || null,
      checkInBiometricLogId: biometricLogId || null,
      isLate,
      status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      ipAddress: req.ip,
      deviceInfo: deviceInfo || req.headers["user-agent"] || null,
      notes: notes || null,
    },
    create: {
      employeeId: employee.id,
      attendanceDate,
      checkInTime: now,
      checkInMethod: method,
      checkInQrSessionId: qrSessionId,
      checkInSelfieUrl: selfieUrl || null,
      checkInLatitude:
        latitude !== undefined && latitude !== null ? Number(latitude) : null,
      checkInLongitude:
        longitude !== undefined && longitude !== null ? Number(longitude) : null,
      checkInAccuracyM: accuracyM,
      checkInLocationVerified: locationVerified,
      checkInBiometricVerified: method === AttendanceMethod.BIOMETRIC,
      checkInBiometricDeviceId: biometricDeviceId || null,
      checkInBiometricUserId: biometricUserId || null,
      checkInBiometricLogId: biometricLogId || null,
      isLate,
      status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      ipAddress: req.ip,
      deviceInfo: String(deviceInfo || req.headers["user-agent"] || ""),
      notes: notes || null,
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      breaks: true,
    },
  });

  return successResponse(res, 201, "Check-in successful", attendance);
});

export const checkOutAttendance = asyncHandler(async (req, res: Response) => {
  const employee = await resolveEmployee(req);

  const method = (req.body.method || AttendanceMethod.NORMAL) as AttendanceMethod;

  if (!Object.values(AttendanceMethod).includes(method)) {
    throw new AppError("Invalid attendance method", 400);
  }

  const {
    selfieUrl,
    latitude,
    longitude,
    biometricDeviceId,
    biometricUserId,
    biometricLogId,
    notes,
    deviceInfo,
  } = req.body;

  const attendanceDate = startOfDay();
  const now = new Date();

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
    include: {
      breaks: true,
    },
  });

  if (!attendance || !attendance.checkInTime) {
    throw new AppError("Check-in not found for today", 404);
  }

  if (attendance.checkOutTime) {
    throw new AppError("Already checked out today", 409);
  }

  const openBreak = attendance.breaks.find((item) => !item.breakEnd);

  if (openBreak) {
    throw new AppError("Please end active break before check-out", 400);
  }

  const { setting, qrSessionId, locationVerified, accuracyM } =
    await validateAttendanceMethod(req, method);

  const totalWorkMins = calculateWorkMinutes(
    attendance.checkInTime,
    now,
    attendance.totalBreakMins
  );

  const isHalfDay = totalWorkMins < setting.halfDayMins;

  let status: AttendanceStatus = AttendanceStatus.PRESENT;

  if (isHalfDay) {
    status = AttendanceStatus.HALF_DAY;
  } else if (attendance.isLate) {
    status = AttendanceStatus.LATE;
  }

  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutTime: now,
      checkOutMethod: method,
      checkOutQrSessionId: qrSessionId,
      checkOutSelfieUrl: selfieUrl || null,
      checkOutLatitude:
        latitude !== undefined && latitude !== null ? Number(latitude) : null,
      checkOutLongitude:
        longitude !== undefined && longitude !== null ? Number(longitude) : null,
      checkOutAccuracyM: accuracyM,
      checkOutLocationVerified: locationVerified,
      checkOutBiometricVerified: method === AttendanceMethod.BIOMETRIC,
      checkOutBiometricDeviceId: biometricDeviceId || null,
      checkOutBiometricUserId: biometricUserId || null,
      checkOutBiometricLogId: biometricLogId || null,
      totalWorkMins,
      isHalfDay,
      status,
      ipAddress: req.ip,
      deviceInfo: deviceInfo || req.headers["user-agent"] || null,
      notes: notes || attendance.notes,
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      breaks: true,
    },
  });

  return successResponse(res, 200, "Check-out successful", updatedAttendance);
});

/* =========================
   Break APIs
========================= */

export const startBreak = asyncHandler(async (req, res: Response) => {
  const employee = await resolveEmployee(req);
  const attendanceDate = startOfDay();

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
    include: {
      breaks: true,
    },
  });

  if (!attendance || !attendance.checkInTime) {
    throw new AppError("Check-in required before starting break", 400);
  }

  if (attendance.checkOutTime) {
    throw new AppError("Cannot start break after check-out", 400);
  }

  const openBreak = attendance.breaks.find((item) => !item.breakEnd);

  if (openBreak) {
    throw new AppError("A break is already active", 409);
  }

  const attendanceBreak = await prisma.attendanceBreak.create({
    data: {
      attendanceId: attendance.id,
      breakStart: new Date(),
      notes: req.body.notes || null,
    },
  });

  return successResponse(
    res,
    201,
    "Break started successfully",
    attendanceBreak
  );
});

export const endBreak = asyncHandler(async (req, res: Response) => {
  const employee = await resolveEmployee(req);
  const attendanceDate = startOfDay();

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
    include: {
      breaks: true,
    },
  });

  if (!attendance) {
    throw new AppError("Attendance record not found", 404);
  }

  const openBreak = attendance.breaks.find((item) => !item.breakEnd);

  if (!openBreak) {
    throw new AppError("No active break found", 404);
  }

  const now = new Date();
  const durationMins = Math.max(
    Math.floor((now.getTime() - openBreak.breakStart.getTime()) / 60000),
    0
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedBreak = await tx.attendanceBreak.update({
      where: { id: openBreak.id },
      data: {
        breakEnd: now,
        durationMins,
        notes: req.body.notes || openBreak.notes,
      },
    });

    await tx.attendance.update({
      where: { id: attendance.id },
      data: {
        totalBreakMins: attendance.totalBreakMins + durationMins,
      },
    });

    return updatedBreak;
  });

  return successResponse(res, 200, "Break ended successfully", result);
});

/* =========================
   Today + Report APIs
========================= */

export const getTodayAttendance = asyncHandler(async (req, res: Response) => {
  const employee = await resolveEmployee(req);
  const attendanceDate = startOfDay();

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      breaks: true,
    },
  });

  return successResponse(
    res,
    200,
    "Today attendance fetched successfully",
    attendance
  );
});

export const getAttendanceReport = asyncHandler(async (req, res: Response) => {
  const { employeeId, from, to, status, method } = req.query;

  const fromDate = from ? startOfDay(String(from)) : startOfDay();
  const toDate = to ? startOfDay(String(to)) : startOfDay();
  toDate.setHours(23, 59, 59, 999);

  const report = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (status as AttendanceStatus) : undefined,
      OR: method
        ? [
            { checkInMethod: method as AttendanceMethod },
            { checkOutMethod: method as AttendanceMethod },
          ]
        : undefined,
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      breaks: true,
    },
    orderBy: {
      attendanceDate: "desc",
    },
  });

  return successResponse(
    res,
    200,
    "Attendance report fetched successfully",
    report
  );
});

/* =========================
   Manual Attendance API
========================= */

export const markManualAttendance = asyncHandler(
  async (req, res: Response) => {
    const {
      employeeId,
      attendanceDate,
      checkInTime,
      checkOutTime,
      status,
      notes,
    } = req.body;

    if (!employeeId || !attendanceDate) {
      throw new AppError("Employee ID and attendance date are required", 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const normalizedDate = startOfDay(attendanceDate);

    const checkIn = checkInTime ? new Date(checkInTime) : null;
    const checkOut = checkOutTime ? new Date(checkOutTime) : null;

    const totalWorkMins =
      checkIn && checkOut ? calculateWorkMinutes(checkIn, checkOut, 0) : 0;

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId,
          attendanceDate: normalizedDate,
        },
      },
      update: {
        checkInTime: checkIn,
        checkOutTime: checkOut,
        checkInMethod: AttendanceMethod.MANUAL,
        checkOutMethod: AttendanceMethod.MANUAL,
        status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
        totalWorkMins,
        notes: notes || null,
      },
      create: {
        employeeId,
        attendanceDate: normalizedDate,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        checkInMethod: AttendanceMethod.MANUAL,
        checkOutMethod: AttendanceMethod.MANUAL,
        status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
        totalWorkMins,
        notes: notes || null,
      },
    });

    return successResponse(
      res,
      200,
      "Manual attendance marked successfully",
      attendance
    );
  }
);

/* =========================
   QR Attendance APIs
========================= */

export const createQrSession = asyncHandler(async (req, res: Response) => {
  const { title, validMinutes, notes } = req.body;

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + Number(validMinutes || 10) * 60000
  );

  const token = crypto.randomBytes(32).toString("hex");

  const qrSession = await prisma.attendanceQrSession.create({
    data: {
      token,
      title: title || "Attendance QR Session",
      validFrom: now,
      expiresAt,
      isActive: true,
      createdById: getRequestUserId(req),
      notes: notes || null,
    },
  });

  return successResponse(
    res,
    201,
    "QR attendance session created successfully",
    qrSession
  );
});

export const getActiveQrSessions = asyncHandler(
  async (req, res: Response) => {
    const now = new Date();

    const sessions = await prisma.attendanceQrSession.findMany({
      where: {
        isActive: true,
        validFrom: {
          lte: now,
        },
        expiresAt: {
          gte: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(
      res,
      200,
      "Active QR sessions fetched successfully",
      sessions
    );
  }
);

/* =========================
   Attendance Requests APIs
========================= */

export const createAttendanceRequest = asyncHandler(
  async (req, res: Response) => {
    const employee = await resolveEmployee(req);

    const {
      attendanceDate,
      requestType,
      reason,
      requestedCheckInTime,
      requestedCheckOutTime,
    } = req.body;

    if (!attendanceDate || !requestType) {
      throw new AppError("Attendance date and request type are required", 400);
    }

    const request = await prisma.attendanceRequest.create({
      data: {
        employeeId: employee.id,
        attendanceDate: startOfDay(attendanceDate),
        requestType,
        reason: reason || null,
        requestedCheckInTime: requestedCheckInTime
          ? new Date(requestedCheckInTime)
          : null,
        requestedCheckOutTime: requestedCheckOutTime
          ? new Date(requestedCheckOutTime)
          : null,
      },
    });

    return successResponse(
      res,
      201,
      "Attendance request created successfully",
      request
    );
  }
);

export const getAttendanceRequests = asyncHandler(
  async (req, res: Response) => {
    const requests = await prisma.attendanceRequest.findMany({
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(
      res,
      200,
      "Attendance requests fetched successfully",
      requests
    );
  }
);

export const updateAttendanceRequestStatus = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      throw new AppError("Request status is required", 400);
    }

    if (!Object.values(AttendanceRequestStatus).includes(status)) {
      throw new AppError("Invalid attendance request status", 400);
    }

    const request = await prisma.attendanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError("Attendance request not found", 404);
    }

    const updatedRequest = await prisma.attendanceRequest.update({
      where: { id },
      data: {
        status,
        approvedById: getRequestUserId(req),
        approvedAt: new Date(),
        remarks: remarks || null,
      },
    });

    return successResponse(
      res,
      200,
      "Attendance request status updated successfully",
      updatedRequest
    );
  }
);

/* =========================
   Biometric APIs
========================= */

export const createBiometricDevice = asyncHandler(
  async (req, res: Response) => {
    const {
      name,
      provider,
      model,
      serialNumber,
      location,
      apiBaseUrl,
      apiKey,
    } = req.body;

    if (!name) {
      throw new AppError("Device name is required", 400);
    }

    const device = await prisma.biometricDevice.create({
      data: {
        name,
        provider: provider || BiometricProvider.OTHER,
        model: model || null,
        serialNumber: serialNumber || null,
        location: location || null,
        apiBaseUrl: apiBaseUrl || null,
        apiKey: apiKey || null,
        isActive: true,
      },
    });

    return successResponse(
      res,
      201,
      "Biometric device created successfully",
      device
    );
  }
);

export const getBiometricDevices = asyncHandler(
  async (req, res: Response) => {
    const devices = await prisma.biometricDevice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(
      res,
      200,
      "Biometric devices fetched successfully",
      devices
    );
  }
);

export const enrollBiometricEmployee = asyncHandler(
  async (req, res: Response) => {
    const { employeeId, deviceId, biometricUserId, notes } = req.body;

    if (!employeeId || !deviceId || !biometricUserId) {
      throw new AppError(
        "Employee ID, device ID and biometric user ID are required",
        400
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError("Biometric device not found", 404);
    }

    const enrollment = await prisma.biometricEnrollment.create({
      data: {
        employeeId,
        deviceId,
        biometricUserId,
        notes: notes || null,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        device: true,
      },
    });

    return successResponse(
      res,
      201,
      "Employee biometric enrollment created successfully",
      enrollment
    );
  }
);

export const biometricAttendance = asyncHandler(
  async (req, res: Response) => {
    const { deviceId, biometricUserId, action, rawPayload, notes } = req.body;

    if (!deviceId || !biometricUserId || !action) {
      throw new AppError(
        "Device ID, biometric user ID and action are required",
        400
      );
    }

    const enrollment = await prisma.biometricEnrollment.findFirst({
      where: {
        deviceId,
        biometricUserId,
        isActive: true,
      },
      include: {
        employee: true,
      },
    });

    if (!enrollment) {
      throw new AppError("Biometric enrollment not found", 404);
    }

    const log = await prisma.biometricAttendanceLog.create({
      data: {
        employeeId: enrollment.employeeId,
        deviceId,
        biometricUserId,
        capturedAt: new Date(),
        verified: true,
        rawPayload: rawPayload || undefined,
        notes: notes || null,
      },
    });

    req.body.employeeId = enrollment.employeeId;
    req.body.method = AttendanceMethod.BIOMETRIC;
    req.body.biometricVerified = true;
    req.body.biometricDeviceId = deviceId;
    req.body.biometricUserId = biometricUserId;
    req.body.biometricLogId = log.id;

    if (action === "CHECK_IN") {
      return checkInAttendance(req, res, () => undefined);
    }

    if (action === "CHECK_OUT") {
      return checkOutAttendance(req, res, () => undefined);
    }

    throw new AppError("Invalid biometric attendance action", 400);
  }
);