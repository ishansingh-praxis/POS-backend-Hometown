const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const create = async (req, res, next) => {
  try {
    const bill = await service.holdBill(req.body, req.user || {});
    return successResponse(res, bill, "Bill held successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await service.listHeldBills(req.query, req.user || {});
    return successResponse(res, items, "Held bills fetched successfully");
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const bill = await service.getHeldBill(req.params.holdId);
    if (!bill) return errorResponse(res, "Held bill not found", 404);

    return successResponse(res, bill, "Held bill fetched successfully");
  } catch (error) {
    next(error);
  }
};

const recall = async (req, res, next) => {
  try {
    const bill = await service.recallHeldBill(req.params.holdId, req.user || {});
    return successResponse(res, bill, "Bill recalled successfully");
  } catch (error) {
    next(error);
  }
};

const voidHeld = async (req, res, next) => {
  try {
    const bill = await service.voidHeldBill(req.params.holdId, req.user || {});
    return successResponse(res, bill, "Held bill voided successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  get,
  recall,
  voidHeld,
};
