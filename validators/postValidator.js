const Joi = require('joi')

// Create post validation
const postValidator = (data) => {
    const schema = Joi.object({
        content: Joi.string()
            .min(1)
            .max(2000)
            .allow('', null)
            .messages({
                'string.max': 'Content cannot exceed 2000 characters',
            }),

        media_urls: Joi.array()
            .items(Joi.string().uri())
            .optional(),

        thumbnail_url: Joi.string()
            .uri()
            .optional()
            .allow('', null)
            .messages({
                'string.uri': 'Thumbnail URL must be a valid URL',
            }),

        media_type: Joi.string()
            .valid('image', 'video')
            .optional()
            .allow(null),
    })
        .or('content', 'media_urls')
        .messages({
            'object.missing': 'Post must have content or media',
        });

    return schema.validate(data, { abortEarly: false })
}


// Update post validation
const updatePostValidator = (data) => {
    const schema = Joi.object({
        content: Joi.string()
            .min(1)
            .max(2000)
            .required()
            .messages({
                'string.max': 'Content cannot exceed 2000 characters',
                'any.required': 'Content is required',
            }),
    });

    return schema.validate(data, { abortEarly: false })
}

module.exports = {
    postValidator,
    updatePostValidator
}