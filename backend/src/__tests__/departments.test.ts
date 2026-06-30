import request from "supertest";
import app from "../server";

jest.mock("../config/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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
});

describe("GET /api/departments", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/departments");
    expect(res.status).toBe(401);
  });

  it("returns departments list", async () => {
    mockPrisma.department.findMany.mockResolvedValue([
      { id: "d1", name: "Engineering" },
      { id: "d2", name: "HR" },
    ]);
    const res = await request(app)
      .get("/api/departments")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});

describe("POST /api/departments", () => {
  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", getAuthHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 409 when department already exists", async () => {
    mockPrisma.department.findUnique.mockResolvedValue({ id: "d1", name: "Engineering" });
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", getAuthHeader())
      .send({ name: "Engineering" });
    expect(res.status).toBe(409);
  });

  it("creates department successfully", async () => {
    mockPrisma.department.findUnique.mockResolvedValue(null);
    mockPrisma.department.create.mockResolvedValue({
      id: "d3",
      name: "Marketing",
      description: null,
    });
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", getAuthHeader())
      .send({ name: "Marketing" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Marketing");
  });

  it("returns 403 for EMPLOYEE role", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user2",
      name: "Employee",
      email: "emp@test.com",
      status: "ACTIVE",
      role: { name: "EMPLOYEE" },
    });
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", getAuthHeader("EMPLOYEE"))
      .send({ name: "NewDept" });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/departments/:id", () => {
  it("returns 404 when department not found", async () => {
    mockPrisma.department.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .put("/api/departments/nonexistent")
      .set("Authorization", getAuthHeader())
      .send({ name: "Updated" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/departments/:id", () => {
  it("returns 404 when department not found", async () => {
    mockPrisma.department.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete("/api/departments/nonexistent")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(404);
  });

  it("returns 400 when department has employees", async () => {
    mockPrisma.department.findUnique.mockResolvedValue({
      id: "d1",
      name: "Engineering",
      _count: { employees: 5 },
    });
    const res = await request(app)
      .delete("/api/departments/d1")
      .set("Authorization", getAuthHeader());
    expect(res.status).toBe(400);
  });
});
