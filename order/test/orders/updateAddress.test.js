const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');
const orderModel = require('../../src/models/order.model');

describe('PATCH /api/orders/:id/address — Update delivery address prior to payment capture', () => {
    const orderId = '507f1f77bcf86cd799439012';

    const newAddress = {
        street: '456 Second St',
        city: 'Gotham',
        state: 'NY',
        pincode: '10001',
        country: 'USA',
    };

    beforeEach(async () => {
        await orderModel.deleteMany({});
    });

    it('updates shipping address and returns updated order', async () => {

        await orderModel.create({
            _id: orderId,
            user: '6a207c63337f78448b5baa61', // must match auth user
            items: [],
            status: 'PENDING',
            totalPrice: {
                amount: 0,
                currency: 'USD'
            },
            shippingAddress: {
                street: '123 Main St',
                city: 'Metropolis',
                state: 'NY',
                pincode: '10001',
                country: 'USA'
            }
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie())
            .send({ shippingAddress: newAddress })
            .expect('Content-Type', /json/)
            .expect(200);

        const orderResponse = res.body.order || res.body.data || res.body;

        expect(orderResponse.shippingAddress).toMatchObject({
            street: newAddress.street,
            city: newAddress.city,
            state: newAddress.state,
            pincode: newAddress.pincode,
            country: newAddress.country,
        });
    });

    it('returns 409 when address update is not allowed (e.g., after capture/shipping)', async () => {

        await orderModel.create({
            _id: orderId,
            user: '6a207c63337f78448b5baa61',
            items: [],
            status: 'SHIPPED',
            totalPrice: {
                amount: 0,
                currency: 'USD'
            },
            shippingAddress: {
                street: '123 Main St',
                city: 'Metropolis',
                state: 'NY',
                pincode: '10001',
                country: 'USA'
            }
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie())
            .send({ shippingAddress: newAddress })
            .expect('Content-Type', /json/)
            .expect(409);

        expect(
            res.body.error || res.body.message
        ).toMatch(/not.*allowed|cannot/i);
    });

    it('returns 400 when address is invalid', async () => {

        await orderModel.create({
            _id: orderId,
            user: '6a207c63337f78448b5baa61',
            items: [],
            status: 'PENDING',
            totalPrice: {
                amount: 0,
                currency: 'USD'
            },
            shippingAddress: {
                street: '123 Main St',
                city: 'Metropolis',
                state: 'NY',
                pincode: '10001',
                country: 'USA'
            }
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie())
            .send({
                shippingAddress: {
                    city: 'Nowhere'
                }
            })
            .expect('Content-Type', /json/)
            .expect(400);

        expect(
            res.body.errors || res.body.message
        ).toBeDefined();
    });
});