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
  username: 'meuser',
  email: 'meuser@example.com',
  password: 'secret123',
  fullName: {
    firstName: 'Me',
    lastName: 'User'
  }
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'jest-auth' }
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

test('returns current user when authenticated', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(registerPayload);

  const cookieHeader = registerRes.headers['set-cookie'];

  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookieHeader);

  expect(res.status).toBe(200);
  expect(res.body?.user?.email).toBe(registerPayload.email);
  expect(res.body?.user?.password).toBeUndefined();
});

test('rejects when not authenticated', async () => {
  const res = await request(app).get('/api/auth/me');

  expect(res.status).toBe(401);
});
