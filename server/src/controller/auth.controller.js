const pendingPasswordResets = new Map();

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const otpCode = otpService.generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      pendingPasswordResets.delete(user.user_id);
    }, 5 * 60 * 1000);
    pendingPasswordResets.set(user.user_id, { otpCode, expiresAt, timeoutId });
    
    await otpService.sendOTP({ email }, otpCode, 'forgot-password');

    res.json({ 
      user_id: user.user_id,
      message: 'OTP sent to email if user exists' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Password reset request failed' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { userId, otpCode, newPassword } = req.body;
    if (!userId || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'userId, otpCode, and newPassword are required' });
    }
    const resetData = pendingPasswordResets.get(userId);
    if (!resetData) {
      return res.status(400).json({ error: 'OTP expired or invalid' });
    }
    if (resetData.expiresAt < Date.now()) {
      pendingPasswordResets.delete(userId);
      clearTimeout(resetData.timeoutId);
      return res.status(400).json({ error: 'OTP expired' });
    }
    if (String(resetData.otpCode) !== String(otpCode)) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.auth.update({
      where: { user_id: userId },
      data: { password_hash: hashedPassword }
    });
    clearTimeout(resetData.timeoutId);
    pendingPasswordResets.delete(userId);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const otpService = require('../services/otp.service');
const jwtService = require('../services/jwt.service');
const userCacheService = require('../services/user-cache.service');

const pendingRegistrations = new Map();

const pendingLogins = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [username, data] of pendingRegistrations.entries()) {
    if (data.expiresAt < now) pendingRegistrations.delete(username);
  }
  for (const [userId, data] of pendingLogins.entries()) {
    if (data.expiresAt < now) pendingLogins.delete(userId);
  }
}, 60000);

exports.register = async (req, res) => {
  try {
    const { full_name, username, email, password, phone } = req.body;

    if (!username || !password || (!email && !phone)) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username exists' });
    }
    
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email exists' });
      }
    }
    
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = otpService.generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const timeoutId = setTimeout(() => {
      pendingRegistrations.delete(username);
    }, 5 * 60 * 1000);

    pendingRegistrations.set(username, {
      userData: { full_name, username, email, phone, password: hashedPassword },
      otpCode, expiresAt, timeoutId
    });

    await otpService.sendOTP({ email, phone }, otpCode, 'register');

    res.status(200).json({ message: 'OTP sent. Please verify to complete registration.', expiresIn: 300 });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

exports.verifyRegistrationOTP = async (req, res) => {
  try {
    const { username, otpCode } = req.body;

    if (!username || !otpCode) {
      return res.status(400).json({ error: 'Username and OTP code are required' });
    }

    const registrationData = pendingRegistrations.get(username);

    if (!registrationData) {
      return res.status(400).json({ error: 'OTP expired or invalid. Please register again.' });
    }

    if (registrationData.expiresAt < Date.now()) {
      pendingRegistrations.delete(username);
      clearTimeout(registrationData.timeoutId);
      return res.status(400).json({ error: 'OTP expired. Please register again.' });
    }

    if (String(registrationData.otpCode) !== String(otpCode)) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    try {
      const { userData } = registrationData;
      const newUser = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          phone: userData.phone,
          full_name: userData.full_name,
          status_message: 'Hey there! I am using ConvoHub',
          verified: true,
          auth: { create: { password_hash: userData.password } },
        },
      });

      clearTimeout(registrationData.timeoutId);
      pendingRegistrations.delete(username);

      res.status(201).json({ 
        message: 'Registration successful.', 
        user: {
          user_id: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          full_name: newUser.full_name
        }
      });
    } catch (dbError) {
      return res.status(500).json({ error: 'Failed to create user. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'OTP verification failed. Please try again.' });
  }
};

exports.cancelRegistration = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const registrationData = pendingRegistrations.get(username);

    if (registrationData) {
      clearTimeout(registrationData.timeoutId);
      pendingRegistrations.delete(username);
      res.status(200).json({ message: 'Registration canceled successfully. You can register again.' });
    } else {
      res.status(404).json({ error: 'No pending registration found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
};

exports.resendRegistrationOTP = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const registrationData = pendingRegistrations.get(username);

    if (!registrationData) {
      return res.status(400).json({ 
        error: 'No pending registration found. Please register again.' 
      });
    }

    const newOtpCode = otpService.generateOTP();
    const newExpiresAt = Date.now() + 5 * 60 * 1000;

    clearTimeout(registrationData.timeoutId);
    const newTimeoutId = setTimeout(() => {
      pendingRegistrations.delete(username);
    }, 5 * 60 * 1000);

    registrationData.otpCode = newOtpCode;
    registrationData.expiresAt = newExpiresAt;
    registrationData.timeoutId = newTimeoutId;

    try {
      await otpService.sendOTP(
        { 
          email: registrationData.userData.email, 
          phone: registrationData.userData.phone 
        }, 
        newOtpCode, 
        'register'
      );

      res.status(200).json({ 
        message: 'OTP resent successfully. Please check your email/phone.',
        expiresIn: 300,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: newOtpCode })
      });
    } catch (sendError) {
      res.status(500).json({ 
        error: 'Failed to send OTP. Please try again.',
        ...(process.env.NODE_ENV !== 'production' && { devOTP: newOtpCode })
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

exports.getPendingRegistrations = () => pendingRegistrations;
exports.getPendingLogins = () => pendingLogins;

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      include: { auth: true }
    });

    if (!user || !user.auth) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(403).json({ 
        error: 'Account not verified. Please verify your account first.',
        userId: user.user_id,
        requiresVerification: true
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.auth.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const otpCode = otpService.generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const timeoutId = setTimeout(() => {
      pendingLogins.delete(user.user_id);
    }, 5 * 60 * 1000);

    pendingLogins.set(user.user_id, {
      otpCode, expiresAt, timeoutId,
      userData: { user_id: user.user_id, username: user.username, email: user.email, phone: user.phone }
    });

    try {
      const sendResult = await otpService.sendOTP(user, otpCode, 'login');
      
      res.json({
        message: 'OTP sent successfully',
        userId: user.user_id,
        username: user.username,
        otpSentTo: sendResult.method,
        destination: sendResult.method === 'console' ? 'Check terminal logs' : sendResult.destination,
        expiresIn: 300,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpCode })
      });
    } catch (otpError) {
      return res.status(500).json({ 
        error: 'Failed to send verification code. Please try again.',
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpCode })
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

exports.verifyLoginOTP = async (req, res) => {
  try {
    const { userId, username, otpCode } = req.body;

    if ((!userId && !username) || !otpCode) {
      return res.status(400).json({ error: 'Username (or User ID) and OTP code are required' });
    }

    let userIdToVerify;
    if (username) {
      const user = await prisma.user.findUnique({ where: { username }, select: { user_id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      userIdToVerify = user.user_id;
    } else {
      userIdToVerify = parseInt(userId);
    }

    const loginData = pendingLogins.get(userIdToVerify);
    if (!loginData) {
      return res.status(400).json({ error: 'OTP expired or invalid. Please login again.' });
    }

    if (loginData.expiresAt < Date.now()) {
      pendingLogins.delete(userIdToVerify);
      clearTimeout(loginData.timeoutId);
      return res.status(400).json({ error: 'OTP expired. Please login again.' });
    }

    if (String(loginData.otpCode) !== String(otpCode)) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    const userDetails = await prisma.user.findUnique({
      where: { user_id: userIdToVerify },
      select: { user_id: true, username: true, email: true, full_name: true, profile_pic: true, status_message: true, verified: true }
    });

    if (!userDetails) return res.status(404).json({ error: 'User not found' });
    if (!userDetails.verified) return res.status(403).json({ error: 'Account not verified' });

    const { accessToken, refreshToken } = await jwtService.generateTokens(userDetails);

    await prisma.auth.update({ where: { user_id: userDetails.user_id }, data: { last_login: new Date() } });

    clearTimeout(loginData.timeoutId);
    pendingLogins.delete(userIdToVerify);

    res.json({ message: 'Login successful', user: userDetails, accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { userId, username, otpType = 'login' } = req.body;
    if (!userId && !username) {
      return res.status(400).json({ error: 'Username or User ID is required' });
    }

    let user;
    if (username) {
      user = await prisma.user.findUnique({ where: { username }, select: { user_id: true, email: true, phone: true, verified: true } });
    } else {
      user = await prisma.user.findUnique({ where: { user_id: parseInt(userId) }, select: { user_id: true, email: true, phone: true, verified: true } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (otpType === 'login' && !user.verified) {
      return res.status(403).json({ error: 'Account not verified. Use otpType "register" to resend registration OTP.' });
    }
    if (otpType === 'register' && user.verified) {
      return res.status(400).json({ error: 'Account already verified. No need to resend registration OTP.' });
    }

    const { otpCode, expiresAt } = await otpService.createOTP(user.user_id, otpType);
    try {
      const sendResult = await otpService.sendOTP(user, otpCode, otpType);
      res.json({
        message: 'OTP resent successfully',
        otpSentTo: sendResult.method,
        destination: sendResult.method === 'console' ? 'Check terminal logs' : sendResult.destination,
        expiresAt,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpCode })
      });
    } catch (otpError) {
      return res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

exports.resendRegistrationOTP = async (req, res) => {
  try {
    const { userId, username } = req.body;
    if (!userId && !username) {
      return res.status(400).json({ error: 'Username or User ID is required' });
    }

    let user;
    if (username) {
      user = await prisma.user.findUnique({ where: { username }, select: { user_id: true, username: true, email: true, phone: true, verified: true } });
    } else {
      user = await prisma.user.findUnique({ where: { user_id: parseInt(userId) }, select: { user_id: true, username: true, email: true, phone: true, verified: true } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Account already verified. Please proceed to login.' });

    const { otpCode, expiresAt } = await otpService.createOTP(user.user_id, 'register');
    try {
      const sendResult = await otpService.sendOTP(user, otpCode, 'register');
      res.json({
        message: 'Registration OTP resent successfully',
        userId: user.user_id,
        username: user.username,
        otpSentTo: sendResult.method,
        destination: sendResult.method === 'console' ? 'Check terminal logs' : sendResult.destination,
        expiresAt,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpCode })
      });
    } catch (otpError) {
      return res.status(500).json({ 
        error: 'Failed to send verification code. Please check your email configuration.',
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpCode, userId: user.user_id, expiresAt })
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend registration OTP', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });

    const { accessToken, user } = await jwtService.refreshAccessToken(refreshToken);
    res.json({ message: 'Token refreshed successfully', accessToken, user });
  } catch (error) {
    res.status(401).json({ error: error.message || 'Failed to refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    await jwtService.revokeRefreshToken(req.user.user_id);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await userCacheService.getUserProfile(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

exports.cleanup = () => {
  if (cleanupInterval) clearInterval(cleanupInterval);
};