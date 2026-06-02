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
  username: 'addressuser',
  email: 'addressuser@example.com',
  password: 'secret123',
  fullName: {
    firstName: 'Address',
    lastName: 'User'
  }
};

const validAddressPayload = {
  street: '221B Baker Street',
  city: 'London',
  state: 'London',
  country: 'UK',
  pincode: '560001',
};

const extractAddresses = (body) => {
  if (Array.isArray(body?.addresses)) return body.addresses;
  if (Array.isArray(body?.user?.addresses)) return body.user.addresses;
  if (Array.isArray(body?.data?.addresses)) return body.data.addresses;
  return null;
};

const extractAddress = (body) => {
  if (body?.address) return body.address;
  if (body?.data?.address) return body.data.address;
  if (body?.user?.address) return body.user.address;
  const addresses = extractAddresses(body);
  return Array.isArray(addresses) ? addresses[0] : null;
};

const extractAddressId = (address) => address?.id || address?._id || address?.addressId;

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

const registerAndGetCookie = async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(registerPayload);

  return registerRes.headers['set-cookie'];
};

test('adds an address with valid pincode ', async () => {
  const cookieHeader = await registerAndGetCookie();

  const res = await request(app)
    .post('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader)
    .send(validAddressPayload);
  expect(res.status).toBe(201);
  const createdAddress = extractAddress(res.body);
  expect(createdAddress).toBeTruthy();
  expect(createdAddress.pincode).toBe(validAddressPayload.pincode);
  
});

test('rejects invalid pincode', async () => {
  const cookieHeader = await registerAndGetCookie();

  const res = await request(app)
    .post('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader)
    .send({
      ...validAddressPayload,
      pincode: '12'
    });

  expect(res.status).toBe(400);
});

// test('rejects invalid phone', async () => {
//   const cookieHeader = await registerAndGetCookie();

//   const res = await request(app)
//     .post('/api/auth/users/me/addresses')
//     .set('Cookie', cookieHeader)
//     .send({
//       ...validAddressPayload,
//       phone: '1234'
//     });

//   expect(res.status).toBe(400);
// });

test('lists saved addresses with default marked', async () => {
  const cookieHeader = await registerAndGetCookie();

  const firstRes = await request(app)
    .post('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader)
    .send(validAddressPayload);

  const secondRes = await request(app)
    .post('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader)
    .send({
      ...validAddressPayload,
      street: '742 Evergreen Terrace',
      pincode: '560002'
    });

  expect(firstRes.status).toBe(201);
  expect(secondRes.status).toBe(201);

  const res = await request(app)
    .get('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader);

  expect(res.status).toBe(200);

  const addresses = extractAddresses(res.body);
  expect(Array.isArray(addresses)).toBe(true);
  expect(addresses.length).toBe(2);

  const defaultAddresses = addresses.filter(
    (address) => address?.isDefault === true || address?.default === true
  );

  expect(defaultAddresses.length).toBe(1);

  const firstAddress = extractAddress(firstRes.body);
  const firstAddressId = extractAddressId(firstAddress);
  const defaultAddressId = extractAddressId(defaultAddresses[0]);

  if (firstAddressId && defaultAddressId) {
    expect(defaultAddressId.toString()).toBe(firstAddressId.toString());
  }
});

test('removes an address by id', async () => {
  const cookieHeader = await registerAndGetCookie();

  const createRes = await request(app)
    .post('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader)
    .send(validAddressPayload);

  const createdAddress = extractAddress(createRes.body);
  const addressId = extractAddressId(createdAddress);

  const deleteRes = await request(app)
    .delete(`/api/auth/users/me/addresses/${addressId}`)
    .set('Cookie', cookieHeader);

  expect(deleteRes.status).toBe(200);

  const listRes = await request(app)
    .get('/api/auth/users/me/addresses')
    .set('Cookie', cookieHeader);

  expect(listRes.status).toBe(200);
  const addresses = extractAddresses(listRes.body) || [];
  expect(addresses.length).toBe(0);
});
