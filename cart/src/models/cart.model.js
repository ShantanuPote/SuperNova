const mongoose = require('mongoose');

const cartSchema =new  mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items:{
        productID:{
           type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity:{
            type: Number,
            min:1,
            required:true
        }
    }
},{timestamp: true});

const cartModel = mongoose.model("cart",cartSchema);

module.exports = cartModel;