const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.MONGOMS_DOWNLOAD_PROGRESS = "1";
process.env.MONGOMS_STARTUP_TIMEOUT = "120000";
process.env.MONGOMS_START_TIMEOUT = "120000";

jest.setTimeout(180000);

// Mock imagekit service so the app can load without external calls
jest.mock("../services/imagekit.service", () => ({
	uploadImage: jest.fn(async () => ({
		url: "https://ik.mock/x",
		thumbnail: "https://ik.mock/t",
		id: "file_x",
	})),
}));

const app = require("../app");
const { productModel: Product } = require("../models/product.model");

describe("GET /api/products", () => {
	let mongo;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		const uri = mongo.getUri();
		await mongoose.connect(uri);
		await Product.syncIndexes();
	});

	afterAll(async () => {
		if (mongoose.connection.readyState === 1) {
			await mongoose.connection.dropDatabase();
			await mongoose.connection.close();
		}
		if (mongo) {
			await mongo.stop();
		}
	});

	afterEach(async () => {
		await Product.deleteMany({});
	});

	const createProduct = (overrides = {}) => {
		return Product.create({
			title: overrides.title ?? "Sample Product",
			description: overrides.description ?? "A great product",
			price: overrides.price ?? { amount: 100, currency: "USD" },
			seller: overrides.seller ?? new mongoose.Types.ObjectId(),
			image: overrides.image ?? [],
		});
	};

	it("returns empty list when no products exist", async () => {
		const res = await request(app).get("/api/products");
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body?.data)).toBe(true);
		expect(res.body.data.length).toBe(0);
	});

	it("returns all products", async () => {
		await Promise.all([
			createProduct({ title: "P1" }),
			createProduct({ title: "P2" }),
			createProduct({ title: "P3" }),
		]);
		const res = await request(app).get("/api/products");
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(3);
	});

	it("supports text search via q parameter", async () => {
		await Promise.all([
			createProduct({ title: "Red Shirt", description: "Cotton" }),
			createProduct({ title: "Blue Shirt", description: "Wool" }),
			createProduct({ title: "Green Pants", description: "Linen" }),
		]);

		const res = await request(app).get("/api/products").query({ q: "shirt" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(2);

		const titles = res.body.data.map((p) => p.title).sort();
		expect(titles).toEqual(expect.arrayContaining(["Red Shirt", "Blue Shirt"]));
	});

	it("filters by minprice and maxprice", async () => {
		await Promise.all([
			createProduct({ title: "Low", price: { amount: 50, currency: "USD" } }),
			createProduct({ title: "Mid", price: { amount: 100, currency: "USD" } }),
			createProduct({ title: "High", price: { amount: 150, currency: "USD" } }),
		]);

		let res = await request(app).get("/api/products").query({ minprice: "75" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(2);

		res = await request(app).get("/api/products").query({ maxprice: "120" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(2);

		res = await request(app)
			.get("/api/products")
			.query({ minprice: "60", maxprice: "120" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(1);
		expect(res.body.data[0].title).toBe("Mid");
	});

	it("supports pagination with skip and limit", async () => {
		await Promise.all([
			createProduct({ title: "P1" }),
			createProduct({ title: "P2" }),
			createProduct({ title: "P3" }),
			createProduct({ title: "P4" }),
			createProduct({ title: "P5" }),
		]);

		let res = await request(app).get("/api/products").query({ limit: "2" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(2);

		res = await request(app).get("/api/products").query({ skip: "2", limit: "2" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(2);

		res = await request(app).get("/api/products").query({ skip: "4", limit: "2" });
		expect(res.status).toBe(200);
		expect(res.body.data.length).toBe(1);
	});
});
