function successResponse(res, { message = 'Successful', data = null, meta = null, statusCode = 200 }) {
    const response = {
        success: true,
        message
    }

    if (data !== null) response.data = data
    if (meta !== null) response.meta = meta

    return res.status(statusCode).json(response)
}

function errorResponse(res, { message = 'Something went wrong', errors = null, statusCode = 500 }) {
    const response = {
        success: false,
        message
    }

    if (errors !== null) response.errors = errors

    return res.status(statusCode).json(response)
}


function paginationMeta({ page, limit, total }) {

    const totalPages = Math.ceil(total / limit)
    return {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,

    }
}

module.exports = {
    successResponse,
    errorResponse,
    paginationMeta
}


