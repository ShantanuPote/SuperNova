process.env.MONGOMS_STARTUP_TIMEOUT = '60000';
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '60000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const userModel = require('../models/user.model');

let mongoServer;

jest.setTimeout(60000);

const registerPayload = {
  username: 'logoutuser',
  email: 'logoutuser@example.com',
  password: 'secret123',
  fullName: {
    firstName: 'Logout',
    lastName: 'User'
  }
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'jest-auth', launchTimeout: 60000 }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await userModel.deleteMany({});
});

test('logs out an authenticated user', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(registerPayload);

  const cookieHeader = registerRes.headers['set-cookie'];

  const res = await request(app)
    .get('/api/auth/logout')
    .set('Cookie', cookieHeader);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.headers['set-cookie'])).toBe(true);
  expect(res.headers['set-cookie'].join(';')).toContain('token=');
});

test('rejects logout when not authenticated', async () => {
  const res = await request(app).get('/api/auth/logout');

  expect(res.status).toBe(401);
});
