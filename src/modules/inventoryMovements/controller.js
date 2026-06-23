const service = require("./service");
const { successResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user),
      "Inventory movements fetched successfully"
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
      "Inventory movement summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.create(req.body),
      "Inventory movement created successfully",
      201
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
      await service.bulkCreate(records),
      "Inventory movement records imported successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};
