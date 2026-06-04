const orderModel = require('../models/order.model')
const axios = require("axios")
const mongoose = require('mongoose')

async function  createOrder(req, res) {
    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];
    try{
        const cartResponse = await axios.get(`http://localhost:3002/api/cart/`,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })


        const products = await Promise.all(cartResponse.data.cart.items.map(async (items) => {
            return (await axios.get(`http://localhost:3001/api/products/${items.productId}`,{
                headers:{
                    Authorization: `Bearer ${token}`
                }
            })).data.product 
        }))

        let priceAmount = 0;

        const orderItems = cartResponse.data.cart.items.map((item, index) => {
            const product = products.find(p => p._id.toString() === item.productId)

            if(product.stock < item.quantity){
                throw new Error (`Product ${product.title} is out of stock`)
            }

            const itemTotal = product.price.amount * item.quantity;
            priceAmount += itemTotal;

            return{
                productId: item.productId,
                quantity: item.quantity,
                price: {
                    amount:itemTotal,
                    currency: product.price.currency
                }
            }
        })

        if (!req.body.shippingAddress) {
            return res.status(400).json({
            message: "Shipping address is required"
            });
        }
        
        
        const order = await orderModel.create({
            user: user.id,
            items:orderItems,
            status:"PENDING",
            totalPrice:{
                amount: priceAmount,
                currency:'INR'
            },
            shippingAddress:{
                street: req.body.shippingAddress.street,
                city: req.body.shippingAddress.city,
                state: req.body.shippingAddress.state,
                pincode: req.body.shippingAddress.pincode,
                country: req.body.shippingAddress.country
            }

        })

    

        return res.status(201).json({
            message: "Order created successfully",
            order
        });

         
        
    } catch(err){

        console.log(err)
        res.status(500).json({
            message:"Internal server error",
            error: err.message
        })    
    }
}

async function getOrderById(req, res){
    try{
        const user = req.user
        const orderId  = req.params.id;

    if(!orderId){
        return res.status(400).json({Message: " order Id is required"})
    }
    
    if(!mongoose.Types.ObjectId.isValid(orderId)){
         return res.status(400).json({
                message: "Invalid Order ID"
        });
    }

   
    const order = await orderModel.findById(orderId)

    if(!order){
        return res.status(404).json({message: "Order not found"})
    }

     if(order.user.toString() !== user.id){
        return res.status(403).json({message: "Forbidden : you do not have access to this id"})
    }

    

    res.status(200).json({order})

    }catch(err){
        console.log(err)
        return res.status(500).json({
            message: err.message
        });
    }
}

async function getOrders(req, res){
    const user = req.user

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const orders = await orderModel.find({ user: user.id }).skip(skip).limit(limit).exec();
        const totalOrders = await orderModel.countDocuments({ user: user.id });

        res.status(200).json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit
            }
        })
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }
}

async function cancelOrderById(req, res){
    const orderId = req.params.id;
    const user = req.user;

    try{
        const order = await orderModel.findById(orderId);

        if(!order){
            return res.status(404).json({message: "Order not found"})
        }

        if(order.user.toString() !== user.id){
            return res.status(403).json({message: "Forbidden: You do not have access to this order"})
        }

        if(order.status !== "PENDING"){
           return res.status(409).json({ message: "Order cannot be cancelled at this stage" });
        }

         order.status = "CANCELLED"
         await order.save()

         res.status(200).json({ order });

    }catch(err){
        console.error(err);

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

async function updateOrderAddress(req, res){
    const orderId = req.params.id;
    const user = req.user

    try{
        if(!orderId){
            return res.status(400).json({Message: " order Id is required"})
        }
    
        if(!mongoose.Types.ObjectId.isValid(orderId)){
                return res.status(400).json({
                message: "Invalid Order ID"
            });
        }

        const order = await orderModel.findById(orderId);
        
        if(!order){
            return res.status(404).json({message: "Order not found"})
        }

        if(order.user.toString() !== user.id){
            return res.status(403).json({message: "Forbidden : you do not have access to this id"})
        }

        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order address cannot be updated at this stage" });
        }

        order.shippingAddress = {
            street: req.body.shippingAddress.street,
            city: req.body.shippingAddress.city,
            state: req.body.shippingAddress.state,
            pincode: req.body.shippingAddress.pincode,
            country: req.body.shippingAddress.country,
        };

        await order.save();

        res.status(200).json({ order });

        

    }catch(err){
        console.error(err);

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}

module.exports = {
    createOrder,
    getOrderById,
    getOrders,
    cancelOrderById,
    updateOrderAddress
}