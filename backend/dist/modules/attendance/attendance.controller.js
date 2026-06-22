"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.biometricAttendance = exports.enrollBiometricEmployee = exports.getBiometricDevices = exports.createBiometricDevice = exports.updateAttendanceRequestStatus = exports.getAttendanceRequests = exports.createAttendanceRequest = exports.getActiveQrSessions = exports.createQrSession = exports.markManualAttendance = exports.getAttendanceReport = exports.getTodayAttendance = exports.endBreak = exports.startBreak = exports.checkOutAttendance = exports.checkInAttendance = exports.createAttendanceSetting = exports.getAttendanceSettings = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
function startOfDay(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function getRequestUserId(req) {
    return (req.user?.id ||
        req.userId ||
        req.authUser?.id ||
        null);
}
async function resolveEmployee(req) {
    const employeeId = (req.body && req.body.employeeId) ||
        (req.query && req.query.employeeId);
    if (employeeId) {
        const employee = await prisma_1.default.employee.findUnique({
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
            throw new AppError_1.AppError("Employee not found", 404);
        }
        return employee;
    }
    const userId = getRequestUserId(req);
    if (!userId) {
        throw new AppError_1.AppError("Employee ID is required", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
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
        throw new AppError_1.AppError("Employee profile not found for logged in user", 404);
    }
    return employee;
}
async function getActiveAttendanceSetting() {
    let setting = await prisma_1.default.attendanceSetting.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
    });
    if (!setting) {
        setting = await prisma_1.default.attendanceSetting.create({
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
function parseOfficeTime(date, time) {
    const [hour, minute] = time.split(":").map(Number);
    const officeTime = new Date(date);
    officeTime.setHours(hour || 0, minute || 0, 0, 0);
    return officeTime;
}
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined ||
        lat1 === null ||
        lon1 === undefined ||
        lon1 === null ||
        lat2 === undefined ||
        lat2 === null ||
        lon2 === undefined ||
        lon2 === null) {
        return null;
    }
    const earthRadius = 6371000;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}
async function validateQrSession(token) {
    if (!token) {
        throw new AppError_1.AppError("QR token is required", 400);
    }
    const now = new Date();
    const qrSession = await prisma_1.default.attendanceQrSession.findUnique({
        where: { token },
    });
    if (!qrSession) {
        throw new AppError_1.AppError("Invalid QR session", 404);
    }
    if (!qrSession.isActive) {
        throw new AppError_1.AppError("QR session is inactive", 400);
    }
    if (now < qrSession.validFrom || now > qrSession.expiresAt) {
        throw new AppError_1.AppError("QR session expired or not active yet", 400);
    }
    return qrSession;
}
async function validateAttendanceMethod(req, method) {
    const { qrToken, selfieUrl, latitude, longitude, accuracyM, biometricVerified, } = req.body;
    const setting = await getActiveAttendanceSetting();
    let qrSessionId = null;
    let locationVerified = false;
    if (method === client_1.AttendanceMethod.QR) {
        const qrSession = await validateQrSession(qrToken);
        qrSessionId = qrSession.id;
    }
    if (method === client_1.AttendanceMethod.SELFIE) {
        if (!selfieUrl) {
            throw new AppError_1.AppError("Selfie URL is required for selfie attendance", 400);
        }
    }
    if (method === client_1.AttendanceMethod.GPS || latitude || longitude) {
        if (latitude === undefined || longitude === undefined) {
            throw new AppError_1.AppError("Latitude and longitude are required", 400);
        }
        if (setting.officeLatitude && setting.officeLongitude) {
            const distance = calculateDistanceMeters(Number(latitude), Number(longitude), setting.officeLatitude, setting.officeLongitude);
            locationVerified =
                distance !== null && distance <= setting.gpsRadiusMeters;
        }
        else {
            locationVerified = true;
        }
    }
    if (method === client_1.AttendanceMethod.BIOMETRIC) {
        if (biometricVerified !== true && biometricVerified !== "true") {
            throw new AppError_1.AppError("Biometric verification is required", 400);
        }
    }
    return {
        setting,
        qrSessionId,
        locationVerified,
        accuracyM: accuracyM !== undefined && accuracyM !== null ? Number(accuracyM) : null,
    };
}
function calculateWorkMinutes(checkInTime, checkOutTime, totalBreakMins) {
    const totalMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
    return Math.max(totalMinutes - totalBreakMins, 0);
}
/* =========================
   Settings APIs
========================= */
exports.getAttendanceSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const settings = await prisma_1.default.attendanceSetting.findMany({
        orderBy: { createdAt: "desc" },
    });
    return (0, response_1.successResponse)(res, 200, "Attendance settings fetched successfully", settings);
});
exports.createAttendanceSetting = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { officeStartTime, officeEndTime, lateAfterMins, halfDayMins, fullDayMins, officeLatitude, officeLongitude, gpsRadiusMeters, allowNormalAttendance, requireQrAttendance, requireSelfieAttendance, requireGpsAttendance, requireBiometricAttendance, isActive, } = req.body;
    if (isActive !== false) {
        await prisma_1.default.attendanceSetting.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
    }
    const setting = await prisma_1.default.attendanceSetting.create({
        data: {
            officeStartTime: officeStartTime || "10:00",
            officeEndTime: officeEndTime || "19:00",
            lateAfterMins: lateAfterMins ? Number(lateAfterMins) : 15,
            halfDayMins: halfDayMins ? Number(halfDayMins) : 270,
            fullDayMins: fullDayMins ? Number(fullDayMins) : 480,
            officeLatitude: officeLatitude !== undefined && officeLatitude !== null
                ? Number(officeLatitude)
                : null,
            officeLongitude: officeLongitude !== undefined && officeLongitude !== null
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
    return (0, response_1.successResponse)(res, 201, "Attendance setting created successfully", setting);
});
/* =========================
   Check In / Check Out APIs
========================= */
exports.checkInAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const method = (req.body.method || client_1.AttendanceMethod.NORMAL);
    if (!Object.values(client_1.AttendanceMethod).includes(method)) {
        throw new AppError_1.AppError("Invalid attendance method", 400);
    }
    const { selfieUrl, latitude, longitude, biometricDeviceId, biometricUserId, biometricLogId, notes, deviceInfo, } = req.body;
    const attendanceDate = startOfDay();
    const now = new Date();
    const existingAttendance = await prisma_1.default.attendance.findUnique({
        where: {
            employeeId_attendanceDate: {
                employeeId: employee.id,
                attendanceDate,
            },
        },
    });
    if (existingAttendance?.checkInTime) {
        throw new AppError_1.AppError("Already checked in today", 409);
    }
    const { setting, qrSessionId, locationVerified, accuracyM } = await validateAttendanceMethod(req, method);
    const officeStart = parseOfficeTime(attendanceDate, setting.officeStartTime);
    officeStart.setMinutes(officeStart.getMinutes() + setting.lateAfterMins);
    const isLate = now > officeStart;
    const attendance = await prisma_1.default.attendance.upsert({
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
            checkInLatitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
            checkInLongitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
            checkInAccuracyM: accuracyM,
            checkInLocationVerified: locationVerified,
            checkInBiometricVerified: method === client_1.AttendanceMethod.BIOMETRIC,
            checkInBiometricDeviceId: biometricDeviceId || null,
            checkInBiometricUserId: biometricUserId || null,
            checkInBiometricLogId: biometricLogId || null,
            isLate,
            status: isLate ? client_1.AttendanceStatus.LATE : client_1.AttendanceStatus.PRESENT,
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
            checkInLatitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
            checkInLongitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
            checkInAccuracyM: accuracyM,
            checkInLocationVerified: locationVerified,
            checkInBiometricVerified: method === client_1.AttendanceMethod.BIOMETRIC,
            checkInBiometricDeviceId: biometricDeviceId || null,
            checkInBiometricUserId: biometricUserId || null,
            checkInBiometricLogId: biometricLogId || null,
            isLate,
            status: isLate ? client_1.AttendanceStatus.LATE : client_1.AttendanceStatus.PRESENT,
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
    return (0, response_1.successResponse)(res, 201, "Check-in successful", attendance);
});
exports.checkOutAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const method = (req.body.method || client_1.AttendanceMethod.NORMAL);
    if (!Object.values(client_1.AttendanceMethod).includes(method)) {
        throw new AppError_1.AppError("Invalid attendance method", 400);
    }
    const { selfieUrl, latitude, longitude, biometricDeviceId, biometricUserId, biometricLogId, notes, deviceInfo, } = req.body;
    const attendanceDate = startOfDay();
    const now = new Date();
    const attendance = await prisma_1.default.attendance.findUnique({
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
        throw new AppError_1.AppError("Check-in not found for today", 404);
    }
    if (attendance.checkOutTime) {
        throw new AppError_1.AppError("Already checked out today", 409);
    }
    const openBreak = attendance.breaks.find((item) => !item.breakEnd);
    if (openBreak) {
        throw new AppError_1.AppError("Please end active break before check-out", 400);
    }
    const { setting, qrSessionId, locationVerified, accuracyM } = await validateAttendanceMethod(req, method);
    const totalWorkMins = calculateWorkMinutes(attendance.checkInTime, now, attendance.totalBreakMins);
    const isHalfDay = totalWorkMins < setting.halfDayMins;
    let status = client_1.AttendanceStatus.PRESENT;
    if (isHalfDay) {
        status = client_1.AttendanceStatus.HALF_DAY;
    }
    else if (attendance.isLate) {
        status = client_1.AttendanceStatus.LATE;
    }
    const updatedAttendance = await prisma_1.default.attendance.update({
        where: { id: attendance.id },
        data: {
            checkOutTime: now,
            checkOutMethod: method,
            checkOutQrSessionId: qrSessionId,
            checkOutSelfieUrl: selfieUrl || null,
            checkOutLatitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
            checkOutLongitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
            checkOutAccuracyM: accuracyM,
            checkOutLocationVerified: locationVerified,
            checkOutBiometricVerified: method === client_1.AttendanceMethod.BIOMETRIC,
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
    return (0, response_1.successResponse)(res, 200, "Check-out successful", updatedAttendance);
});
/* =========================
   Break APIs
========================= */
exports.startBreak = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const attendanceDate = startOfDay();
    const attendance = await prisma_1.default.attendance.findUnique({
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
        throw new AppError_1.AppError("Check-in required before starting break", 400);
    }
    if (attendance.checkOutTime) {
        throw new AppError_1.AppError("Cannot start break after check-out", 400);
    }
    const openBreak = attendance.breaks.find((item) => !item.breakEnd);
    if (openBreak) {
        throw new AppError_1.AppError("A break is already active", 409);
    }
    const attendanceBreak = await prisma_1.default.attendanceBreak.create({
        data: {
            attendanceId: attendance.id,
            breakStart: new Date(),
            notes: req.body.notes || null,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Break started successfully", attendanceBreak);
});
exports.endBreak = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const attendanceDate = startOfDay();
    const attendance = await prisma_1.default.attendance.findUnique({
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
        throw new AppError_1.AppError("Attendance record not found", 404);
    }
    const openBreak = attendance.breaks.find((item) => !item.breakEnd);
    if (!openBreak) {
        throw new AppError_1.AppError("No active break found", 404);
    }
    const now = new Date();
    const durationMins = Math.max(Math.floor((now.getTime() - openBreak.breakStart.getTime()) / 60000), 0);
    const result = await prisma_1.default.$transaction(async (tx) => {
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
    return (0, response_1.successResponse)(res, 200, "Break ended successfully", result);
});
/* =========================
   Today + Report APIs
========================= */
exports.getTodayAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const attendanceDate = startOfDay();
    const attendance = await prisma_1.default.attendance.findUnique({
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
    return (0, response_1.successResponse)(res, 200, "Today attendance fetched successfully", attendance);
});
exports.getAttendanceReport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, from, to, status, method } = req.query;
    const fromDate = from ? startOfDay(String(from)) : startOfDay();
    const toDate = to ? startOfDay(String(to)) : startOfDay();
    toDate.setHours(23, 59, 59, 999);
    const report = await prisma_1.default.attendance.findMany({
        where: {
            attendanceDate: {
                gte: fromDate,
                lte: toDate,
            },
            employeeId: employeeId ? String(employeeId) : undefined,
            status: status ? status : undefined,
            OR: method
                ? [
                    { checkInMethod: method },
                    { checkOutMethod: method },
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
    return (0, response_1.successResponse)(res, 200, "Attendance report fetched successfully", report);
});
/* =========================
   Manual Attendance API
========================= */
exports.markManualAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, attendanceDate, checkInTime, checkOutTime, status, notes, } = req.body;
    if (!employeeId || !attendanceDate) {
        throw new AppError_1.AppError("Employee ID and attendance date are required", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const normalizedDate = startOfDay(attendanceDate);
    const checkIn = checkInTime ? new Date(checkInTime) : null;
    const checkOut = checkOutTime ? new Date(checkOutTime) : null;
    const totalWorkMins = checkIn && checkOut ? calculateWorkMinutes(checkIn, checkOut, 0) : 0;
    const attendance = await prisma_1.default.attendance.upsert({
        where: {
            employeeId_attendanceDate: {
                employeeId,
                attendanceDate: normalizedDate,
            },
        },
        update: {
            checkInTime: checkIn,
            checkOutTime: checkOut,
            checkInMethod: client_1.AttendanceMethod.MANUAL,
            checkOutMethod: client_1.AttendanceMethod.MANUAL,
            status: status || client_1.AttendanceStatus.PRESENT,
            totalWorkMins,
            notes: notes || null,
        },
        create: {
            employeeId,
            attendanceDate: normalizedDate,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            checkInMethod: client_1.AttendanceMethod.MANUAL,
            checkOutMethod: client_1.AttendanceMethod.MANUAL,
            status: status || client_1.AttendanceStatus.PRESENT,
            totalWorkMins,
            notes: notes || null,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Manual attendance marked successfully", attendance);
});
/* =========================
   QR Attendance APIs
========================= */
exports.createQrSession = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { title, validMinutes, notes } = req.body;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(validMinutes || 10) * 60000);
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const qrSession = await prisma_1.default.attendanceQrSession.create({
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
    return (0, response_1.successResponse)(res, 201, "QR attendance session created successfully", qrSession);
});
exports.getActiveQrSessions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const sessions = await prisma_1.default.attendanceQrSession.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Active QR sessions fetched successfully", sessions);
});
/* =========================
   Attendance Requests APIs
========================= */
exports.createAttendanceRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await resolveEmployee(req);
    const { attendanceDate, requestType, reason, requestedCheckInTime, requestedCheckOutTime, } = req.body;
    if (!attendanceDate || !requestType) {
        throw new AppError_1.AppError("Attendance date and request type are required", 400);
    }
    const request = await prisma_1.default.attendanceRequest.create({
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
    return (0, response_1.successResponse)(res, 201, "Attendance request created successfully", request);
});
exports.getAttendanceRequests = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const requests = await prisma_1.default.attendanceRequest.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Attendance requests fetched successfully", requests);
});
exports.updateAttendanceRequestStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body;
    if (!status) {
        throw new AppError_1.AppError("Request status is required", 400);
    }
    if (!Object.values(client_1.AttendanceRequestStatus).includes(status)) {
        throw new AppError_1.AppError("Invalid attendance request status", 400);
    }
    const request = await prisma_1.default.attendanceRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError_1.AppError("Attendance request not found", 404);
    }
    const updatedRequest = await prisma_1.default.attendanceRequest.update({
        where: { id },
        data: {
            status,
            approvedById: getRequestUserId(req),
            approvedAt: new Date(),
            remarks: remarks || null,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Attendance request status updated successfully", updatedRequest);
});
/* =========================
   Biometric APIs
========================= */
exports.createBiometricDevice = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, provider, model, serialNumber, location, apiBaseUrl, apiKey, } = req.body;
    if (!name) {
        throw new AppError_1.AppError("Device name is required", 400);
    }
    const device = await prisma_1.default.biometricDevice.create({
        data: {
            name,
            provider: provider || client_1.BiometricProvider.OTHER,
            model: model || null,
            serialNumber: serialNumber || null,
            location: location || null,
            apiBaseUrl: apiBaseUrl || null,
            apiKey: apiKey || null,
            isActive: true,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Biometric device created successfully", device);
});
exports.getBiometricDevices = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const devices = await prisma_1.default.biometricDevice.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Biometric devices fetched successfully", devices);
});
exports.enrollBiometricEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, deviceId, biometricUserId, notes } = req.body;
    if (!employeeId || !deviceId || !biometricUserId) {
        throw new AppError_1.AppError("Employee ID, device ID and biometric user ID are required", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const device = await prisma_1.default.biometricDevice.findUnique({
        where: { id: deviceId },
    });
    if (!device) {
        throw new AppError_1.AppError("Biometric device not found", 404);
    }
    const enrollment = await prisma_1.default.biometricEnrollment.create({
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
    return (0, response_1.successResponse)(res, 201, "Employee biometric enrollment created successfully", enrollment);
});
exports.biometricAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId, biometricUserId, action, rawPayload, notes } = req.body;
    if (!deviceId || !biometricUserId || !action) {
        throw new AppError_1.AppError("Device ID, biometric user ID and action are required", 400);
    }
    const enrollment = await prisma_1.default.biometricEnrollment.findFirst({
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
        throw new AppError_1.AppError("Biometric enrollment not found", 404);
    }
    const log = await prisma_1.default.biometricAttendanceLog.create({
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
    req.body.method = client_1.AttendanceMethod.BIOMETRIC;
    req.body.biometricVerified = true;
    req.body.biometricDeviceId = deviceId;
    req.body.biometricUserId = biometricUserId;
    req.body.biometricLogId = log.id;
    if (action === "CHECK_IN") {
        return (0, exports.checkInAttendance)(req, res, () => undefined);
    }
    if (action === "CHECK_OUT") {
        return (0, exports.checkOutAttendance)(req, res, () => undefined);
    }
    throw new AppError_1.AppError("Invalid biometric attendance action", 400);
});
