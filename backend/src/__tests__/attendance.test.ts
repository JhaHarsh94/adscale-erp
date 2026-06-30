import request from "supertest";
import app from "../server";

jest.mock("../config/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    employee: { findUnique: jest.fn() },
    attendance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    attendanceBreak: {
      create: jest.fn(),
      update: jest.fn(),
    },
    attendanceSetting: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    attendanceQrSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    attendanceRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    biometricDevice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    biometricEnrollment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    biometricAttendanceLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: any) =>
      fn({
        attendanceBreak: { update: jest.fn().mockResolvedValue({ id: "b1", durationMins: 5 }) },
        attendance: { update: jest.fn().mockResolvedValue({ id: "a1", totalBreakMins: 5 }) },
      })
    ),
    $queryRaw: jest.fn(),
  },
}));

import prisma from "../config/prisma";
const mockPrisma = prisma as any;

const getAuthHeader = () => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { userId: "user1", email: "admin@test.com", role: "SUPER_ADMIN" },
    process.env.JWT_SECRET || "test-secret",
    { expiresIn: "1h" }
  );
  return `Bearer ${token}`;
};

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-only-minimum-32";
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user1",
    name: "Admin",
    email: "admin@test.com",
    status: "ACTIVE",
    role: { name: "SUPER_ADMIN" },
  });
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    fn({
      attendanceBreak: { update: jest.fn().mockResolvedValue({ id: "b1", durationMins: 5 }) },
      attendance: { update: jest.fn().mockResolvedValue({ id: "a1", totalBreakMins: 5 }) },
    })
  );
});

describe("GET /api/attendance/settings", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/attendance/settings");
    expect(res.status).toBe(401);
  });

  it("returns settings list", async () => {
    mockPrisma.attendanceSetting.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/attendance/settings")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
  });
});

describe("POST /api/attendance/check-in", () => {
  it("returns 400 when employee not found for logged in user", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/attendance/check-in")
      .set("Authorization", getAuthHeader())
      .send({ method: "NORMAL" });
    expect(res.status).toBe(404);
  });

  it("returns 409 when already checked in", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp1",
      userId: "user1",
      user: { id: "user1", name: "Admin", email: "admin@test.com", role: { name: "SUPER_ADMIN" } },
    });
    mockPrisma.attendance.findUnique.mockResolvedValue({
      id: "att1",
      checkInTime: new Date(),
    });
    const res = await request(app)
      .post("/api/attendance/check-in")
      .set("Authorization", getAuthHeader())
      .send({ method: "NORMAL" });
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid attendance method", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp1",
      userId: "user1",
      user: { id: "user1", name: "Admin", email: "admin@test.com", role: { name: "SUPER_ADMIN" } },
    });
    const res = await request(app)
      .post("/api/attendance/check-in")
      .set("Authorization", getAuthHeader())
      .send({ method: "INVALID_METHOD" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/attendance/check-out", () => {
  it("returns 404 when no check-in found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp1",
      userId: "user1",
      user: { id: "user1", name: "Admin", email: "admin@test.com", role: { name: "SUPER_ADMIN" } },
    });
    mockPrisma.attendance.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/attendance/check-out")
      .set("Authorization", getAuthHeader())
      .send({ method: "NORMAL" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/attendance/break/start", () => {
  it("returns 400 when not checked in", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp1",
      userId: "user1",
      user: { id: "user1", name: "Admin", email: "admin@test.com", role: { name: "SUPER_ADMIN" } },
    });
    mockPrisma.attendance.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/attendance/break/start")
      .set("Authorization", getAuthHeader())
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/attendance/qr-sessions", () => {
  it("creates a QR session", async () => {
    mockPrisma.attendanceQrSession.create.mockResolvedValue({
      id: "qr1",
      token: "abc123",
      isActive: true,
    });
    const res = await request(app)
      .post("/api/attendance/qr-sessions")
      .set("Authorization", getAuthHeader())
      .send({ title: "Morning Session", validMinutes: 30 });
    expect(res.status).toBe(201);
  });
});

describe("GET /api/attendance/qr-sessions/active", () => {
  it("returns active QR sessions", async () => {
    mockPrisma.attendanceQrSession.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/attendance/qr-sessions/active")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
  });
});

describe("POST /api/attendance/biometric/attendance", () => {
  it("returns 400 when required fields missing", async () => {
    const res = await request(app)
      .post("/api/attendance/biometric/attendance")
      .set("Authorization", getAuthHeader())
      .send({ deviceId: "dev1" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const res = await request(app)
      .post("/api/attendance/biometric/attendance")
      .set("Authorization", getAuthHeader())
      .send({ deviceId: "dev1", biometricUserId: "u1", action: "INVALID" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when enrollment not found", async () => {
    mockPrisma.biometricEnrollment.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/attendance/biometric/attendance")
      .set("Authorization", getAuthHeader())
      .send({ deviceId: "dev1", biometricUserId: "u1", action: "CHECK_IN" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/attendance/manual", () => {
  it("returns 400 when employeeId missing", async () => {
    const res = await request(app)
      .post("/api/attendance/manual")
      .set("Authorization", getAuthHeader())
      .send({ attendanceDate: "2026-06-20" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/attendance/manual")
      .set("Authorization", getAuthHeader())
      .send({ employeeId: "nonexistent", attendanceDate: "2026-06-20" });
    expect(res.status).toBe(404);
  });
});
