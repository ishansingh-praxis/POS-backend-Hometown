const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const getOrders = async (req, res, next) => {
  try {
    const result = await service.getOrders(req.query, req.user);
    return successResponse(res, result.data, "Orders fetched successfully", 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await service.getOrderById(req.params.id, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, order, "Order fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getOrderByOrderId = async (req, res, next) => {
  try {
    const order = await service.getOrderByOrderId(req.params.orderId, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, order, "Order fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getOrdersByStore = async (req, res, next) => {
  try {
    const result = await service.getOrdersByStore(req.params.storeCode, req.query, req.user);
    return successResponse(res, result.data, "Store orders fetched successfully", 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getOrderSummary = async (req, res, next) => {
  try {
    const summary = await service.getOrderSummary(req.query, req.user);
    return successResponse(res, summary, "Order summary fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getStoreOrderSummary = async (req, res, next) => {
  try {
    const summary = await service.getStoreOrderSummary(req.params.storeCode, req.user);
    return successResponse(res, summary, "Store order summary fetched successfully");
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const order = await service.createOrder(req.body);
    return successResponse(res, order, "Order created successfully", 201);
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    const order = await service.updateOrder(req.params.id, req.body, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, order, "Order updated successfully");
  } catch (error) {
    next(error);
  }
};

const updateOrderByOrderId = async (req, res, next) => {
  try {
    const order = await service.updateOrderByOrderId(req.params.orderId, req.body, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, order, "Order updated successfully");
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await service.cancelOrder(req.params.orderId, req.body, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, order, "Order cancelled successfully");
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await service.deleteOrder(req.params.id, req.user);
    if (!order) return errorResponse(res, "Order not found", 404);
    return successResponse(res, null, "Order deleted successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  getOrderByOrderId,
  getOrdersByStore,
  getOrderSummary,
  getStoreOrderSummary,
  createOrder,
  updateOrder,
  updateOrderByOrderId,
  cancelOrder,
  deleteOrder
};
