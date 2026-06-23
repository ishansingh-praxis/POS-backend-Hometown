const { errorResponse } = require("../utils/response");
const notFound = (req, res) => errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") return errorResponse(res, err.message, 400);
  if (err.code === 11000) return errorResponse(res, "Duplicate key error", 409, err.keyValue);
  return errorResponse(res, err.message || "Server error", err.statusCode || 500);
};
module.exports = { notFound, errorHandler };
