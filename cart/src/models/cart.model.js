const mongoose = require('mongoose');

const cartSchema =new  mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items:[{
        productId:{
           type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity:{
            type: Number,
            min:1,
            required:true
        }
    }]
},{timestamps: true});

const cartModel = mongoose.model("cart",cartSchema);

module.exports = cartModel;