const service = require("./dsrStorewise.service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user || {}),
      "DSR storewise data fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.summary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.summary(req.query, req.user || {}),
      "DSR storewise summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.topStores = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.topStores(req.query, req.user || {}),
      "Top DSR stores fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.channelSummary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.channelSummary(req.query, req.user || {}),
      "DSR channel summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.getByStore = async (req, res, next) => {
  try {
    const data = await service.getByStore(
      req.params.storeCode,
      req.query,
      req.user || {}
    );

    if (!data) return errorResponse(res, "DSR store data not found", 404);

    successResponse(res, data, "DSR store data fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.storeBreakups = async (req, res, next) => {
  try {
    const data = await service.storeBreakups(
      req.params.storeCode,
      req.query,
      req.user || {}
    );

    if (!data) return errorResponse(res, "DSR store breakup not found", 404);

    successResponse(res, data, "DSR store breakup fetched successfully");
  } catch (e) {
    next(e);
  }
};
