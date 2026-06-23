const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const fetchInvoice = async (req, res, next) => {
  try {
    const order = await service.fetchInvoice(req.body, req.user || {});
    return successResponse(res, order, "Original bill fetched successfully");
  } catch (error) {
    next(error);
  }
};

const confirm = async (req, res, next) => {
  try {
    const result = await service.confirmReturn(req.body, req.user || {});
    return successResponse(res, result, "Return confirmed successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await service.listReturns(req.query, req.user || {});
    return successResponse(res, items, "Returns fetched successfully");
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const item = await service.getReturnById(req.params.returnId);
    if (!item) return errorResponse(res, "Return not found", 404);

    return successResponse(res, item, "Return fetched successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  fetchInvoice,
  confirm,
  list,
  get,
};
