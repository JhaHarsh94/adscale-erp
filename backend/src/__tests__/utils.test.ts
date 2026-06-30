import { generateOtp, getOtpExpiry } from "../utils/otp";
import { hashPassword, comparePassword } from "../utils/password";
import { AppError } from "../utils/AppError";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption";

process.env.ENCRYPTION_KEY = "a".repeat(64);

describe("OTP utils", () => {
  it("generates a 6-digit numeric OTP", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("generates OTP within 100000–999999 range", () => {
    for (let i = 0; i < 20; i++) {
      const otp = Number(generateOtp());
      expect(otp).toBeGreaterThanOrEqual(100000);
      expect(otp).toBeLessThanOrEqual(999999);
    }
  });

  it("generates different OTPs each time (probabilistic)", () => {
    const otps = new Set(Array.from({ length: 10 }, () => generateOtp()));
    expect(otps.size).toBeGreaterThan(1);
  });

  it("returns expiry date in the future", () => {
    const expiry = getOtpExpiry();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("respects OTP_EXPIRES_MINUTES env var", () => {
    process.env.OTP_EXPIRES_MINUTES = "5";
    const before = Date.now();
    const expiry = getOtpExpiry();
    const after = Date.now();
    const diffMs = expiry.getTime() - (before + after) / 2;
    expect(diffMs).toBeGreaterThan(4 * 60 * 1000);
    expect(diffMs).toBeLessThan(6 * 60 * 1000);
    delete process.env.OTP_EXPIRES_MINUTES;
  });
});

describe("Password utils", () => {
  it("hashes a password and returns different value", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).not.toBe("mypassword");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("comparePassword returns true for correct password", async () => {
    const hash = await hashPassword("correct");
    const result = await comparePassword("correct", hash);
    expect(result).toBe(true);
  });

  it("comparePassword returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    const result = await comparePassword("wrong", hash);
    expect(result).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const hash1 = await hashPassword("same");
    const hash2 = await hashPassword("same");
    expect(hash1).not.toBe(hash2);
  });
});

describe("AppError", () => {
  it("creates error with correct statusCode", () => {
    const err = new AppError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("creates error with 400 status", () => {
    const err = new AppError("Bad request", 400);
    expect(err.statusCode).toBe(400);
  });

  it("creates error with 500 status", () => {
    const err = new AppError("Server error", 500);
    expect(err.statusCode).toBe(500);
  });
});

describe("Encryption utils", () => {
  it("encrypts and decrypts a string correctly", () => {
    const original = "my-secret-api-key-12345";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("encrypts same plaintext differently each time (random IV)", () => {
    const plain = "same-text";
    const enc1 = encrypt(plain);
    const enc2 = encrypt(plain);
    expect(enc1).not.toBe(enc2);
  });

  it("isEncrypted returns true for encrypted value", () => {
    const enc = encrypt("hello");
    expect(isEncrypted(enc)).toBe(true);
  });

  it("isEncrypted returns false for short/plaintext value", () => {
    expect(isEncrypted("plaintext")).toBe(false);
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
    process.env.ENCRYPTION_KEY = saved!;
  });
});
