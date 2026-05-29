const express = require('express');
const authController = require('../controllers/auth.controller');
const validator = require('../middlewares/validator.middleware');
const authMiddleware = require('../middlewares/auth.middleware')
const router = express.Router();

router.post('/register', validator.registerUserValidations, authController.registerUser);
router.post('/login', validator.loginUserValidations, authController.loginUser);
router.get('/me', authMiddleware.authMiddleware, authController.getCurrentUser);
router.get('/logout', authController.logoutUser);
router.get('/users/me/addresses',authMiddleware.authMiddleware,authController.getUserAddresses)
router.post('/users/me/addresses',validator.userAddressValidations, authMiddleware
    .authMiddleware,authController.addUserAddress)
router.delete('/users/me/addresses/:addressId',authMiddleware.authMiddleware, authController.deleteUserAddress)

module.exports = router;