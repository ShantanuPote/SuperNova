const express = require('express');
const orderModel = require('../models/order.model')
const createAuthMiddleware = require('../middelwares/auth.middleware')
const orderController = require('../controllers/order.controller')
const validation = require('../middelwares/validation.middleware')
const router = express.Router();


router.post('/',
    validation.createOrderValidation,
    createAuthMiddleware(["user"]),
    orderController.createOrder
)

router.get('/me',
    createAuthMiddleware(["user"]),
    orderController.getOrders
)

router.post('/:id/cancel',
    createAuthMiddleware(["user"]),
    orderController.cancelOrderById
    
)

router.patch('/:id/address',
    validation.updateAddressValidation,
    createAuthMiddleware(["user"]),
    orderController.updateOrderAddress
)

router.get('/:id',
    createAuthMiddleware(["user"]),
    orderController.getOrderById
)



module.exports = router