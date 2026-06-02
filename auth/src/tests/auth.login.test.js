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
  username: 'loginuser',
  email: 'loginuser@example.com',
  password: 'secret123',
  fullName: {
    firstName: 'Login',
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

test('logs in a user with valid credentials', async () => {
  await request(app).post('/api/auth/register').send(registerPayload);

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: registerPayload.email,
      password: registerPayload.password
    });

  expect(res.status).toBe(200);
  expect(res.body?.user?.email).toBe(registerPayload.email);
  expect(res.body?.user?.password).toBeUndefined();
  expect(Array.isArray(res.headers['set-cookie'])).toBe(true);
  expect(res.headers['set-cookie'].join(';')).toContain('token=');
});

test('rejects invalid password', async () => {
  await request(app).post('/api/auth/register').send(registerPayload);

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: registerPayload.email,
      password: 'wrong-password'
    });

  expect(res.status).toBe(401);
});

test('rejects missing fields', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'someone@example.com' });

  expect(res.status).toBe(400);
});
