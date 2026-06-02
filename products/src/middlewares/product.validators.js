const { body, validationResult } = require('express-validator');

const respondWithValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
	}
	next();
};

const createProductValidations = [
	body('title')
		.isString()
		.withMessage('Title must be a string')
		.trim()
		.notEmpty()
		.withMessage('Title is required'),
	body('description')
		.isString()
		.withMessage('Description must be a string')
		.trim()
		.notEmpty()
		.withMessage('Description is required')
		.isLength({ max: 500 })
		.withMessage('Description cannot exceed 500 characters'),
	body('priceAmount')
		.isFloat({ gt: 0 })
		.withMessage('Price amount must be a positive number')
		.notEmpty()
		.withMessage('Price amount is required'),
	body('priceCurrency')
		.optional()
		.isString()
		.withMessage('Price currency must be a string')
		.isIn(['USD', 'INR'])
		.withMessage('Price currency must be either USD or INR'),
	respondWithValidationErrors,
];

module.exports = { createProductValidations };
