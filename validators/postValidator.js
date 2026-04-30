const Joi = require('joi')

// Create post validation
const postValidator = (data) => {
    const schema = Joi.object({
        media_type: Joi.string()
            .min(3)
            .max(255)
            .required()
            .messages({
                'string.min': 'Title must be atleast 3 characters',
                'string.max': 'Title cannot exceed 255 characters',
                'any.required': 'Title is required'
            }),

        content: Joi.string()
            .min(10)
            .required()
            .messages({
                'string.min': 'Content must be atleast 10 characters',

                'any.required': 'Content is required'
            }),

        media_urls: Joi.array()
            .items(Joi.string().uri().required())
            .allow('')
            .optional(),

        thumbnail_url: Joi.string()
            .uri()
            .optional()
            .allow('')
            .messages({
                'string.uri': 'Image URL must be a valid URL',
            }),
    });

    return schema.validate(data, { abortEarly: false })
}


// Update post validation
const updatePostValidator = (data) => {
    const schema = Joi.object({
        title: Joi.string()
            .min(3)
            .max(255)
            .messages({
                'string.min': 'Title must be atleast 3 characters',
                'string.max': 'Title cannot exceed 255 characters'
            }),

        content: Joi.string()
            .min(10)
            .messages({
                'string.min': 'Content must be atleast 10 characters'
            }),

        image_url: Joi.string()
            .uri()
            .optional()
            .allow('')
            .messages({
                'string.uri': 'Image URL must be a valid URL',
            }),
    });

    return schema.validate(data, { abortEarly: false })
}

module.exports = {
    postValidator,
    updatePostValidator
}