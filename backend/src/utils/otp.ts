export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOtpExpiry = (): Date => {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};