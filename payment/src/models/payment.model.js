const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    order:{
        type:mongoose.Schema.Types.ObjectId,
        required: true
    },
    paymentId:{
        type:String
    },
    razorPayOrderId:{
        type: String,
        required:true
    },
    price:{
        amount:{
            type:Number,
            required:true
        },
        currency:{
            type:String,
            required: true,
            enum:["INR","USD"],
            default: "INR"
        }
    },
    signature:{
        type:String
    },
    status:{
        type:String,
        enum:["PENDING","COMPELETED","FAILED"],
        default:"PENDING"
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
},{timestamps: true})

const paymentModel = mongoose.model('payment', paymentSchema);

module.exports = paymentModel;