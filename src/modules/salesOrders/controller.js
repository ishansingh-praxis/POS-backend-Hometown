const service = require("./service");
const deliverySchedulesService = require("../deliverySchedules/service");
const { successResponse, errorResponse } = require("../../utils/response");

const create = async (req, res, next) => {
  try {
    const result = await service.createSalesOrder(req.body, req.user || {});
    return successResponse(res, result, "Sales order booked successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await service.listSalesOrders(req.query, req.user || {});
    return successResponse(res, result.data, "Sales orders fetched successfully", 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const order = await service.getSalesOrderById(req.params.salesOrderId);
    if (!order) return errorResponse(res, "Sales order not found", 404);

    return successResponse(res, order, "Sales order fetched successfully");
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const order = await service.updateStatus(req.params.salesOrderId, req.body.status, req.user || {});
    return successResponse(res, order, "Sales order status updated successfully");
  } catch (error) {
    next(error);
  }
};

const addPayment = async (req, res, next) => {
  try {
    const order = await service.addPayment(req.params.salesOrderId, req.body, req.user || {});
    return successResponse(res, order, "Payment recorded successfully");
  } catch (error) {
    next(error);
  }
};

const setDeliverySchedule = async (req, res, next) => {
  try {
    const schedule = await deliverySchedulesService.updateBySalesOrderId(req.params.salesOrderId, req.body);
    return successResponse(res, schedule, "Delivery schedule updated successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  get,
  updateStatus,
  addPayment,
  setDeliverySchedule,
};
