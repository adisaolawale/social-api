const Joi = require('joi')

// Update post validation
const sendMessageValidator = (data) => {
    const schema = Joi.object({
        content: Joi.string()
            .min(3)
            .max(200)
            .required()
            .messages({
                'string.min': 'Content must be atleast 3 characters',
                'string.max': 'Content cannot exceed 255 characters',
                'any.required': 'Content is required'
            })
    });

    return schema.validate(data, { abortEarly: false })
}


module.exports = {
    sendMessageValidator
} 