const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user),
      "Inventory list fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.summary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.summary(req.query, req.user),
      "Inventory summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return errorResponse(res, "Inventory not found", 404);

    successResponse(res, data, "Inventory fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.lowStock = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.lowStock(req.query, req.user),
      "Low stock inventory fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.outOfStock = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.outOfStock(req.query, req.user),
      "Out of stock inventory fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.replenishmentSuggestions = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.replenishmentSuggestions(req.query, req.user),
      "Replenishment suggestions fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.adjust = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.adjust(req.params.id, req.body),
      "Inventory adjusted successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.reserve = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.reserve(req.params.id, req.body.quantity),
      "Inventory reserved successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.releaseReserve = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.releaseReserve(req.params.id, req.body.quantity),
      "Inventory reserve released successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.bulk = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body) ? req.body : req.body.records || [];

    successResponse(
      res,
      await service.bulkUpsert(records),
      "Inventory records imported successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};
