const service = require("./dsrSalesFact.service");
const { successResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.list(req.query, req.user || {}),
      "DSR facts fetched successfully"
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
      "DSR summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.storeSummary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.storeSummary(req.query, req.user || {}),
      "DSR store summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.articleSummary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.articleSummary(req.query, req.user || {}),
      "DSR article summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.categorySummary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.categorySummary(req.query, req.user || {}),
      "DSR category summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.customerSummary = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.customerSummary(req.query, req.user || {}),
      "DSR customer summary fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.onlineOrders = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.onlineOrders(req.query, req.user || {}),
      "Online/marketplace orders fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.replenishmentSignal = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.replenishmentSignal(req.query, req.user || {}),
      "DSR replenishment signal fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};
