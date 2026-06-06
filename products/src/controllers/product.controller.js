const productModel  = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');
const {publisToQueue, publishToQueue} = require('../broker/broker')


async function createProduct(req, res) {
  try{
    const {title, description, priceAmount, priceCurrency = "INR",stock} = req.body;

    if (!title || !priceAmount) {
      return res.status(400).json({ message: 'Title and priceAmount are required' });
    }

    const seller = req.body.seller || req.user?.id || req.body.id;

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency
     }
    

     const images = await Promise.all(
      (req.files || []).map((file) =>
        uploadImage({ buffer: file.buffer, fileName: file.originalname, folder: "Products" })
      )
    );

    const product = await productModel.create({
      title,
      description,
      price,
      seller,
      image: images,
      stock
    })

    await publishToQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", product)
    await publishToQueue("PRODUCT_NOTIFICATION.PRODUCT_CREATED", {
            email: req.user.email,
            productId: product._id,
            sellerId: seller,
            username: req.user.username
        });

     return res.status(201).json({
      messages: 'Product created',
      data: product
    });

     
  }catch(error){
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }

}

async function getProducts(req, res) {
  try {
    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

    const filter = {};

    if (q) {
      filter.$text = { $search: String(q) };
    }

    if (minprice != null || maxprice != null) {
      filter["price.amount"] = {};

      if (minprice != null) {
        filter["price.amount"].$gte = Number(minprice);
      }

      if (maxprice != null) {
        filter["price.amount"].$lte = Number(maxprice);
      }
    }

    const skipNumber = Math.max(Number(skip) || 0, 0);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const products = await productModel
      .find(filter)
      .skip(skipNumber)
      .limit(limitNumber);

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch products", details: error.message });
  }
}

async function getProductById(req,res){
  const { id } = req.params;

  const product = await productModel.findById(id);

  if(!product){
    return res.status(404).json({ message: "Product not found"});
  }

  return res.status(200).json({ product: product });
}

async function updateProduct(req, res){
  const {id } = req.params;

  if(!mongoose.Types.ObjectId.isValid(id)){
    return res.status(400).json({ message: 'invalid product id'})
  }

  const product = await productModel.findOne({
    _id: id,
    seller: req.user.id
  })

  if(!product){
    return res.status(404).json({message: 'product not found'})
  }

  if(product.seller.toString() !== req.user.id){
    return res.status(403).json({ message: 'Forbidden : you can only update your own product'})
  }

  const allowedUpdates = ['price','description', 'price']

  for(const key of Object.keys(req.body)){
    if(allowedUpdates.includes(key)){
      if(key === 'price' && typeof req.body.price === 'object'){
        if(req.body.price.amount !== undefined){
          product.price.amount = Number(req.body.price.amount);
        }
        if(req.body.price.currency !== undefined){
          product.price.currency = req.body.price.currency
        }else {
          product [ key ] = req.body[ key];
        }
      }
    }
  }

  await product.save();
  return res.status(200).json({message: 'product updated', data:product})




}

async function deleteProduct(req, res){
  const {id } = req.params;

  if(!mongoose.Types.ObjectId.isValid(id)){
    return res.status(400).json({ message: 'invalid product id'})
  }

  const product = await productModel.findOne({
    _id: id,
  })

  if(!product){
    return res.status(404).json({message: 'product not found'})
  }

  if(product.seller.toString() !== req.user.id){
    return res.status(403).json({ message: 'Forbidden : you can only delete your own product'})
  }

  await productModel.findOneAndDelete({_id : id})
  return res.status(200).json({message: "Product deleted"})
}

async function getProductBySeller(req, res) {
  try {
    const seller = req.user;

    const { skip = 0, limit = 20 } = req.query;

    const products = await productModel
      .find({ seller: seller.id })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 20));

    return res.status(200).json({
      data: products
    });

  } catch (error) {
    console.error("GET PRODUCT BY SELLER ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}



module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductBySeller };
