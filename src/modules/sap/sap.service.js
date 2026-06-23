const Model = require("./sap.model");
const Invoice = require("../invoices/model");

const buildFilter = (query = {}) => {
  const filter = {};
  ["status", "storeCode", "customerId", "orderId", "invoiceId", "sku", "role", "type", "module", "syncStatus", "paymentStatus", "orderStatus"].forEach((key) => {
    if (query[key]) filter[key] = query[key];
  });
  if (query.search) {
    const rx = new RegExp(query.search, "i");
    filter.$or = [{ name: rx }, { productName: rx }, { title: rx }, { email: rx }, { sku: rx }, { storeName: rx }, { customerId: rx }, { orderId: rx }];
  }
  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query);
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};
const getById = (id) => Model.findById(id);
const create = (payload) => Model.create(payload);
const bulkCreate = (records = []) => Model.insertMany(records, { ordered: false });
const update = (id, payload) => { delete payload._id; return Model.findByIdAndUpdate(id, payload, { new: true }); };
const remove = (id) => Model.findByIdAndDelete(id);
const patchStatus = (id, status) => Model.findByIdAndUpdate(id, { status }, { new: true });

// ---- Real sync-log bookkeeping. There's no live SAP/Tally/Razorpay connection
// configured for this system — this module queues and tracks sync attempts
// against our own real invoices, and is honest about not actually pushing
// anywhere. Wiring a real connector later only means filling in markSyncStatus
// from that connector's callback instead of an admin clicking a button. ----
const generateSyncId = () => `SYNC-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const queueSync = async ({ entityType, entityId, storeCode, target }) => {
  if (!entityType || !entityId) {
    const error = new Error("entityType and entityId are required to queue a sync");
    error.statusCode = 400;
    throw error;
  }

  const existing = await Model.findOne({ entityType, entityId, syncStatus: { $in: ["PENDING", "SYNCED"] } });
  if (existing) return existing;

  return Model.create({
    syncId: generateSyncId(),
    entityType,
    entityId,
    storeCode: storeCode || "",
    target: target || "SAP S/4 HANA",
    syncStatus: "PENDING",
    retryCount: 0,
    errorMessage: "",
  });
};

// Finds today's invoices that have never been queued for sync and queues them —
// this is what actually makes "Sync now" do something real instead of a no-op.
const queueUnsyncedInvoices = async (storeCode) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const filter = { createdAt: { $gte: start, $lte: end } };
  if (storeCode) filter.storeCode = storeCode;

  const invoices = await Invoice.find(filter).select("invoiceId storeCode billing.grandTotal");
  const alreadyQueued = await Model.find({ entityType: "INVOICE", entityId: { $in: invoices.map((i) => i.invoiceId) } }).select("entityId");
  const queuedSet = new Set(alreadyQueued.map((l) => l.entityId));

  const toQueue = invoices.filter((inv) => !queuedSet.has(inv.invoiceId));

  const created = await Promise.all(
    toQueue.map((inv) =>
      Model.create({
        syncId: generateSyncId(),
        entityType: "INVOICE",
        entityId: inv.invoiceId,
        storeCode: inv.storeCode || "",
        target: "SAP S/4 HANA",
        syncStatus: "PENDING",
        retryCount: 0,
        errorMessage: "",
      })
    )
  );

  return created;
};

const retrySync = async (id) => {
  const log = await Model.findById(id);
  if (!log) {
    const error = new Error("Sync log not found");
    error.statusCode = 404;
    throw error;
  }

  log.syncStatus = "RETRYING";
  log.retryCount = (log.retryCount || 0) + 1;
  log.errorMessage = "";
  await log.save();
  return log;
};

const markSyncStatus = async (id, syncStatus, errorMessage) => {
  if (!["PENDING", "SYNCED", "FAILED", "RETRYING"].includes(syncStatus)) {
    const error = new Error("Invalid sync status");
    error.statusCode = 400;
    throw error;
  }

  const update = { syncStatus };
  update.errorMessage = syncStatus === "FAILED" ? errorMessage || "" : "";

  const log = await Model.findByIdAndUpdate(id, update, { new: true });
  if (!log) {
    const error = new Error("Sync log not found");
    error.statusCode = 404;
    throw error;
  }

  return log;
};

const summary = async (query = {}) => {
  const filter = buildFilter(query);
  delete filter.syncStatus;

  const byStatus = await Model.aggregate([
    { $match: filter },
    { $group: { _id: "$syncStatus", count: { $sum: 1 } } },
  ]);

  const counts = { PENDING: 0, SYNCED: 0, RETRYING: 0, FAILED: 0 };
  byStatus.forEach((row) => { if (row._id && counts[row._id] !== undefined) counts[row._id] = row.count; });

  return counts;
};

module.exports = {
  list, getById, create, bulkCreate, update, remove, patchStatus,
  queueSync, queueUnsyncedInvoices, retrySync, markSyncStatus, summary,
};
