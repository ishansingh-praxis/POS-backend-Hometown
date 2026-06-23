const service = require("./service");
const { successResponse } = require("../../utils/response");

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await service.getDashboard(req.query, req.user || {});
    successResponse(res, data, "Manager dashboard fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const storeCode = req.user?.role === "ADMIN" ? req.query.storeCode || req.user.storeCode : req.user?.storeCode;
    const data = await service.getOverview(storeCode, req.query.businessDate);
    successResponse(res, data, "Manager dashboard summary fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.getSessions = async (req, res, next) => {
  try {
    const data = await service.getSessions(req.query, req.user || {});
    successResponse(res, data, "Cashier sessions fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.getCashierPerformance = async (req, res, next) => {
  try {
    const storeCode = req.user?.role === "ADMIN" ? req.query.storeCode || req.user.storeCode : req.user?.storeCode;
    const data = await service.getCashierPerformance(storeCode, req.query.businessDate);
    successResponse(res, data, "Cashier performance fetched successfully");
  } catch (e) {
    next(e);
  }
};

exports.resolveException = async (req, res, next) => {
  try {
    const data = await service.resolveException(req.params.sessionId, req.body, req.user || {});
    successResponse(res, data, "Exception resolved successfully");
  } catch (e) {
    next(e);
  }
};

exports.closeStoreDay = async (req, res, next) => {
  try {
    const data = await service.closeStoreDay(req.body, req.user || {});
    successResponse(res, data, "Store day closed successfully");
  } catch (e) {
    next(e);
  }
};
