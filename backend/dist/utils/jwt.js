"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is missing in environment variables");
    }
    return secret;
};
const generateToken = (payload) => {
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn,
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, getJwtSecret());
};
exports.verifyToken = verifyToken;
