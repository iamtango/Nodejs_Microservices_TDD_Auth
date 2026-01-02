export interface User {
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

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  notificationPreference?: 'email' | 'sms';
  phoneNumber?: string;
  referralCodeUsed?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<User, 'password'>;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  message?: string;
}
