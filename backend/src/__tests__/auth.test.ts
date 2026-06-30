import request from "supertest";
import app from "../server";

jest.mock("../config/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    loginHistory: {
      create: jest.fn(),
    },
    deviceSession: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    otpVerification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../utils/email", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

import prisma from "../config/prisma";

const mockPrisma = prisma as any;

const VALID_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.fake";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-only-minimum-32";
  process.env.JWT_EXPIRES_IN = "7d";
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "notexist@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not active", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      password: "$2a$10$hashed",
      status: "INACTIVE",
      role: { name: "EMPLOYEE" },
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/register", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "invalid", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it("returns 400 when name is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "test@example.com", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when user already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "password123", roleName: "EMPLOYEE" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nouser@example.com" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/auth/verify-otp", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ otp: "123456" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when OTP is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when OTP is invalid", async () => {
    mockPrisma.otpVerification.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: "test@example.com", otp: "000000" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when new password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "test@example.com", otp: "123456", newPassword: "short" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });
});

describe("GET /api/health", () => {
  it("returns healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("healthy");
  });
});
