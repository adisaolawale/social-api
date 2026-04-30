const Joi = require('joi')

// Create comment validation
const commentValidator = (data) => {
    const schema = Joi.object({
        content: Joi.string()
            .min(1)
            .max(500)
            .required()
            .messages({
                'string.min': 'Comment cannot be empty',
                'string.max': 'Comment cannot exceed 500 characters',
                'any.required': 'Comment content is required'
            }),
    });

    return schema.validate(data, { abortEarly: false })
}


// Update comment validation
const updateCommentValidator = (data) => {
    const schema = Joi.object({
        content: Joi.string()
            .min(1)
            .max(500)
            .required()
            .messages({
                'string.min': 'Comment cannot be empty',
                'string.max': 'Comment cannot exceed 500 characters',
                'any.required': 'Comment content is required'
            }),
    });

    return schema.validate(data, { abortEarly: false })
}

module.exports = {
    commentValidator,
    updateCommentValidator
}