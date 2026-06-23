const InventoryMovement = require("./model");

const buildFilter = (query = {}, user = null) => {
  const filter = {};

  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.sku) filter.sku = query.sku;
  if (query.productId) filter.productId = query.productId;
  if (query.movementType) filter.movementType = query.movementType;
  if (query.cashierId) filter.cashierId = query.cashierId;
  if (query.sessionId) filter.sessionId = query.sessionId;
  if (query.orderId) filter.orderId = query.orderId;
  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  if (query.status) filter.status = query.status;

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { movementId: rx },
      { sku: rx },
      { productName: rx },
      { orderId: rx },
      { invoiceId: rx },
      { cashierName: rx },
    ];
  }

  if (user?.role === "MANAGER") {
    filter.storeCode = user.storeCode;
  }

  if (user?.role === "CASHIER") {
    filter.storeCode = user.storeCode;
    filter.cashierId = user.email || user.employeeCode;
  }

  return filter;
};

const list = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query, user);

  const [items, total] = await Promise.all([
    InventoryMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryMovement.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
  };
};

const summary = async (query = {}, user = null) => {
  const filter = buildFilter(query, user);

  const byType = await InventoryMovement.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$movementType",
        rows: { $sum: 1 },
        totalQty: { $sum: "$quantity" },
      },
    },
    { $sort: { rows: -1 } },
  ]);

  const bySku = await InventoryMovement.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$sku",
        productName: { $first: "$productName" },
        movements: { $sum: 1 },
        totalQty: { $sum: "$quantity" },
      },
    },
    { $sort: { movements: -1 } },
    { $limit: 50 },
  ]);

  const byCashier = await InventoryMovement.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$cashierId",
        cashierName: { $first: "$cashierName" },
        movements: { $sum: 1 },
        totalQty: { $sum: "$quantity" },
      },
    },
    { $sort: { movements: -1 } },
  ]);

  return {
    byType,
    bySku,
    byCashier,
  };
};

const create = async (payload = {}) => {
  return InventoryMovement.create(payload);
};

const bulkCreate = async (records = []) => {
  return InventoryMovement.insertMany(records, { ordered: false });
};

module.exports = {
  list,
  summary,
  create,
  bulkCreate,
};
