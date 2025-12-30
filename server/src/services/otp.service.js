const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const prisma = new PrismaClient();

// Initialize Twilio client (for SMS)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const sendEmailWithResend = async (to, subject, html) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'ConvoHub <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${error.message || response.statusText}`);
  }

  return await response.json();
};

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

exports.generateOTP = generateOTP;

exports.createOTP = async (userId, otpType = 'login', txClient = null) => {
  try {
    // Ensure userId is a number
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Use transaction client if provided, otherwise use global prisma
    const client = txClient || prisma;

    // Delete any existing OTPs for this user and type
    await client.otp.deleteMany({
      where: { user_id: userIdInt, otp_type: otpType }
    });

    // Create new OTP
    const otp = await client.otp.create({
      data: {
        user_id: userIdInt,
        otp_code: otpCode, // Already a string
        otp_type: otpType,
        expires_at: expiresAt
      }
    });

    return { otpCode, expiresAt };
    
  } catch (error) {
    throw new Error('Failed to generate OTP');
  }
};

// Send OTP via Email (using Resend API)
exports.sendOTPEmail = async (email, otpCode, otpType) => {
  try {
    let subject, message;

    if (otpType === 'register') {
      subject = 'Welcome to ConvoHub - Verify Your Account';
      message = `Welcome to ConvoHub! Your verification code is:`;
    } else if (otpType === 'login') {
      subject = 'ConvoHub Login Verification';
      message = `Your ConvoHub login verification code is:`;
    } else if (otpType === 'reset') {
      subject = 'ConvoHub Password Reset';
      message = `Your ConvoHub password reset OTP is:`;
    } else {
      subject = 'ConvoHub Verification Code';
      message = `Your ConvoHub verification code is:`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>${subject}</h2>
        <p>${message}</p>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #4CAF50; margin: 0; letter-spacing: 5px;">${otpCode}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    // Use Resend API
    // await sendEmailWithResend(email, subject, html);

  } catch (error) {
    throw error;
  }
};

exports.sendOTP = async (user, otpCode, otpType) => {
  
  try {
    // Priority 1: Email (always works)
    if (user.email) {
      await this.sendOTPEmail(user.email, otpCode, otpType);
      return { success: true, method: 'email', destination: user.email };
    }
    
    throw new Error('No valid contact method available');
    
  } catch (error) {
    throw error;
  }
};

exports.verifyOTP = async (userId, otpCode, otpType = 'login') => {
  try {
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
    
    const user = await prisma.user.findUnique({
      where: { user_id: userIdInt }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const otp = await prisma.otp.findFirst({
      where: {
        user_id: userIdInt,
        otp_code: String(otpCode),
        otp_type: otpType,
        expires_at: { gte: new Date() }
      }
    });

    if (!otp) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    await prisma.otp.delete({
      where: { otp_id: otp.otp_id }
    });

    return { success: true, message: 'OTP verified successfully' };

  } catch (error) {
    throw error;
  }
};

exports.cleanupExpiredOTPs = async () => {
  try {
    const result = await prisma.otp.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { verified: true }
        ]
      }
    });
    return result.count;
  } catch (error) {
    throw new Error('Failed to cleanup OTPs');
  }
};