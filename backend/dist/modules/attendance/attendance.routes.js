"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const attendance_controller_1 = require("./attendance.controller");
const router = (0, express_1.Router)();
const attendanceAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"];
function forceMethod(method) {
    return (req, res, next) => {
        req.body.method = method;
        next();
    };
}
/* Settings */
router.get("/settings", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.getAttendanceSettings);
router.post("/settings", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.createAttendanceSetting);
/* Normal / Mixed Attendance */
router.post("/check-in", auth_middleware_1.protect, attendance_controller_1.checkInAttendance);
router.post("/check-out", auth_middleware_1.protect, attendance_controller_1.checkOutAttendance);
/* Method Specific Routes */
router.post("/qr/check-in", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.QR), attendance_controller_1.checkInAttendance);
router.post("/qr/check-out", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.QR), attendance_controller_1.checkOutAttendance);
router.post("/selfie/check-in", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.SELFIE), attendance_controller_1.checkInAttendance);
router.post("/selfie/check-out", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.SELFIE), attendance_controller_1.checkOutAttendance);
router.post("/gps/check-in", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.GPS), attendance_controller_1.checkInAttendance);
router.post("/gps/check-out", auth_middleware_1.protect, forceMethod(client_1.AttendanceMethod.GPS), attendance_controller_1.checkOutAttendance);
/* Breaks */
router.post("/break/start", auth_middleware_1.protect, attendance_controller_1.startBreak);
router.post("/break/end", auth_middleware_1.protect, attendance_controller_1.endBreak);
/* Today + Reports */
router.get("/today", auth_middleware_1.protect, attendance_controller_1.getTodayAttendance);
router.get("/report", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.getAttendanceReport);
/* Manual Attendance */
router.post("/manual", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.markManualAttendance);
/* QR Sessions */
router.post("/qr-sessions", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.createQrSession);
router.get("/qr-sessions/active", auth_middleware_1.protect, attendance_controller_1.getActiveQrSessions);
/* Attendance Requests */
router.post("/requests", auth_middleware_1.protect, attendance_controller_1.createAttendanceRequest);
router.get("/requests", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.getAttendanceRequests);
router.put("/requests/:id/status", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.updateAttendanceRequestStatus);
/* Biometric / Fingerprint */
router.get("/biometric/devices", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.getBiometricDevices);
router.post("/biometric/devices", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.createBiometricDevice);
router.post("/biometric/enrollments", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...attendanceAdminRoles), attendance_controller_1.enrollBiometricEmployee);
router.post("/biometric/attendance", auth_middleware_1.protect, attendance_controller_1.biometricAttendance);
exports.default = router;
