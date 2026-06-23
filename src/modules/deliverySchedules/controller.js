const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const create = async (req, res, next) => {
  try {
    const schedule = await service.createSchedule({ ...req.body, storeCode: req.user?.storeCode || req.body.storeCode });
    return successResponse(res, schedule, "Delivery scheduled successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await service.listSchedules(req.query, req.user || {});
    return successResponse(res, items, "Delivery schedules fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getBySalesOrder = async (req, res, next) => {
  try {
    const schedule = await service.getBySalesOrderId(req.params.salesOrderId);
    if (!schedule) return errorResponse(res, "Delivery schedule not found", 404);

    return successResponse(res, schedule, "Delivery schedule fetched successfully");
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const schedule = await service.updateStatus(req.params.deliveryScheduleId, req.body.status);
    return successResponse(res, schedule, "Delivery schedule updated successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  getBySalesOrder,
  updateStatus,
};
