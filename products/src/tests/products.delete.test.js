const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const { createAuthMiddleware } = require("../middlewares/auth.middleware");

jest.setTimeout(30000);

function buildDeleteApp(deleteProductMock) {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());

	app.delete(
		"/api/products/:id",
		createAuthMiddleware(["seller"]),
		deleteProductMock
	);

	return app;
}

function isMongoObjectId(value) {
	return /^[a-f\d]{24}$/i.test(String(value));
}

describe("DELETE /api/products/:id (SELLER)", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = "test_secret";
	});

	it("returns 401 when token is missing", async () => {
		const deleteProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/507f1f77bcf86cd799439011")
			.set("Content-Type", "text/plain")
			.send("")
			.expect(401);

		expect(deleteProduct).not.toHaveBeenCalled();
	});

	it("returns 401 when token is invalid", async () => {
		const deleteProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", "Bearer not-a-real-token")
			.expect(401);

		expect(deleteProduct).not.toHaveBeenCalled();
	});

	it("returns 403 when role is not seller", async () => {
		const token = jwt.sign(
			{ role: "admin", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);
		const deleteProduct = jest.fn((req, res) => res.status(200).json({ success: true }));
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.expect(403);

		expect(deleteProduct).not.toHaveBeenCalled();
	});

	it("allows seller via Authorization Bearer token", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const deleteProduct = jest.fn((req, res) => {
			return res.status(200).json({
				success: true,
				data: {
					id: req.params.id,
					deletedBy: req.user.id,
				},
			});
		});
		const app = buildDeleteApp(deleteProduct);

		const res = await request(app)
			.delete("/api/products/507f1f77bcf86cd799439011")
			.set("Authorization", `Bearer ${token}`)
			.expect(200);

		expect(deleteProduct).toHaveBeenCalledTimes(1);
		expect(deleteProduct.mock.calls[0][0].params).toEqual({
			id: "507f1f77bcf86cd799439011",
		});
		expect(res.body).toMatchObject({
			success: true,
			data: { id: "507f1f77bcf86cd799439011", deletedBy: "507f1f77bcf86cd799439012" },
		});
	});

	it("allows seller via token cookie", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const deleteProduct = jest.fn((req, res) => res.status(204).send());
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/507f1f77bcf86cd799439011")
			.set("Cookie", [`token=${token}`])
			.expect(204);

		expect(deleteProduct).toHaveBeenCalledTimes(1);
	});

	it("returns 400 for invalid product id", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const deleteProduct = jest.fn((req, res) => {
			if (!isMongoObjectId(req.params.id)) {
				return res.status(400).json({ success: false, message: "Invalid product id" });
			}
			return res.status(204).send();
		});
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/not-a-valid-id")
			.set("Authorization", `Bearer ${token}`)
			.expect(400);

		expect(deleteProduct).toHaveBeenCalledTimes(1);
	});

	it("returns 404 when product is not found", async () => {
		const token = jwt.sign(
			{ role: "seller", id: "507f1f77bcf86cd799439012" },
			process.env.JWT_SECRET
		);

		const deleteProduct = jest.fn((req, res) => {
			return res.status(404).json({ success: false, message: "Product not found" });
		});
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete("/api/products/507f1f77bcf86cd799439099")
			.set("Authorization", `Bearer ${token}`)
			.expect(404);

		expect(deleteProduct).toHaveBeenCalledTimes(1);
	});

	it("returns 403 when trying to delete another seller's product", async () => {
		const sellerA = "507f1f77bcf86cd799439012";
		const sellerB = "507f1f77bcf86cd799439013";
		const productId = "507f1f77bcf86cd799439011";

		const token = jwt.sign({ role: "seller", id: sellerA }, process.env.JWT_SECRET);

		// Simulated DB record owned by sellerB
		const productOwnerById = { [productId]: sellerB };

		const deleteProduct = jest.fn((req, res) => {
			const ownerId = productOwnerById[req.params.id];
			if (!ownerId) {
				return res.status(404).json({ success: false, message: "Product not found" });
			}
			if (ownerId !== req.user.id) {
				return res.status(403).json({ success: false, message: "Forbidden" });
			}
			delete productOwnerById[req.params.id];
			return res.status(204).send();
		});
		const app = buildDeleteApp(deleteProduct);

		await request(app)
			.delete(`/api/products/${productId}`)
			.set("Authorization", `Bearer ${token}`)
			.expect(403);

		expect(deleteProduct).toHaveBeenCalledTimes(1);
	});

	it("confirmation: deletes product and second delete returns 404", async () => {
		const seller = "507f1f77bcf86cd799439012";
		const productId = "507f1f77bcf86cd799439011";
		const token = jwt.sign({ role: "seller", id: seller }, process.env.JWT_SECRET);

		const products = {
			[productId]: { id: productId, seller },
		};

		const deleteProduct = jest.fn((req, res) => {
			if (!isMongoObjectId(req.params.id)) {
				return res.status(400).json({ success: false, message: "Invalid product id" });
			}

			const existing = products[req.params.id];
			if (!existing) {
				return res.status(404).json({ success: false, message: "Product not found" });
			}
			if (existing.seller !== req.user.id) {
				return res.status(403).json({ success: false, message: "Forbidden" });
			}

			delete products[req.params.id];
			return res.status(200).json({ success: true, message: "Product deleted" });
		});

		const app = buildDeleteApp(deleteProduct);

		const first = await request(app)
			.delete(`/api/products/${productId}`)
			.set("Authorization", `Bearer ${token}`)
			.expect(200);
		expect(first.body).toMatchObject({ success: true, message: "Product deleted" });

		await request(app)
			.delete(`/api/products/${productId}`)
			.set("Authorization", `Bearer ${token}`)
			.expect(404);
	});
});
