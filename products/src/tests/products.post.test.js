const request = require("supertest");
const jwt = require("jsonwebtoken");
const { getProductBySeller } = require("../controllers/product.controller");

jest.setTimeout(60000);



jest.mock("../services/imagekit.service", () => ({
  uploadImage: jest.fn(async () => ({
    url: "https://ik.mock/x",
    thumbnail: "https://ik.mock/t",
    id: "file_x"
  }))
}));

function buildAppWithMockedCreateProduct(createProductMock) {
  jest.resetModules();
  jest.doMock("../controllers/product.controller", () => ({
    createProduct: createProductMock,
    getProducts: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getProductById: jest.fn((req, res) => res.status(200).json({ success: true, data: null })),
    updateProduct: jest.fn((req, res) => res.status(200).json({ success: true, data: null })),
    deleteProduct: jest.fn((req, res) => res.status(200).json({ success: true, data: null })),
    getProductBySeller: jest.fn((req, res) => res.status(200).json({ success: true, data: null }))
  }));

  return require("../app");
}

describe("POST /api/products/", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret";
  });

  it("returns 401 when token is missing", async () => {
    const createProduct = jest.fn((req, res) => res.status(201).json({ success: true }));
    const app = buildAppWithMockedCreateProduct(createProduct);

    await request(app)
      .post("/api/products/")
      .set("Content-Type", "text/plain")
      .send("")
      .expect(401);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not allowed", async () => {
    const token = jwt.sign({ role: "user", id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
    const createProduct = jest.fn((req, res) => res.status(201).json({ success: true }));
    const app = buildAppWithMockedCreateProduct(createProduct);

    await request(app)
      .post("/api/products/")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("returns 400 when validation fails", async () => {
    const token = jwt.sign({ role: "admin", id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
    const createProduct = jest.fn((req, res) => res.status(201).json({ success: true }));
    const app = buildAppWithMockedCreateProduct(createProduct);

    const res = await request(app)
      .post("/api/products/")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Sample Product")
      .expect(400);

    expect(res.body).toMatchObject({ message: "Validation failed" });
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("calls controller for a valid multipart request", async () => {
    const token = jwt.sign({ role: "admin", id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
    const createProduct = jest.fn((req, res) => {
      return res.status(201).json({ success: true, data: { title: req.body.title } });
    });
    const app = buildAppWithMockedCreateProduct(createProduct);

    const res = await request(app)
      .post("/api/products/")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Sample Product")
      .field("description", "A sample description")
      .field("priceAmount", "19.99")
      .field("priceCurrency", "INR")
      .field("seller", "507f1f77bcf86cd799439011")
      .attach("image", Buffer.from("fake-image"), {
        filename: "test.png",
        contentType: "image/png",
      })
      .expect(201);

    expect(res.body).toMatchObject({ success: true });
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(createProduct.mock.calls[0][0].body).toMatchObject({
      title: "Sample Product",
      description: "A sample description",
      priceAmount: "19.99",
      priceCurrency: "INR",
      seller: "507f1f77bcf86cd799439011",
    });
  });
});
