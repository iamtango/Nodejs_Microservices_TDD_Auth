import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user';
import { CreateUserDto } from '../types';

interface UserResponse {
  id: string;
  email: string;
  password: string;
  name: string;
  notificationPreference?: 'email' | 'sms';
  phoneNumber?: string;
  referralCode: string;
  walletBalance: number;
  createdAt: Date;
}

import { sendRegistrationNotification, sendCreditNotification, sendOrderConfirmationNotification } from '../utils/notificationService';

// In-memory storage for testing
const inMemoryUsers: Map<string, UserResponse> = new Map();

// Check if we're in test mode
const isTestMode = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

export const createUser = async (userData: CreateUserDto): Promise<UserResponse> => {
  const existingUser = await findUserByEmail(userData.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  if (isTestMode()) {
    const referralCode = uuidv4().split('-')[0].toUpperCase();
    
    // Use in-memory storage for tests
    const user: UserResponse = {
      id: uuidv4(),
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      name: userData.name,
      notificationPreference: userData.notificationPreference,
      phoneNumber: userData.phoneNumber,
      referralCode,
      walletBalance: 0,
      createdAt: new Date()
    };

    // Handle Referral Credit in test mode
    if (userData.referralCodeUsed) {
      for (const [email, existingUser] of inMemoryUsers.entries()) {
        if (existingUser.referralCode === userData.referralCodeUsed) {
          existingUser.walletBalance += 10;
          inMemoryUsers.set(email, existingUser);
          
          // Notify Referrer
          sendCreditNotification({
            name: existingUser.name,
            email: existingUser.email,
            phoneNumber: existingUser.phoneNumber,
            notificationPreference: existingUser.notificationPreference
          }, 10);
          break;
        }
      }
    }

    inMemoryUsers.set(user.email, user);

    // Trigger mock notification
    sendRegistrationNotification(user);

    return user;
  }

  // Use MongoDB for production
  const referralCode = uuidv4().split('-')[0].toUpperCase();
  
  const user = new User({
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    name: userData.name,
    notificationPreference: userData.notificationPreference,
    phoneNumber: userData.phoneNumber,
    referralCode,
    walletBalance: 0
  });

  const savedUser = await user.save();

  // Handle Referral Credit
  if (userData.referralCodeUsed) {
    const referrer = await User.findOne({ referralCode: userData.referralCodeUsed });
    if (referrer) {
      referrer.walletBalance += 10;
      await referrer.save();
      
      // Notify Referrer
      sendCreditNotification({
        name: referrer.name,
        email: referrer.email,
        phoneNumber: referrer.phoneNumber || undefined,
        notificationPreference: referrer.notificationPreference as 'email' | 'sms'
      }, 10);
    }
  }
  
  const response: UserResponse = {
    id: savedUser._id.toString(),
    email: savedUser.email,
    password: savedUser.password,
    name: savedUser.name,
    notificationPreference: savedUser.notificationPreference as 'email' | 'sms' || undefined,
    phoneNumber: savedUser.phoneNumber || undefined,
    referralCode: savedUser.referralCode,
    walletBalance: savedUser.walletBalance,
    createdAt: savedUser.createdAt
  };

  // Trigger mock notification
  sendRegistrationNotification(response);

  return response;
};

export const findUserByEmail = async (email: string): Promise<UserResponse | null> => {
  const normalizedEmail = email.toLowerCase();
  
  if (isTestMode()) {
    // Use in-memory storage for tests
    const user = inMemoryUsers.get(normalizedEmail);
    return user || null;
  }

  // Use MongoDB for production
  const user = await User.findOne({ email: normalizedEmail });
  
  if (!user) {
    return null;
  }
  
  return {
    id: user._id.toString(),
    email: user.email,
    password: user.password,
    name: user.name,
    notificationPreference: user.notificationPreference as 'email' | 'sms' || undefined,
    phoneNumber: user.phoneNumber || undefined,
    referralCode: user.referralCode,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt
  };
};

export const findUserById = async (id: string): Promise<UserResponse | null> => {
  if (isTestMode()) {
    // Use in-memory storage for tests
    for (const user of inMemoryUsers.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  // Use MongoDB for production
  const user = await User.findById(id);
  
  if (!user) {
    return null;
  }
  
  return {
    id: user._id.toString(),
    email: user.email,
    password: user.password,
    name: user.name,
    notificationPreference: user.notificationPreference as 'email' | 'sms' || undefined,
    phoneNumber: user.phoneNumber || undefined,
    referralCode: user.referralCode,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt
  };
};

export const authenticateUser = async (email: string, password: string): Promise<UserResponse | null> => {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  return user;
};

export const clearUsers = (): void => {
  // Only clear in-memory storage (used for tests)
  inMemoryUsers.clear();
};

export const getUserCount = async (): Promise<number> => {
  if (isTestMode()) {
    return inMemoryUsers.size;
  }
  return await User.countDocuments();
};

export const deductBalance = async (userId: string, amount: number): Promise<void> => {
  if (isTestMode()) {
    for (const [email, user] of inMemoryUsers.entries()) {
      if (user.id === userId) {
        if (user.walletBalance < amount) {
          throw new Error('Insufficient wallet balance');
        }
        user.walletBalance -= amount;
        inMemoryUsers.set(email, user);
        return;
      }
    }
    throw new Error('User not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.walletBalance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  user.walletBalance -= amount;
  await user.save();
};

export const getUserProfile = async (userId: string): Promise<UserResponse> => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const sendOrderNotification = async (userId: string, transactionId: string, amount: number): Promise<void> => {
  const user = await findUserById(userId);
  if (user) {
    sendOrderConfirmationNotification({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      notificationPreference: user.notificationPreference
    }, transactionId, amount);
  }
};
