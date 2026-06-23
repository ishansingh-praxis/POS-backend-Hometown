const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(res, await service.list(req.query), "Products fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return errorResponse(res, "Product not found", 404);
    successResponse(res, data, "Product fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.bulk = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body) ? req.body : req.body.records || [];
    successResponse(res, await service.bulkUpsert(records), "Products imported successfully", 201);
  } catch (e) {
    next(e);
  }
};

exports.imageSummary = async (req, res, next) => {
  try {
    successResponse(res, await service.imageSummary(), "Product image summary fetched successfully");
  } catch (e) {
    next(e);
  }
};
