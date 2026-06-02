const express = require("express");
const upload = require("../middlewares/upload");
const { createAuthMiddleware } = require("../middlewares/auth.middleware");
const productValidator = require("../middlewares/product.validators");
const productController = require("../controllers/product.controller");


const router = express.Router();

// POST /api/products
router.post(
	"/",
	createAuthMiddleware(["admin", "seller"]),
	upload.array("image", 5),
	productValidator.createProductValidations,
	productController.createProduct
);

// GET /api/products
router.get("/", productController.getProducts);



// PATCH /api/products/:id (seller)
router.patch(
	"/:id",
	createAuthMiddleware(["seller"]),
	productController.updateProduct
);

router.delete(
	"/:id",
	createAuthMiddleware(["seller"]),
	productController.deleteProduct
);

router.get("/seller",createAuthMiddleware(["seller"]), productController.getProductBySeller)


//GET /api/products/:id
router.get("/:id", productController.getProductById);

module.exports = router;