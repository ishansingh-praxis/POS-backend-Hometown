const Order = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.orderId) filter.orderId = query.orderId;
  if (query.orderNumber) filter.orderNumber = query.orderNumber;
  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.city) filter.city = query.city;
  if (query.state) filter.state = query.state;
  if (query.region) filter.region = query.region;
  if (query.zone) filter.zone = query.zone;
  if (query.channel) filter.channel = query.channel;
  if (query.orderType) filter.orderType = query.orderType;
  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.fulfillmentStatus) filter.fulfillmentStatus = query.fulfillmentStatus;
  if (query.paymentMode) filter.paymentMode = query.paymentMode;
  if (query.cashierId) filter.cashierId = query.cashierId;
  if (query.managerId) filter.managerId = query.managerId;
  if (query.customerPhone) filter.customerPhone = query.customerPhone;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.sapSyncStatus) filter.sapSyncStatus = query.sapSyncStatus;
  if (query.accountingStatus) filter.accountingStatus = query.accountingStatus;

  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  if (query.minAmount || query.maxAmount) {
    filter.grandTotal = {};
    if (query.minAmount) filter.grandTotal.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.grandTotal.$lte = Number(query.maxAmount);
  }

  if (query.q || query.search) {
    const search = new RegExp(query.q || query.search, "i");
    filter.$or = [
      { orderId: search },
      { orderNumber: search },
      { storeCode: search },
      { storeName: search },
      { customerName: search },
      { customerPhone: search },
      { customerEmail: search },
      { cashierName: search },
      { invoiceId: search },
      { "items.productName": search },
      { "items.sku": search }
    ];
  }

  return filter;
};

const scopeToStore = (filter, user) => {
  if (user && user.role !== "ADMIN" && user.storeCode) {
    filter.storeCode = user.storeCode;
  }
  return filter;
};

const getOrders = async (query = {}, user = null) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 50, 500);
  const skip = (page - 1) * limit;

  const filter = scopeToStore(buildFilter(query), user);

  const sort = {};
  if (query.sortBy === "amountHighLow") sort.grandTotal = -1;
  else if (query.sortBy === "amountLowHigh") sort.grandTotal = 1;
  else sort.createdAt = -1;

  const [data, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter)
  ]);

  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

const getOrderById = async (id, user = null) => {
  return Order.findOne(scopeToStore({ _id: id }, user));
};

const getOrderByOrderId = async (orderId, user = null) => {
  return Order.findOne(scopeToStore({ orderId }, user));
};

const getOrdersByStore = async (storeCode, query = {}, user = null) => {
  const finalQuery = scopeToStore({ ...query, storeCode }, user);
  return getOrders(finalQuery, user);
};

const getOrderSummary = async (query = {}, user = null) => {
  const filter = scopeToStore(buildFilter(query), user);

  const [totalOrders, paidOrders, partialOrders, cancelledOrders, pendingDeliveryOrders, salesAgg] =
    await Promise.all([
      Order.countDocuments(filter),
      Order.countDocuments({ ...filter, paymentStatus: "PAID" }),
      Order.countDocuments({ ...filter, paymentStatus: "PARTIAL" }),
      Order.countDocuments({ ...filter, orderStatus: "CANCELLED" }),
      Order.countDocuments({ ...filter, fulfillmentStatus: "PENDING_DELIVERY" }),
      Order.aggregate([
        { $match: { ...filter, orderStatus: { $ne: "CANCELLED" } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$grandTotal" },
            totalPaid: { $sum: "$paidAmount" },
            totalDue: { $sum: "$dueAmount" },
            avgOrderValue: { $avg: "$grandTotal" }
          }
        }
      ])
    ]);

  const sales = salesAgg[0] || { totalSales: 0, totalPaid: 0, totalDue: 0, avgOrderValue: 0 };

  return {
    totalOrders,
    paidOrders,
    partialOrders,
    cancelledOrders,
    pendingDeliveryOrders,
    totalSales: Math.round(sales.totalSales || 0),
    totalPaid: Math.round(sales.totalPaid || 0),
    totalDue: Math.round(sales.totalDue || 0),
    avgOrderValue: Math.round(sales.avgOrderValue || 0)
  };
};

const getStoreOrderSummary = async (storeCode, user = null) => {
  return getOrderSummary(scopeToStore({ storeCode }, user), user);
};

const createOrder = async (payload) => {
  return Order.create(payload);
};

const updateOrder = async (id, payload, user = null) => {
  delete payload._id;
  return Order.findOneAndUpdate(scopeToStore({ _id: id }, user), { $set: payload }, { new: true });
};

const updateOrderByOrderId = async (orderId, payload, user = null) => {
  delete payload._id;
  return Order.findOneAndUpdate(scopeToStore({ orderId }, user), { $set: payload }, { new: true });
};

const cancelOrder = async (orderId, payload = {}, user = null) => {
  return Order.findOneAndUpdate(
    scopeToStore({ orderId }, user),
    {
      $set: {
        orderStatus: "CANCELLED",
        paymentStatus: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: payload.cancelReason || "Cancelled from POS",
        cancelledBy: payload.cancelledBy || "SYSTEM"
      }
    },
    { new: true }
  );
};

const deleteOrder = async (id, user = null) => {
  return Order.findOneAndDelete(scopeToStore({ _id: id }, user));
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
