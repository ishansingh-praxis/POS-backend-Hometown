const DsrStorewise = require("./dsrStorewise.model");

const buildFilter = (query = {}, user = {}) => {
  const filter = {};

  if (query.businessMonth) filter.businessMonth = query.businessMonth;
  else filter.businessMonth = "2026-06";

  if (query.storeCode) filter.storeCode = String(query.storeCode);
  if (query.zone) filter.zone = new RegExp(query.zone, "i");
  if (query.city) filter.city = new RegExp(query.city, "i");
  if (query.channel) filter.salesChannel = String(query.channel).toUpperCase();

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { storeCode: rx },
      { storeName: rx },
      { city: rx },
      { zone: rx },
    ];
  }

  if (String(user.role || "").toUpperCase() === "MANAGER") {
    filter.storeCode = user.storeCode;
  }

  if (String(user.role || "").toUpperCase() === "CASHIER") {
    filter.storeCode = user.storeCode;
  }

  return filter;
};

const list = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  const sort = {};
  if (query.sortBy === "qty") sort.qty = -1;
  else if (query.sortBy === "customers") sort.customers = -1;
  else if (query.sortBy === "bills") sort.bills = -1;
  else sort.grossSales = -1;

  return DsrStorewise.find(filter).sort(sort).lean();
};

const getByStore = async (storeCode, query = {}, user = {}) => {
  const filter = buildFilter(
    {
      ...query,
      storeCode,
    },
    user
  );

  return DsrStorewise.findOne(filter).lean();
};

const summary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  const [row] = await DsrStorewise.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        stores: { $sum: 1 },
        rows: { $sum: "$rows" },
        bills: { $sum: "$bills" },
        articles: { $sum: "$articles" },
        customers: { $sum: "$customers" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossSales" },
        netSales: { $sum: "$netSales" },
        taxValue: { $sum: "$taxValue" },
        cogs: { $sum: "$cogs" },
        discount: { $sum: "$discount" },
        marginValue: { $sum: "$marginValue" },
      },
    },
    {
      $project: {
        _id: 0,
        stores: 1,
        rows: 1,
        bills: 1,
        articles: 1,
        customers: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        taxValue: 1,
        cogs: 1,
        discount: 1,
        marginValue: 1,
        averageBillValue: {
          $cond: [{ $gt: ["$bills", 0] }, { $divide: ["$grossSales", "$bills"] }, 0],
        },
      },
    },
  ]);

  return (
    row || {
      stores: 0,
      rows: 0,
      bills: 0,
      articles: 0,
      customers: 0,
      qty: 0,
      grossSales: 0,
      netSales: 0,
      taxValue: 0,
      cogs: 0,
      discount: 0,
      marginValue: 0,
      averageBillValue: 0,
    }
  );
};

const topStores = async (query = {}, user = {}) => {
  const limit = Math.min(Number(query.limit || 15), 100);
  const filter = buildFilter(query, user);

  return DsrStorewise.find(filter)
    .sort({ grossSales: -1 })
    .limit(limit)
    .select(
      "storeCode storeName city zone salesChannel rows bills articles customers qty grossSales netSales marginValue"
    )
    .lean();
};

// Hometown.in (ONLINE) and Marketplace (MARKETPLACE) are real revenue but not physical
// stores — roll them up separately so "top store" rankings aren't silently diluted by them.
const channelSummary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);
  delete filter.salesChannel;

  const rows = await DsrStorewise.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$salesChannel",
        stores: { $sum: 1 },
        grossSales: { $sum: "$grossSales" },
        bills: { $sum: "$bills" },
        customers: { $sum: "$customers" },
      },
    },
    {
      $project: {
        _id: 0,
        salesChannel: { $ifNull: ["$_id", "STORE"] },
        stores: 1,
        grossSales: 1,
        bills: 1,
        customers: 1,
      },
    },
    { $sort: { grossSales: -1 } },
  ]);

  const byChannel = (channel) =>
    rows.find((r) => r.salesChannel === channel)?.grossSales || 0;

  const storeSales = byChannel("STORE");
  const onlineSales = byChannel("ONLINE");
  const marketplaceSales = byChannel("MARKETPLACE");

  return {
    totalSales: storeSales + onlineSales + marketplaceSales,
    storeSales,
    onlineSales,
    marketplaceSales,
    digitalSales: onlineSales + marketplaceSales,
    channels: rows,
  };
};

const storeBreakups = async (storeCode, query = {}, user = {}) => {
  const store = await getByStore(storeCode, query, user);

  if (!store) return null;

  return {
    storeCode: store.storeCode,
    storeName: store.storeName,
    docTypeBreakup: store.docTypeBreakup || [],
    lobBreakup: store.lobBreakup || [],
    topCategories: store.topCategories || [],
    topArticles: store.topArticles || [],
    topCustomers: store.topCustomers || [],
    otcVsSalesOrder: store.otcVsSalesOrder || null,
  };
};

module.exports = {
  list,
  getByStore,
  summary,
  topStores,
  storeBreakups,
  channelSummary,
};
