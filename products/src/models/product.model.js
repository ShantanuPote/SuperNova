const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    title:{
        required:true,
        type:String
    },
    description: {
        required:true,
        type:String
    },
    price:{
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            enum: ['USD', 'INR'],
            default: 'INR'
    }
    },
    seller:{
        type: mongoose.Schema.Types.ObjectId,
        required:true
    },
    image:[{
        url:String,
        thumbnail:String,
        id:String
    }]

})

productSchema.index({ title: 'text', description: 'text' });

const productModel = mongoose.model("product", productSchema);

exports.productModel = productModel;  