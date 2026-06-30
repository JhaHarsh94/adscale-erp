import jwt from "jsonwebtoken";

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return secret;
};

export const generateToken = (payload: JwtTokenPayload): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtTokenPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtTokenPayload;
};