const Joi = require('joi');

// Register validation
const registerValidator = (data) => {
    const schema = Joi.object({
        username: Joi.string()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.min': 'Name must be atleast 3 characters',
                'string.max': 'Name cannot exceed 50 characters',
                'any.required': 'Username is required'
            }),
        fullName: Joi.string()
            .min(3)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Name must be atleast 3 characters',
                'string.max': 'Name cannot exceed 50 characters'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(8)
            .max(32)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .required()
            .messages({
                'string.min': 'Password must be atleast 8 characters',
                'string.max': 'Password cannot exceed 32 characters',
                'string.email': 'Please provide a valid email',
                'any.required': 'Password is required'
            }),
    })

    return schema.validate(data, { abortEarly: false })
}


// Login validation
const loginValidator = (data) => {
    const schema = Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            }),
    })

    return schema.validate(data, { abortEarly: false })
}


// Update profile validation
const updateProfileValidator = (data) => {
    const schema = Joi.object({
        full_name: Joi.string()
            .min(3)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Name must be atleast 3 characters',
                'string.max': 'Name cannot exceed 50 characters'
            }),
        bio: Joi.string()
            .optional()
            .trim()
            .max(300)
            .messages({
                'string.max': 'Bio cannot exceed 300 characters'
            }),
        website: Joi.string()
            .optional()
            .trim()
            .uri()
            .messages({
                'string.uri': 'Website must be a valid URL'
            }),
        location: Joi.string()
            .optional()
            .trim()
            .max(100)
            .messages({
                'string.max': 'Location cannot exceed 300 characters'
            }),
    })

    return schema.validate(data, { abortEarly: false })
}

// Change password validator
const changePasswordValidator = (data) => {
    const schema = Joi.object({
        currentPassword: Joi.string()
            .required()
            .messages({
                'any.required': 'Current password is required'
            }),
        newPassword: Joi.string()
            .min(8)
            .max(32)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
            .required()
            .messages({
                'string.min': 'Password must be atleast 8 characters',
                'string.max': 'Password cannot exceed 32 characters',
                'string.email': 'Please provide a valid email',
                'any.required': 'Password is required'
            }),
    })

    return schema.validate(data, { abortEarly: false })
}


module.exports = {
    registerValidator,
    loginValidator,
    updateProfileValidator,
    changePasswordValidator
}