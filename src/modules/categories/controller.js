const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query),
      "Categories fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return errorResponse(res, "Category not found", 404);

    successResponse(res, data, "Category fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.generateFromInventory(),
      "Categories generated from ATP inventory successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.update(req.params.id, req.body),
      "Category updated successfully"
    );
  } catch (e) {
    next(e);
  }
};
