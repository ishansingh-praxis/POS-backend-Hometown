const AuditLog = require("./model");

const generateAuditId = () => {
  return `AUDIT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const buildFilter = (query = {}, user = null) => {
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.module) filter.module = query.module;
  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.cashierId) filter.cashierId = query.cashierId;
  if (query.sessionId) filter.sessionId = query.sessionId;
  if (query.orderId) filter.orderId = query.orderId;
  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  if (query.customerPhone) filter.customerPhone = query.customerPhone;
  if (query.status) filter.status = query.status;

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { auditId: rx },
      { action: rx },
      { module: rx },
      { cashierName: rx },
      { orderId: rx },
      { invoiceId: rx },
      { customerPhone: rx },
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

const create = async (payload = {}, options = {}) => {
  const doc = {
    auditId: payload.auditId || generateAuditId(),
    ...payload,
  };

  if (options.session) {
    const [created] = await AuditLog.create([doc], { session: options.session });
    return created;
  }

  return AuditLog.create(doc);
};

const list = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query, user);

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
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

  const byAction = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byModule = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$module",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byCashier = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$cashierId",
        cashierName: { $first: "$cashierName" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return {
    byAction,
    byModule,
    byCashier,
  };
};

module.exports = {
  create,
  list,
  summary,
};
