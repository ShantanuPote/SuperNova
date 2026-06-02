const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const { createAuthMiddleware } = require("../middlewares/auth.middleware");

jest.setTimeout(30000);

function buildPatchApp(updateProductMock) {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());

	app.patch(
		"/api/products/:id",
		createAuthMiddleware(["seller"]),
		updateProductMock
	);

	return app;
}

describe("PATCH /api/products/:id (SELLER)", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = "test_secret";
	});

	it("returns 401 when token is missing", async () => {
		const updateProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildPatchApp(updateProduct);

		await request(app)
			.patch("/api/products/507f1f77bcf86cd799439011")
			.set("Content-Type", "text/plain")
			.send("")
			.expect(401);

		expect(updateProduct).not.toHaveBeenCalled();
	});

	it("returns 401 when token is invalid", async () => {
		const updateProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildPatchApp(updateProduct);

		await request(app)
			.patch("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", "Bearer not-a-real-token")
			.send({ title: "New Title" })
			.expect(401);

		expect(updateProduct).not.toHaveBeenCalled();
	});

	it("returns 403 when role is not seller", async () => {
		const token = jwt.sign(
			{ role: "admin", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);
		const updateProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildPatchApp(updateProduct);

		await request(app)
			.patch("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "New Title" })
			.expect(403);

		expect(updateProduct).not.toHaveBeenCalled();
	});

	it("allows seller via Authorization Bearer token", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const updateProduct = jest.fn((req, res) => {
			return res.status(200).json({
				success: true,
				data: {
					id: req.params.id,
					updates: req.body,
					userId: req.user.id,
				},
			});
		});
		const app = buildPatchApp(updateProduct);

		const payload = {
			title: "Updated Title",
			description: "Updated description",
			priceAmount: 99.5,
			priceCurrency: "INR",
		};

		const res = await request(app)
			.patch("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.send(payload)
			.expect(200);

		expect(updateProduct).toHaveBeenCalledTimes(1);
		expect(updateProduct.mock.calls[0][0].params).toEqual({
			id: "507f1f77bcf86cd799439011",
		});
		expect(updateProduct.mock.calls[0][0].body).toMatchObject({
			title: "Updated Title",
			description: "Updated description",
			priceAmount: 99.5,
			priceCurrency: "INR",
		});
		expect(res.body).toMatchObject({ success: true });
	});

	it("allows seller via token cookie", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const updateProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildPatchApp(updateProduct);

		await request(app)
			.patch("/api/products/507f1f77bcf86cd799439011")
			.set("Cookie", [`token=${token}`])
			.send({ title: "Cookie Auth" })
			.expect(200);

		expect(updateProduct).toHaveBeenCalledTimes(1);
	});
});
