import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { createUser, authenticateUser, deductBalance, getUserProfile, sendOrderNotification } from '../services/authService';
import { generateToken, verifyToken } from '../utils/jwt';
import { CreateUserDto, LoginDto, AuthResponse, VerifyTokenResponse } from '../types';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, notificationPreference, phoneNumber, referralCodeUsed }: CreateUserDto = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      } as AuthResponse);
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      } as AuthResponse);
      return;
    }

    const user = await createUser({ email, password, name, notificationPreference, phoneNumber, referralCodeUsed });
    const token = generateToken({ userId: user.id, email: user.email });

    const { password: _, ...userWithoutPassword } = user;

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 8 * 3600000),
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userWithoutPassword
    } as AuthResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({
      success: false,
      message: errorMessage
    } as AuthResponse);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginDto = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      } as AuthResponse);
      return;
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      } as AuthResponse);
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });
    const { password: _, ...userWithoutPassword } = user;

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 8 * 3600000),
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    } as AuthResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    } as AuthResponse);
  }
};

export const verifyTokenEndpoint = (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      valid: false,
      message: 'No authorization header provided'
    } as VerifyTokenResponse);
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      valid: false,
      message: 'Invalid authorization header format'
    } as VerifyTokenResponse);
    return;
  }

  const token = parts[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      valid: false,
      message: 'Invalid or expired token'
    } as VerifyTokenResponse);
    return;
  }

  res.status(200).json({
    valid: true,
    userId: decoded.userId,
    email: decoded.email
  } as VerifyTokenResponse);
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await getUserProfile(userId);
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(404).json({ success: false, message: 'User not found' });
  }
};

export const deductWalletBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { amount } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await deductBalance(userId, amount);
    res.status(200).json({ success: true, message: 'Balance deducted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const triggerOrderNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { transactionId, amount } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await sendOrderNotification(userId, transactionId, amount);
    res.status(200).json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

