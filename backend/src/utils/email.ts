import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  purpose: string;
}

export const sendOtpEmail = async ({
  to,
  otp,
  purpose,
}: SendOtpEmailParams): Promise<void> => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log("=================================");
    console.log("OTP EMAIL DEVELOPMENT MODE");
    console.log(`To: ${to}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`OTP: ${otp}`);
    console.log("=================================");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || emailUser,
    to,
    subject: "AdScale One ERP Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>AdScale One ERP</h2>
        <p>Your OTP for ${purpose} is:</p>
        <h1 style="letter-spacing: 4px;">${otp}</h1>
        <p>This OTP will expire soon. Do not share it with anyone.</p>
      </div>
    `,
  });
};