const service = require("./service");
const { successResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user),
      "Audit logs fetched successfully"
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
      "Audit log summary fetched successfully"
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
      "Audit log created successfully",
      201
    );
  } catch (e) {
    next(e);
  }
};
