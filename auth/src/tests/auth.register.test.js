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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'jest-auth', launchTimeout: 60000 },
    // binary: { version: '6.0.5' }
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

test('registers a user', async () => {
  const payload = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'secret123',
    fullName: {
      firstName: 'Test',
      lastName: 'User'
    }
  };

  const res = await request(app).post('/api/auth/register').send(payload);

  expect(res.status).toBe(201);
  expect(res.body?.user?.email).toBe(payload.email);
  expect(res.body?.user?.password).toBeUndefined();
});

test('rejects duplicate email', async () => {
  const payload = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'secret123',
    fullName: {
      firstName: 'Test',
      lastName: 'User'
    }
  };

  await request(app).post('/api/auth/register').send(payload);
  const res = await request(app).post('/api/auth/register').send(payload);

  expect(res.status).toBe(409);
});

test('rejects missing fields', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });

  expect(res.status).toBe(400);
});
