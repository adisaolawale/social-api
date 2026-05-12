const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Production REST API',
            version: '1.0.0',
            description: 'A production ready REST API built with Express, PostgreSQL, Redis and BullMQ',
            contact: {
                name: 'Olawale',
                email: 'adisaolawale10@gmail.com'
            },
        },
        servers: [
            {
                url: 'https://social-api-ereo.onrender.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
            },
            schemas: {
                // User schema
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        full_name: { type: 'string', example: 'Olawale Adisa' },
                        username: { type: 'string', example: 'adisaolawale' },
                        email: { type: 'string', example: 'adisaolawale10@gmail.com' },
                        bio: { type: 'string', example: 'Feeling good' },
                        avatar_url: { type: 'string', example: 'www.image.com/1' },
                        website: { type: 'string', example: 'adisa.com' },
                        location: { type: 'string', example: 'Lagos, Nigeria' },
                        role: { type: 'string', example: 'user' },
                        is_active: { type: 'boolean', example: true },
                        is_verified: { type: 'boolean', example: false },
                        is_private: { type: 'boolean', example: false },
                        email_verified_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        last_seen: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        updated_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Post schema
                Post: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        user_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        content: { type: 'string', example: 'This is my first post content' },
                        media_urls: { type: 'array', items: { type: 'string', example: 'www.image.com/1' } },
                        media_type: { type: 'string', example: 'image' },
                        is_published: { type: 'boolean', example: true },
                        likes_count: { type: 'integer', example: 10 },
                        comments_count: { type: 'integer', example: 5 },
                        shares_count: { type: 'integer', example: 0 },
                        views_count: { type: 'integer', example: 2 },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        updated_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Like schema
                Like: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        post_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        user_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        comment_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Comment schema
                Comment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        post_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        user_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        parent_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        content: { type: 'string', example: 'Great post!' },
                        likes_count: { type: 'integer', example: 2 },
                        replies_count: { type: 'integer', example: 3 },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        updated_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Follow schema
                Follow: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        follower_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        following_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Message schema
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        conversation_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        sender_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        parent_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        content: { type: 'string', example: 'Great post!' },
                        media_url: { type: 'string', example: 'www.image.com/1' },
                        message_type: { type: 'string', example: 'text' },
                        is_deleted: { type: 'boolean', example: false },
                        delivered_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        read_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Notification schema
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        recipient_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        sender_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        entity_id: { type: 'string', example: 'b6727d34-e1d8-4bb4-a603-ba366a405b1f' },
                        message: { type: 'string', example: 'Tunde just liked your post' },
                        type: { type: 'string', example: 'like_post' },
                        entity_type: { type: 'string', example: 'post' },
                        is_read: { type: 'boolean', example: false },
                        created_at: { type: 'string', example: '2026-03-01T00:00:00.000Z' }
                    },
                },
                // Token schema
                Token: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Successful' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string', example: 'eyjhGciJiUzI1NiIs...' },
                                refreshToken: { type: 'string', example: 'eyjhGciJiUzI1NiIs...' }
                            },
                        },
                    },
                },
                // Pagination schema
                Pagination: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer', example: 50 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 5 },
                        hasNextPage: { type: 'boolean', example: true },
                        hasPrevPage: { type: 'boolean', example: false }
                    },
                },
                // Error schema
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error message here' }
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./routes/*.js']
}

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
