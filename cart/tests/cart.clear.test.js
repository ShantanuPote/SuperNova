const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

jest.mock('../src/models/cart.model', () => {

    const carts = new Map();

    class CartMock {
        constructor({ user, items }) {
            this.user = user;
            this.items = items || [];
        }

        static async findOne(query) {
            return carts.get(query.user) || null;
        }

        async save() {
            carts.set(this.user, this);
            return this;
        }
    }

    CartMock.__reset = () => carts.clear();

    CartMock.__seed = (user, cart) => {
        carts.set(user, cart);
    };

    return CartMock;
});

const CartModel = require('../src/models/cart.model');

function generateObjectId() {
    return Array.from(
        { length: 24 },
        () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

function signToken(payload) {
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

describe('DELETE /api/cart', () => {

    const userId = generateObjectId();

    beforeEach(() => {
        CartModel.__reset();
    });

    test('clears all cart items', async () => {

        const token = signToken({
            _id: userId,
            role: 'user'
        });

        CartModel.__seed(userId, {
            user: userId,
            items: [
                {
                    productId: generateObjectId(),
                    quantity: 2
                },
                {
                    productId: generateObjectId(),
                    quantity: 1
                }
            ],
            save: async function () {
                return this;
            }
        });

        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Cart cleared');
        expect(res.body.cart.items).toHaveLength(0);
    });

    test('returns 404 when cart does not exist', async () => {

        const token = signToken({
            _id: userId,
            role: 'user'
        });

        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Cart not found');
    });

    test('returns 401 when token is missing', async () => {

        const res = await request(app)
            .delete('/api/cart');

        expect(res.status).toBe(401);
    });

    test('returns 403 when role is not allowed', async () => {

        const token = signToken({
            _id: userId,
            role: 'admin'
        });

        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    test('returns 401 when token is invalid', async () => {

        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', 'Bearer invalid.token');

        expect(res.status).toBe(401);
    });

});