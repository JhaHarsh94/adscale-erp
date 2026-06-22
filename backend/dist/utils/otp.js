"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtpExpiry = exports.generateOtp = void 0;
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOtp = generateOtp;
const getOtpExpiry = () => {
    const minutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
    return new Date(Date.now() + minutes * 60 * 1000);
};
exports.getOtpExpiry = getOtpExpiry;
