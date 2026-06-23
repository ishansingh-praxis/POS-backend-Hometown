const service = require("./customers.service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query),
      "Customer list fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.summary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.summary(req.query),
      "Customer summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.profile = async (req, res, next) => {
  try {
    const data = await service.profile(req.params.id);
    if (!data) return errorResponse(res, "Customer not found", 404);

    successResponse(res, data, "Customer profile fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return errorResponse(res, "Customer not found", 404);

    successResponse(res, data, "Customer fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.create(req.body),
      "Customer created successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};

exports.bulk = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.bulkCreate(Array.isArray(req.body) ? req.body : req.body.records || []),
      "Customer records imported successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body);
    if (!data) return errorResponse(res, "Customer not found", 404);

    successResponse(res, data, "Customer updated successfully");
  } catch (e) {
    next(e);
  }
};

exports.status = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.patchStatus(req.params.id, req.body.status),
      "Customer status updated successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    successResponse(res, null, "Customer deleted successfully");
  } catch (e) {
    next(e);
  }
};
