import request from 'supertest';
import app from '../src/app';
import { clearUsers } from '../src/services/authService';

describe('Auth Service', () => {
  beforeEach(() => {
    clearUsers();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return error for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 6 characters');
    });

    it('should return error for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password456',
          name: 'Another User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
    it('should register with notification preference and phone number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'notif@example.com',
          password: 'password123',
          name: 'Notif User',
          notificationPreference: 'sms',
          phoneNumber: '+1234567890'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.notificationPreference).toBe('sms');
      expect(response.body.user.phoneNumber).toBe('+1234567890');
    });

    it('should credit the referrer when a valid referral code is used', async () => {
      // 1. Register User A (Referrer)
      const regAResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'referrer@example.com',
          password: 'password123',
          name: 'Referrer User'
        });
      
      const referralCode = regAResponse.body.user.referralCode;
      expect(referralCode).toBeDefined();

      // 2. Register User B (Referee) using User A's referral code
      const regBResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'referee@example.com',
          password: 'password123',
          name: 'Referee User',
          referralCodeUsed: referralCode
        });

      expect(regBResponse.status).toBe(201);

      // 3. Login as User A and check wallet balance
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'referrer@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.user.walletBalance).toBe(10);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    let validToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      validToken = registerResponse.body.token;
    });

    it('should verify a valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.userId).toBeDefined();
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should return error for malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('auth-service');
    });
  });
});
