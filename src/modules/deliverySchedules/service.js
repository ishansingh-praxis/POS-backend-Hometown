const DeliverySchedule = require("./model");

const generateId = () => `DSCH-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const createSchedule = async (payload = {}, dbSession = null) => {
  if (!payload.salesOrderId && !payload.orderId) {
    const error = new Error("Either salesOrderId or orderId is required to schedule a delivery");
    error.statusCode = 400;
    throw error;
  }

  const doc = {
    deliveryScheduleId: generateId(),
    salesOrderId: payload.salesOrderId || "",
    orderId: payload.orderId || "",
    invoiceId: payload.invoiceId || "",
    storeCode: payload.storeCode,
    storeName: payload.storeName,
    customerPhone: payload.customerPhone || "",
    customerName: payload.customerName || "",
    deliveryOption: payload.deliveryOption || "HOME_DELIVERY",
    deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : undefined,
    deliverySiteCode: payload.deliverySiteCode || "",
    billingAddress: payload.billingAddress || {},
    shippingAddress: payload.shippingAddress || {},
    status: "PENDING",
  };

  if (dbSession) {
    const [created] = await DeliverySchedule.create([doc], { session: dbSession });
    return created;
  }

  return DeliverySchedule.create(doc);
};

const listSchedules = async (query = {}, user = {}) => {
  const filter = {};

  if (query.salesOrderId) filter.salesOrderId = query.salesOrderId;
  if (query.orderId) filter.orderId = query.orderId;
  if (query.status) filter.status = query.status;
  if (user.role !== "ADMIN" && user.storeCode) filter.storeCode = user.storeCode;
  else if (query.storeCode) filter.storeCode = query.storeCode;

  return DeliverySchedule.find(filter).sort({ createdAt: -1 }).limit(200);
};

const getBySalesOrderId = async (salesOrderId) => DeliverySchedule.findOne({ salesOrderId });

const updateBySalesOrderId = async (salesOrderId, payload = {}) => {
  const update = {};
  if (payload.deliveryOption) update.deliveryOption = payload.deliveryOption;
  if (payload.deliveryDate) update.deliveryDate = new Date(payload.deliveryDate);
  if (payload.deliverySiteCode) update.deliverySiteCode = payload.deliverySiteCode;
  if (payload.billingAddress) update.billingAddress = payload.billingAddress;
  if (payload.shippingAddress) update.shippingAddress = payload.shippingAddress;

  const schedule = await DeliverySchedule.findOneAndUpdate(
    { salesOrderId },
    { $set: update },
    { new: true }
  );

  if (!schedule) {
    const error = new Error("Delivery schedule not found for this sales order");
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

const updateStatus = async (deliveryScheduleId, status) => {
  const update = { status };
  if (status === "DISPATCHED") update.dispatchedAt = new Date();
  if (status === "DELIVERED") update.deliveredAt = new Date();

  const schedule = await DeliverySchedule.findOneAndUpdate(
    { deliveryScheduleId },
    { $set: update },
    { new: true }
  );

  if (!schedule) {
    const error = new Error("Delivery schedule not found");
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

module.exports = {
  createSchedule,
  listSchedules,
  getBySalesOrderId,
  updateBySalesOrderId,
  updateStatus,
};
