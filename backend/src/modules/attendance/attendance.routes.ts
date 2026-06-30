import { NextFunction, Request, Response, Router } from "express";
import { AttendanceMethod } from "@prisma/client";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  biometricAttendance,
  checkInAttendance,
  checkOutAttendance,
  createAttendanceRequest,
  createAttendanceSetting,
  createBiometricDevice,
  createQrSession,
  endBreak,
  enrollBiometricEmployee,
  getActiveQrSessions,
  getAttendanceReport,
  getAttendanceRequests,
  getAttendanceSettings,
  getBiometricDevices,
  getTodayAttendance,
  markManualAttendance,
  startBreak,
  updateAttendanceRequestStatus,
} from "./attendance.controller";

const router = Router();

const attendanceAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"];

function forceMethod(method: AttendanceMethod) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body.method = method;
    next();
  };
}

/* Settings */
router.get(
  "/settings",
  protect,
  allowRoles(...attendanceAdminRoles),
  getAttendanceSettings
);

router.post(
  "/settings",
  protect,
  allowRoles(...attendanceAdminRoles),
  createAttendanceSetting
);

/* Normal / Mixed Attendance */
router.post("/check-in", protect, checkInAttendance);
router.post("/check-out", protect, checkOutAttendance);

/* Method Specific Routes */
router.post(
  "/qr/check-in",
  protect,
  forceMethod(AttendanceMethod.QR),
  checkInAttendance
);

router.post(
  "/qr/check-out",
  protect,
  forceMethod(AttendanceMethod.QR),
  checkOutAttendance
);

router.post(
  "/selfie/check-in",
  protect,
  forceMethod(AttendanceMethod.SELFIE),
  checkInAttendance
);

router.post(
  "/selfie/check-out",
  protect,
  forceMethod(AttendanceMethod.SELFIE),
  checkOutAttendance
);

router.post(
  "/gps/check-in",
  protect,
  forceMethod(AttendanceMethod.GPS),
  checkInAttendance
);

router.post(
  "/gps/check-out",
  protect,
  forceMethod(AttendanceMethod.GPS),
  checkOutAttendance
);

/* Breaks */
router.post("/break/start", protect, startBreak);
router.post("/break/end", protect, endBreak);

/* Today + Reports */
router.get("/today", protect, getTodayAttendance);

router.get(
  "/report",
  protect,
  allowRoles(...attendanceAdminRoles),
  getAttendanceReport
);

/* Manual Attendance */
router.post(
  "/manual",
  protect,
  allowRoles(...attendanceAdminRoles),
  markManualAttendance
);

/* QR Sessions */
router.post(
  "/qr-sessions",
  protect,
  allowRoles(...attendanceAdminRoles),
  createQrSession
);

router.get("/qr-sessions/active", protect, getActiveQrSessions);

/* Attendance Requests */
router.post("/requests", protect, createAttendanceRequest);

router.get(
  "/requests",
  protect,
  allowRoles(...attendanceAdminRoles),
  getAttendanceRequests
);

router.put(
  "/requests/:id/status",
  protect,
  allowRoles(...attendanceAdminRoles),
  updateAttendanceRequestStatus
);

/* Biometric / Fingerprint */
router.get(
  "/biometric/devices",
  protect,
  allowRoles(...attendanceAdminRoles),
  getBiometricDevices
);

router.post(
  "/biometric/devices",
  protect,
  allowRoles(...attendanceAdminRoles),
  createBiometricDevice
);

router.post(
  "/biometric/enrollments",
  protect,
  allowRoles(...attendanceAdminRoles),
  enrollBiometricEmployee
);

router.post("/biometric/attendance", protect, biometricAttendance);

export default router;