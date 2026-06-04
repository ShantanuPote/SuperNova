const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');

describe('POST /api/orders — Create order from current cart', () => {

    const sampleAddress = {
        street: '123 Main St',
        city: 'Metropolis',
        state: 'CA',
        pincode: '90210',
        country: 'USA',
    };

    it('creates order from current cart', async () => {

        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie())
            .send({
                shippingAddress: sampleAddress
            })
            .expect('Content-Type', /json/)
            .expect(201);

        expect(res.body).toBeDefined();
        expect(res.body.order).toBeDefined();

        const { order } = res.body;

        expect(order._id).toBeDefined();
        expect(order.user).toBeDefined();
        expect(order.status).toBe('PENDING');

        expect(Array.isArray(order.items)).toBe(true);
        expect(order.items.length).toBeGreaterThan(0);

        for (const item of order.items) {

            expect(item.productId).toBeDefined();

            expect(item.quantity).toBeGreaterThan(0);

            expect(item.price).toBeDefined();

            expect(typeof item.price.amount).toBe('number');

            expect(['USD', 'INR']).toContain(
                item.price.currency
            );
        }

        expect(order.totalPrice).toBeDefined();

        expect(typeof order.totalPrice.amount)
            .toBe('number');

        expect(['USD', 'INR'])
            .toContain(order.totalPrice.currency);


        expect(order.shippingAddress)
            .toMatchObject({
                street: sampleAddress.street,
                city: sampleAddress.city,
                state: sampleAddress.state,
                pincode: sampleAddress.pincode,
                country: sampleAddress.country
            });
    });

    it('returns 400 when shipping address is missing', async () => {

        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie())
            .send({})
            .expect('Content-Type', /json/)
            .expect(400);

        expect(
            res.body.errors || res.body.message
        ).toBeDefined();
    });
});