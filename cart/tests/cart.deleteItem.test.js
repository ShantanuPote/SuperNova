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

describe('DELETE /api/cart/items/:productId', () => {

    const userId = generateObjectId();
    const productId = generateObjectId();

    let token;

    beforeEach(() => {

        CartModel.__reset();

        token = signToken({
            _id: userId,
            role: 'user'
        });
    });

    test('removes item from cart', async () => {

        CartModel.__seed(userId, {
            user: userId,
            items: [
                {
                    productId,
                    quantity: 2
                }
            ],
            save: async function () {
                return this;
            }
        });

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Item removed from cart');
    });

    test('returns 404 if cart not found', async () => {

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('returns 404 if item not found', async () => {

        CartModel.__seed(userId, {
            user: userId,
            items: [],
            save: async function () {
                return this;
            }
        });

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('returns 401 without token', async () => {

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`);

        expect(res.status).toBe(401);
    });

    test('returns 403 for wrong role', async () => {

        const adminToken = signToken({
            _id: userId,
            role: 'admin'
        });

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
    });

});