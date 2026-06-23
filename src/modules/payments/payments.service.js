const Model = require("./model");

const normalizePaymentPayload = (payload = {}) => {
  return {
    ...payload,
    paymentMethod: payload.paymentMethod || payload.paymentMode || "SAP_UNKNOWN",
    paymentMode: payload.paymentMode || payload.paymentMethod || "SAP_UNKNOWN",
    sourceSystem: payload.sourceSystem || "POS",
    amount: Number(payload.amount || 0),
  };
};

const buildFilter = (query = {}, user = null) => {
  const filter = {};

  [
    "status",
    "storeCode",
    "cashierId",
    "customerId",
    "orderId",
    "invoiceId",
    "paymentStatus",
    "paymentMode",
    "paymentMethod",
    "transactionType",
    "sourceSystem",
    "locationType",
    "customerCode",
    "sapBillingDocument",
    "sapSalesDocument",
  ].forEach((key) => {
    if (query[key]) filter[key] = query[key];
  });

  if (query.invoice) filter.sapBillingDocument = query.invoice;
  if (query.order) filter.sapSalesDocument = query.order;

  if (query.fromDate || query.toDate) {
    filter.paidAt = {};
    if (query.fromDate) filter.paidAt.$gte = new Date(query.fromDate);
    if (query.toDate) {
      const to = new Date(query.toDate);
      to.setHours(23, 59, 59, 999);
      filter.paidAt.$lte = to;
    }
  }

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { paymentId: rx },
      { orderId: rx },
      { invoiceId: rx },
      { sapBillingDocument: rx },
      { sapSalesDocument: rx },
      { customerName: rx },
      { customerCode: rx },
      { customerPhone: rx },
      { storeName: rx },
      { storeOrPlant: rx },
      { transactionReference: rx },
    ];
  }

  if (user && user.role !== "ADMIN" && user.storeCode) {
    filter.storeCode = user.storeCode;
  }

  return filter;
};

const list = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query, user);

  const [items, total] = await Promise.all([
    Model.find(filter)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Model.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const summary = async (query = {}, user = null) => {
  const filter = buildFilter(query, user);

  const [result] = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        capturedAmount: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", ["SUCCESS", "SAP_POSTED"]] },
              "$amount",
              0,
            ],
          },
        },
        refundedAmount: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", ["REFUNDED", "REFUNDED_OR_REVERSED"]] },
              "$amount",
              0,
            ],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "PENDING"] }, "$amount", 0],
          },
        },
        failedAmount: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", ["FAILED", "ZERO_OR_UNKNOWN"]] },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const byStatus = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { amount: -1 } },
  ]);

  const byMode = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$paymentMode",
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { amount: -1 } },
  ]);

  const byStore = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$storeCode",
        storeName: { $first: "$storeName" },
        storeOrPlant: { $first: "$storeOrPlant" },
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { amount: -1 } },
    { $limit: 30 },
  ]);

  return {
    totalPayments: result?.totalPayments || 0,
    totalAmount: Math.round(result?.totalAmount || 0),
    capturedAmount: Math.round(result?.capturedAmount || 0),
    refundedAmount: Math.round(result?.refundedAmount || 0),
    pendingAmount: Math.round(result?.pendingAmount || 0),
    failedAmount: Math.round(result?.failedAmount || 0),
    byStatus,
    byMode,
    byStore,
  };
};

const getById = (id) =>
  Model.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { paymentId: id },
      { invoiceId: id },
      { orderId: id },
      { sapBillingDocument: id },
      { transactionReference: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });

const create = (payload) => Model.create(normalizePaymentPayload(payload));

const bulkCreate = (records = []) =>
  Model.insertMany(records.map(normalizePaymentPayload), { ordered: false });

const update = (id, payload) => {
  delete payload._id;
  return Model.findByIdAndUpdate(id, normalizePaymentPayload(payload), {
    new: true,
  });
};

const remove = (id) => Model.findByIdAndDelete(id);

const patchStatus = (id, status) =>
  Model.findByIdAndUpdate(id, { paymentStatus: status }, { new: true });

const refund = async (id, payload = {}) => {
  const payment = await getById(id);
  if (!payment) return null;

  return Model.findByIdAndUpdate(
    payment._id,
    {
      $set: {
        paymentStatus: "REFUNDED_OR_REVERSED",
        refundReason: payload.reason || "Refund processed",
        refundedBy: payload.refundedBy || "ADMIN",
        refundedAt: new Date(),
      },
    },
    { new: true }
  );
};

module.exports = {
  list,
  summary,
  getById,
  create,
  bulkCreate,
  update,
  remove,
  patchStatus,
  refund,
};
