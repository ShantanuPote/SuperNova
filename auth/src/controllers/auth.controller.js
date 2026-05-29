const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redis = require('../db/redis')

async function registerUser(req, res) {
    try{
        const { username, email, password, fullName:{ firstName, lastName } } = req.body;
        
        const isUserAlredyExist = await userModel.findOne({
            $or:[
                { email },
                { username }
            ]
        });

        if(isUserAlredyExist){
            return res.status(409).json({ message: 'User with this email or name already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username,
            email,
            password: hashedPassword,
            fullName: {firstName, lastName}
        })

        const token = jwt.sign({
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie("token", token, {
            httpOnly: true,
            maxAge : 24 * 60 * 60 * 1000,
            secure: true
        });
        res.status(201).json({
            message: "User registered successfully",
            user:{
            id: user._id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        }
        })

    }catch(err){
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function loginUser(req, res){
    const { username, email, password} = req.body;

    const user = await userModel.findOne({
        $or:[
            {email},
            {username}
        ]
    }).select('+password')

    if(!user){
        res.status(401).json({message:"invalid Credentials"})
    }

    const isMatch = await bcrypt.compare(password, user.password || '');

    if(!isMatch){
        res.status(401).json({message:"invalid Credentials"})
    }

    const token = jwt.sign({
        id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
    },process.env.JWT_SECRET, {expiresIn: '1d'})

    res.cookie("token", token,{
        httpOnly: true,
        secure: true,
        maxAge : 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        message:"user login successfully",
        user:{
            id: user._id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        }
    })
}

async function getCurrentUser(req,res){
    return res.status(200).json({
        message: "Current user fetch successfully ",
        user: req.user
    })
}

async function logoutUser(req, res){

    const token = req.cookies.token

    if (!token) {
        return res.status(401).json({
        message: 'Unauthorized'
        });
    }

    if(token){
       await redis.set(`blacklist : ${token}`, 'true', 'EX', 24 *60 * 60);
    }

    res.clearCookie('token', {
        httpOnly: true,
        secure: true
    });
    return res.status(200).json({ message: 'Logged out successfully' });
}

async function getUserAddresses(req,res){
    const id = req.user.id;

    const user = await userModel.findById(id).select('addresses');

    if(!user){
        return res.status(404).json({message : "user not found"})
    }

    res.status(200).json({
        message: "Address fetch successfully",
        addresses: user.addresses
    })
}

async function addUserAddress(req,res){
    try{
        const id = req.user.id

        const {street, city, state, pincode, country, isDefault} = req.body;

        const user = await userModel.findById(id);

        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const shouldBeDefault = user.addresses.length === 0 || Boolean(isDefault);

        if (shouldBeDefault) {
            user.addresses.forEach((address) => {
                address.isDefault = false;
            });
        }

        user.addresses.push({
            street,
            city,
            state,
            pincode,
            country,
            isDefault: shouldBeDefault
        });

        await user.save();

        res.status(201).json({
            message: "Address added successfully",
            address: user.addresses[user.addresses.length -1 ]
        })

    }catch(err){
        console.error(err);
    return res.status(500).json({
      error: err.message})
    }

}

async function deleteUserAddress(req, res){
    try{
        const id = req.user.id

        const {addressId} = req.params;

        const user = await userModel.findOneAndUpdate({_id: id},{
            $pull:{
                addresses:{_id: addressId}
            }
        },{new: true})


        if(!user){
            return res.status(404).json({message: "User not found"})
        }

        const addressExists = user.addresses.some(addr => addr._id.toString() === addressId);
        if(addressExists){
            return res.status(500).json({message: "Failed to delete address"})
        }

        return res.status(200).json({
            message:"Address deleted successfully",
            addresses: user.addresses
        })

    }catch(err){
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}


module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
    logoutUser,
    getUserAddresses,
    addUserAddress,
    deleteUserAddress
};