const Model = require("./accounting.model");
const Payment = require("../payments/model");
const Order = require("../orders/model");
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

// ---- Real finance views derived from actual payments/orders/invoices. There's
// no bank-statement feed to reconcile against, so "reconciliation" here means
// something honest and checkable: whether a settlement batch (store + channel +
// day) has had an AccountingEntry posted for it yet, not a fabricated bank match. ----
const round2 = (v) => Number(Number(v || 0).toFixed(2));
// Always anchor on a UTC date string first (defaulting to "today" in UTC) so a
// businessDate passed back in from a previous response always reproduces the
// exact same window — mixing local-time and UTC math here previously caused
// postSettlementBatch to re-aggregate a narrower range than getSettlementBatches saw.
const dayBounds = (date) => {
  const businessDate = date || new Date().toISOString().slice(0, 10);
  return {
    businessDate,
    start: new Date(`${businessDate}T00:00:00.000Z`),
    end: new Date(`${businessDate}T23:59:59.999Z`),
  };
};
const monthBounds = () => {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
};

const getSettlementBatches = async (query = {}) => {
  const { start, end, businessDate } = dayBounds(query.businessDate);

  const grouped = await Payment.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: "SUCCESS" } },
    {
      $group: {
        _id: { storeCode: "$storeCode", paymentMethod: "$paymentMethod" },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { amount: -1 } },
  ]);

  const batches = await Promise.all(
    grouped.map(async (g) => {
      const storeCode = g._id.storeCode || "UNKNOWN";
      const paymentMethod = g._id.paymentMethod || "OTHER";
      const batchKey = `${storeCode}__${paymentMethod}__${businessDate}`;

      const posted = await Model.findOne({ entryId: batchKey });

      return {
        batchId: batchKey,
        storeCode,
        channel: paymentMethod,
        businessDate,
        amount: round2(g.amount),
        paymentCount: g.count,
        status: posted ? "MATCHED" : "PENDING",
      };
    })
  );

  return batches;
};

const postSettlementBatch = async ({ storeCode, channel, businessDate: requestedDate }, user = {}) => {
  const { start, end, businessDate } = dayBounds(requestedDate);

  const [agg] = await Payment.aggregate([
    { $match: { storeCode, paymentMethod: channel, paymentStatus: "SUCCESS", createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  if (!agg || agg.amount <= 0) {
    const error = new Error("No payments found for this batch — nothing to post");
    error.statusCode = 400;
    throw error;
  }

  const entryId = `${storeCode}__${channel}__${businessDate}`;

  const existing = await Model.findOne({ entryId });
  if (existing) return existing;

  return Model.create({
    entryId,
    entityType: "SETTLEMENT_BATCH",
    entityId: entryId,
    storeCode,
    entryType: "SETTLEMENT",
    debitAccount: `${channel}_CLEARING`,
    creditAccount: "SALES",
    amount: round2(agg.amount),
    status: "POSTED",
    postedBy: user.name || user.email || "",
    paymentCount: agg.count,
  });
};

const getSummary = async (query = {}) => {
  const { start, end } = dayBounds(query.businessDate);
  const { start: mtdStart, end: mtdEnd } = monthBounds();

  const [collectionsAgg, invoicesToday, gstAgg, batches] = await Promise.all([
    Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: "SUCCESS" } },
      {
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          stores: { $addToSet: "$storeCode" },
          channels: { $addToSet: "$paymentMethod" },
        },
      },
    ]),
    Invoice.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: mtdStart, $lte: mtdEnd }, orderStatus: { $ne: "CANCELLED" } } },
      { $group: { _id: null, gstTotal: { $sum: "$gstTotal" } } },
    ]),
    getSettlementBatches(query),
  ]);

  const collections = collectionsAgg[0] || { amount: 0, stores: [], channels: [] };
  const pending = batches.filter((b) => b.status === "PENDING");

  return {
    todayCollections: round2(collections.amount),
    todayCollectionStores: (collections.stores || []).filter(Boolean).length,
    todayCollectionChannels: (collections.channels || []).filter(Boolean).length,
    pendingReconciliationAmount: round2(pending.reduce((s, b) => s + b.amount, 0)),
    pendingReconciliationBatches: pending.length,
    invoicesGeneratedToday: invoicesToday,
    gstLiabilityMtd: round2(gstAgg[0]?.gstTotal || 0),
  };
};

// Real CSV of taxable value + GST collected, grouped by GST rate, for the given
// date range — an honest "export", not a GST-portal filing integration.
const exportGstr1 = async (query = {}) => {
  const fromDate = query.fromDate ? new Date(`${query.fromDate}T00:00:00.000Z`) : monthBounds().start;
  const toDate = query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : new Date();

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: fromDate, $lte: toDate }, orderStatus: { $ne: "CANCELLED" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.gstPercent",
        taxableValue: { $sum: "$items.taxableAmount" },
        gstAmount: { $sum: "$items.gstAmount" },
        lineCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    gstPercent: r._id || 0,
    taxableValue: round2(r.taxableValue),
    gstAmount: round2(r.gstAmount),
    lineCount: r.lineCount,
  }));
};

module.exports = {
  list, getById, create, bulkCreate, update, remove, patchStatus,
  getSummary, getSettlementBatches, postSettlementBatch, exportGstr1,
};
