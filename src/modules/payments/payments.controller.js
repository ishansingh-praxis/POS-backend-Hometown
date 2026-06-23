const service = require("./payments.service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user),
      "Payment list fetched successfully"
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
      "Payment summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return errorResponse(res, "Payment not found", 404);

    successResponse(res, data, "Payment fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.create(req.body),
      "Payment created successfully",
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
      "Payment records imported successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body);
    if (!data) return errorResponse(res, "Payment not found", 404);

    successResponse(res, data, "Payment updated successfully");
  } catch (e) {
    next(e);
  }
};

exports.status = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.patchStatus(req.params.id, req.body.status),
      "Payment status updated successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.refund = async (req, res, next) => {
  try {
    const data = await service.refund(req.params.id, req.body);
    if (!data) return errorResponse(res, "Payment not found", 404);

    successResponse(res, data, "Payment refunded successfully");
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    successResponse(res, null, "Payment deleted successfully");
  } catch (e) {
    next(e);
  }
};
