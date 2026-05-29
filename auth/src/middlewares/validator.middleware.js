const {body, validationResult} = require('express-validator');

const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const registerUserValidations =[
    body("username")
        .isString()
        .withMessage("Username must be a string")
        .isLength({min:3})
        .withMessage("Username must be at least 3"),
    body("email")
        .isEmail()
        .withMessage("Invalid email format"),
    body("password")
        .isLength({min:6})
        .withMessage("Password must be at least 6"),
    body("fullName.firstName")
        .isString()
        .withMessage("First name must be a string")
        .notEmpty()
        .withMessage("First name is required"),
    body("fullName.lastName")
        .isString()
        .withMessage("Last name must be a string")
        .notEmpty()
        .withMessage("Last name is required"),
    respondWithValidationErrors
]

const loginUserValidations = [
    body("email")
        .optional()
        .isEmail()
        .withMessage("invalid email address"),
    body("username")
        .optional()
        .isString()
        .withMessage("invalid username")
        .isLength({min:3})
        .withMessage("Username must be at least 3"),
    body("password")
        .isLength({min:6})
        .withMessage("Password must be at least 6"),
    (req, res, next) =>{
        const payload = req.body || {};
        if(!payload.email && !payload.username){
            return res.status(400).json({errors: [{msg:"Either email or username is required"}]});
        }
        respondWithValidationErrors(req, res, next);
    }    

]

const userAddressValidations = [
    body("street")
        .isString()
        .withMessage("Street must be string")
        .notEmpty()
        .withMessage("Street cannot be empty"),
    body("city")
        .isString()
        .withMessage("City must be string")
        .notEmpty()
        .withMessage("City cannot be empty"),
    body("state")
        .isString()
        .withMessage("State must be string")
        .notEmpty()
        .withMessage("State cannot be empty"),
    body("pincode")
        .isString()
        .isLength({ min: 6, max: 6 })
        .withMessage("Pincode must be string")
        .notEmpty()
        .withMessage("Pincode cannot be empty"),
    body("country")
        .isString()
        .withMessage("Country must be string")
        .notEmpty()
        .withMessage("Country cannot be empty"),
    body("isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
    respondWithValidationErrors
]

module.exports = {
    registerUserValidations,
    loginUserValidations,
    userAddressValidations
};
