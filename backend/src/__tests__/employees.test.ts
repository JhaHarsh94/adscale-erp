import request from "supertest";
import app from "../server";

jest.mock("../config/prisma", () => ({
  __esModule: true,
  default: {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    designation: {
      findUnique: jest.fn(),
    },
    reportingHierarchy: {
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    employeeDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    employeeSkill: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    employeeSalaryDetail: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    teamMember: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn({
      user: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      employee: {
        create: jest.fn().mockResolvedValue({ id: "emp1", employeeCode: "EMP001" }),
        update: jest.fn().mockResolvedValue({ id: "emp1" }),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      reportingHierarchy: { create: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
      employeeDocument: { deleteMany: jest.fn() },
      employeeSkill: { deleteMany: jest.fn() },
      employeeSalaryDetail: { deleteMany: jest.fn(), updateMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: "sal1" }) },
      teamMember: { deleteMany: jest.fn() },
      leaveRequest: { findUnique: jest.fn() },
      leaveBalance: { update: jest.fn(), findUnique: jest.fn() },
      leaveApprovalLog: { create: jest.fn() },
    })),
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
  mockPrisma.$transaction.mockImplementation((fn: any) => fn({
    user: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    employee: {
      create: jest.fn().mockResolvedValue({ id: "emp1", employeeCode: "EMP001" }),
      update: jest.fn().mockResolvedValue({ id: "emp1" }),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    reportingHierarchy: { create: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    employeeDocument: { deleteMany: jest.fn() },
    employeeSkill: { deleteMany: jest.fn() },
    employeeSalaryDetail: { deleteMany: jest.fn(), updateMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: "sal1" }) },
    teamMember: { deleteMany: jest.fn() },
    leaveRequest: { findUnique: jest.fn() },
    leaveBalance: { update: jest.fn(), findUnique: jest.fn() },
    leaveApprovalLog: { create: jest.fn() },
  }));
});

describe("GET /api/employees", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(401);
  });

  it("returns employees list with valid token", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp1", employeeCode: "E001", user: { name: "John" } },
    ]);
    const res = await request(app)
      .get("/api/employees")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("GET /api/employees/:id", () => {
  it("returns 404 when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get("/api/employees/nonexistent")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(404);
  });

  it("returns employee when found", async () => {
    const emp = { id: "emp1", employeeCode: "E001", user: { name: "John" } };
    mockPrisma.employee.findUnique.mockResolvedValue(emp);
    const res = await request(app)
      .get("/api/employees/emp1")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("emp1");
  });
});

describe("POST /api/employees", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/employees").send({});
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", getAuthHeader())
      .send({ name: "John" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid employment status", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: "user1", name: "Admin", email: "admin@test.com", status: "ACTIVE", role: { name: "SUPER_ADMIN" } })
      .mockResolvedValueOnce(null);
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: "role1", name: "EMPLOYEE" });
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", getAuthHeader())
      .send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        roleId: "role1",
        employeeCode: "EMP001",
        employmentStatus: "INVALID_STATUS",
      });
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: "user1", name: "Admin", email: "admin@test.com", status: "ACTIVE", role: { name: "SUPER_ADMIN" } })
      .mockResolvedValueOnce({ id: "existing" });
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", getAuthHeader())
      .send({
        name: "John Doe",
        email: "existing@example.com",
        password: "password123",
        roleId: "role1",
        employeeCode: "EMP001",
      });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/employees/:id", () => {
  it("returns 404 when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete("/api/employees/nonexistent")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(404);
  });
});

describe("Employee Skills", () => {
  it("GET /api/employees/:id/skills - returns 404 when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get("/api/employees/notfound/skills")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(404);
  });

  it("POST /api/employees/:id/skills - returns 400 when skillName missing", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    const res = await request(app)
      .post("/api/employees/emp1/skills")
      .set("Authorization", getAuthHeader())
      .send({ level: "BEGINNER" });
    expect(res.status).toBe(400);
  });
});

describe("Employee Documents", () => {
  it("POST /api/employees/:id/documents - returns 400 when name missing", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    const res = await request(app)
      .post("/api/employees/emp1/documents")
      .set("Authorization", getAuthHeader())
      .send({ type: "RESUME" });
    expect(res.status).toBe(400);
  });

  it("POST /api/employees/:id/documents - returns 400 for invalid doc type", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp1" });
    const res = await request(app)
      .post("/api/employees/emp1/documents")
      .set("Authorization", getAuthHeader())
      .send({ name: "My Resume", type: "INVALID_TYPE" });
    expect(res.status).toBe(400);
  });
});
