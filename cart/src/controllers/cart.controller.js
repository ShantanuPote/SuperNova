const cartModel = require("../models/cart.model");


async function getCart(req, res){
    const user = req.user;
    
    let cart = await cartModel.findOne({ user: user._id});

    if(!cart){
        cart = new cartModel({user: user.id, items: []});
        await cart.save();
    }

    res.status(200).json({
        cart,
        totals:{
            itemCount: cart.items.length,
            totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0)
        }
    })
}

async function addItemToCart(req, res){
    
    try {
        const {productId, qty} = req.body;

        const user = req.user;

        let cart = await cartModel.findOne({ user: user._id});

        if(!cart){
           cart = new cartModel({ user: user._id, items: []});
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if(existingItemIndex >= 0){
            cart.items[ existingItemIndex].quantity += qty;
        }else{
          cart.items.push({ productId, quantity: qty})
        }

        await cart.save();

        res.status(200).json({
            message: 'Item added to cart',
            cart,
        });
    } catch (error) {
        console.error("ADD CART ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};

async function updateItemQuantity(req, res){

    const { productId}= req.params;
    const { qty} = req.body
    
    const user = req.user;

    const cart = await cartModel.findOne({user: user._id});

    if(!cart){
        return res.status(404).json({message: "Cart not found"});
    }

    const existingUserIndex = cart.items.findIndex(item => item.productId.toString() === productId )

    if(existingUserIndex < 0 ){
        return res.status(404).json({message: "Item not found"})
    }

    cart.items[existingUserIndex].quantity = qty;
    await cart.save();
    res.status(200).json({message: "Item updated",cart})
}

async function deleteItemFromCart(req, res){
    try{
        const {productId} = req.params;

        const user= req.user;

        const cart = await cartModel.findOne({ user: user._id});

        if(!cart){
            return res.status(404).json({message: "cart not found"})
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if(existingItemIndex < 0){
            return res.status(404).json({
                message:"Item not found in cart"
         })
        }

        cart.items.splice(existingItemIndex, 1)

        await cart.save();


        return res.status(200).json({
            message:"Item removed from cart",
            cart
        })
    }catch(error){
         return res.status(500).json({
            message: error.message
        });
    }
}

async function deleteCart(req, res){
    try{
        const user= req.user;

        const cart = await cartModel.findOne({ user: user._id});


        if(!cart){
            return res.status(404).json({message: "Cart not found"})
        }

        cart.items = []

        await cart.save();


        return res.status(200).json({
            message:"Cart cleared",
            cart
        })
    }catch(error){
         return res.status(500).json({
            message: error.message
        });
    }
}

module.exports = {
    addItemToCart,
    updateItemQuantity,
    getCart,
    deleteItemFromCart,
    deleteCart
}