const successResponse = (res, data = null, message = "Success", statusCode = 200, meta = undefined) => res.status(statusCode).json({ success: true, statusCode, message, data, ...(meta ? { meta } : {}) });
const errorResponse = (res, message = "Something went wrong", statusCode = 500, error = null) => res.status(statusCode).json({ success: false, statusCode, message, error });
module.exports = { successResponse, errorResponse };
