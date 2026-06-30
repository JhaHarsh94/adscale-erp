import request from "supertest";
import app from "../server";

jest.mock("../config/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    employee: { findUnique: jest.fn() },
    leaveType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    leaveBalance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    leaveApprovalLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: any) =>
      fn({
        leaveRequest: {
          create: jest.fn().mockResolvedValue({ id: "req1", status: "PENDING" }),
          findUnique: jest.fn().mockResolvedValue({ id: "req1", status: "PENDING", totalDays: 1 }),
          update: jest.fn().mockResolvedValue({ id: "req1" }),
        },
        leaveApprovalLog: { create: jest.fn() },
        leaveBalance: {
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({ pending: 1, remaining: 11, used: 0 }),
        },
      })
    ),
    $queryRaw: jest.fn(),
  },
}));

import prisma from "../config/prisma";
const mockPrisma = prisma as any;

const getAuthHeader = (role = "SUPER_ADMIN") => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { userId: "user1", email: "admin@test.com", role },
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
  mockPrisma.leaveType.count.mockResolvedValue(0);
  mockPrisma.leaveRequest.count.mockResolvedValue(0);
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    fn({
      leaveRequest: {
        create: jest.fn().mockResolvedValue({ id: "req1", status: "PENDING" }),
        findUnique: jest.fn().mockResolvedValue({ id: "req1", status: "PENDING", totalDays: 1 }),
        update: jest.fn().mockResolvedValue({ id: "req1" }),
      },
      leaveApprovalLog: { create: jest.fn() },
      leaveBalance: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ pending: 1, remaining: 11, used: 0 }),
      },
    })
  );
});

describe("GET /api/leaves/types", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/leaves/types");
    expect(res.status).toBe(401);
  });

  it("returns leave types list", async () => {
    mockPrisma.leaveType.findMany.mockResolvedValue([
      { id: "lt1", name: "Casual Leave", code: "CL", annualQuota: 12 },
    ]);
    const res = await request(app)
      .get("/api/leaves/types")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("POST /api/leaves/types", () => {
  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/leaves/types")
      .set("Authorization", getAuthHeader())
      .send({ code: "CL" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is missing", async () => {
    const res = await request(app)
      .post("/api/leaves/types")
      .set("Authorization", getAuthHeader())
      .send({ name: "Casual Leave" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when leave type already exists", async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue({ id: "existing" });
    const res = await request(app)
      .post("/api/leaves/types")
      .set("Authorization", getAuthHeader())
      .send({ name: "Casual Leave", code: "CL" });
    expect(res.status).toBe(409);
  });

  it("creates leave type successfully", async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(null);
    mockPrisma.leaveType.create.mockResolvedValue({
      id: "lt1",
      name: "Casual Leave",
      code: "CL",
      annualQuota: 12,
    });
    const res = await request(app)
      .post("/api/leaves/types")
      .set("Authorization", getAuthHeader())
      .send({ name: "Casual Leave", code: "CL", annualQuota: 12 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Casual Leave");
  });
});

describe("POST /api/leaves/requests", () => {
  it("returns 400 when required fields missing", async () => {
    const res = await request(app)
      .post("/api/leaves/requests")
      .set("Authorization", getAuthHeader())
      .send({ employeeId: "emp1" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when end date is before start date", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    mockPrisma.leaveType.findUnique.mockResolvedValue({
      id: "lt1",
      isActive: true,
      annualQuota: 12,
    });
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({
      remaining: 12,
      pending: 0,
      used: 0,
    });
    const res = await request(app)
      .post("/api/leaves/requests")
      .set("Authorization", getAuthHeader())
      .send({
        employeeId: "emp1",
        leaveTypeId: "lt1",
        startDate: "2026-06-10",
        endDate: "2026-06-05",
      });
    expect(res.status).toBe(400);
  });

  it("returns 404 when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/leaves/requests")
      .set("Authorization", getAuthHeader())
      .send({
        employeeId: "nonexistent",
        leaveTypeId: "lt1",
        startDate: "2026-06-10",
        endDate: "2026-06-11",
      });
    expect(res.status).toBe(404);
  });

  it("returns 400 when leave type is inactive", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    mockPrisma.leaveType.findUnique.mockResolvedValue({
      id: "lt1",
      isActive: false,
    });
    const res = await request(app)
      .post("/api/leaves/requests")
      .set("Authorization", getAuthHeader())
      .send({
        employeeId: "emp1",
        leaveTypeId: "lt1",
        startDate: "2026-06-10",
        endDate: "2026-06-11",
      });
    expect(res.status).toBe(404);
  });

  it("returns 400 when insufficient balance", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    mockPrisma.leaveType.findUnique.mockResolvedValue({
      id: "lt1",
      isActive: true,
      annualQuota: 12,
    });
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({
      remaining: 0,
      pending: 0,
      used: 12,
      creditied: 12,
      openingBalance: 12,
    });
    const res = await request(app)
      .post("/api/leaves/requests")
      .set("Authorization", getAuthHeader())
      .send({
        employeeId: "emp1",
        leaveTypeId: "lt1",
        startDate: "2026-06-10",
        endDate: "2026-06-11",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });
});

describe("GET /api/leaves/dashboard", () => {
  it("returns dashboard stats", async () => {
    mockPrisma.leaveType.count.mockResolvedValue(3);
    mockPrisma.leaveRequest.count.mockResolvedValue(10);
    const res = await request(app)
      .get("/api/leaves/dashboard")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("totalLeaveTypes");
  });
});
