const cookieParser = require("cookie-parser");
const express = require("express");
const productRoutes = require("./routes/product.routes");
const app = express()

app.use(express.json());
app.use(cookieParser());
app.use("/api/products", productRoutes);

module.exports = app;