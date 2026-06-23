const Inventory = require("./model");

const getStockStatus = (atpQty = 0) => {
  const atp = Number(atpQty || 0);

  if (atp <= 0) return "OUT_OF_STOCK";
  if (atp <= 2) return "LOW_STOCK";
  if (atp <= 5) return "LIMITED_STOCK";
  return "IN_STOCK";
};

const buildFilter = (query = {}, user = null) => {
  const filter = {};

  if (query.storeCode) filter.storeCode = String(query.storeCode);
  if (query.siteCode) filter.siteCode = String(query.siteCode);
  if (query.sku) filter.sku = String(query.sku);
  if (query.articleNo) filter.articleNo = String(query.articleNo);
  if (query.productId) filter.productId = String(query.productId);
  if (query.locationType) filter.locationType = query.locationType;
  if (query.stockStatus) filter.stockStatus = query.stockStatus;
  if (query.category) filter.category = new RegExp(query.category, "i");
  if (query.lob) filter.lob = new RegExp(query.lob, "i");
  if (query.brand) filter.brand = new RegExp(query.brand, "i");
  if (query.region) filter.region = new RegExp(query.region, "i");
  if (query.city) filter.city = new RegExp(query.city, "i");
  if (query.status) filter.status = query.status;

  if (query.posOnly === "true" || query.posOnly === true) {
    filter.locationType = "Store";
    filter.isPosEnabled = true;
    filter.atpQty = { $gt: 0 };
    filter.status = "ACTIVE";
  }

  if (query.lowStock === "true") {
    filter.stockStatus = { $in: ["LOW_STOCK", "LIMITED_STOCK"] };
  }

  if (query.outOfStock === "true") {
    filter.stockStatus = "OUT_OF_STOCK";
  }

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");

    filter.$or = [
      { productName: rx },
      { articleDescription: rx },
      { sku: rx },
      { articleNo: rx },
      { productId: rx },
      { category: rx },
      { mercCategory: rx },
      { brand: rx },
      { lob: rx },
      { storeName: rx },
      { siteName: rx },
    ];
  }

  if (user?.role === "MANAGER") {
    filter.storeCode = user.storeCode;
  }

  if (user?.role === "CASHIER") {
    filter.storeCode = user.storeCode;
    filter.locationType = "Store";
    filter.isPosEnabled = true;
  }

  return filter;
};

const list = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  const sort = {};
  if (query.sortBy === "atp") sort.atpQty = -1;
  else if (query.sortBy === "value") sort.mapValue = -1;
  else if (query.sortBy === "stock") sort.stockQty = -1;
  else sort.productName = 1;

  const [items, total] = await Promise.all([
    Inventory.find(filter).sort(sort).skip(skip).limit(limit),
    Inventory.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
  };
};

const getById = async (id) => {
  return Inventory.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { inventoryId: id },
      { sku: id },
      { articleNo: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });
};

const getByStoreSku = async (storeCode, sku) => {
  return Inventory.findOne({
    storeCode: String(storeCode),
    sku: String(sku),
    locationType: "Store",
    status: "ACTIVE",
  });
};

const summary = async (query = {}, user = null) => {
  const filter = buildFilter(query, user);

  const [overall] = await Inventory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        rows: { $sum: 1 },
        uniqueSkus: { $addToSet: "$sku" },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
        totalMrpValue: { $sum: "$stockValueMrp" },
        outOfStock: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "OUT_OF_STOCK"] }, 1, 0] },
        },
        lowStock: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "LOW_STOCK"] }, 1, 0] },
        },
        limitedStock: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "LIMITED_STOCK"] }, 1, 0] },
        },
        inStock: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "IN_STOCK"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        rows: 1,
        uniqueSkuCount: { $size: "$uniqueSkus" },
        totalStockQty: 1,
        totalAtpQty: 1,
        totalMapValue: 1,
        totalMrpValue: 1,
        outOfStock: 1,
        lowStock: 1,
        limitedStock: 1,
        inStock: 1,
      },
    },
  ]);

  const byLocationType = await Inventory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$locationType",
        rows: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { totalMapValue: -1 } },
  ]);

  const byLob = await Inventory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$lob",
        rows: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { totalMapValue: -1 } },
    { $limit: 20 },
  ]);

  const byCategory = await Inventory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$category",
        rows: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { totalMapValue: -1 } },
    { $limit: 20 },
  ]);

  return {
    overall: overall || {
      rows: 0,
      uniqueSkuCount: 0,
      totalStockQty: 0,
      totalAtpQty: 0,
      totalMapValue: 0,
      totalMrpValue: 0,
      outOfStock: 0,
      lowStock: 0,
      limitedStock: 0,
      inStock: 0,
    },
    byLocationType,
    byLob,
    byCategory,
  };
};

const lowStock = async (query = {}, user = null) => {
  return list({ ...query, lowStock: "true", sortBy: "atp" }, user);
};

const outOfStock = async (query = {}, user = null) => {
  return list({ ...query, outOfStock: "true" }, user);
};

const adjust = async (id, payload = {}) => {
  const inv = await getById(id);

  if (!inv) {
    const error = new Error("Inventory not found");
    error.statusCode = 404;
    throw error;
  }

  const newAtp = Number(payload.atpQty ?? inv.atpQty);
  const newStock = Number(payload.stockQty ?? inv.stockQty);

  return Inventory.findByIdAndUpdate(
    inv._id,
    {
      $set: {
        ...payload,
        atpQty: newAtp,
        availableQty: Number(payload.availableQty ?? newAtp),
        stockQty: newStock,
        stockStatus: getStockStatus(newAtp),
      },
    },
    { new: true }
  );
};

const reserve = async (id, quantity = 1) => {
  const inv = await getById(id);
  const qty = Number(quantity || 1);

  if (!inv || Number(inv.atpQty || 0) < qty) {
    const error = new Error("Not enough ATP quantity to reserve");
    error.statusCode = 400;
    throw error;
  }

  const afterAtp = Number(inv.atpQty || 0) - qty;

  return Inventory.findByIdAndUpdate(
    inv._id,
    {
      $inc: {
        atpQty: -qty,
        availableQty: -qty,
        reservedQty: qty,
      },
      $set: {
        stockStatus: getStockStatus(afterAtp),
      },
    },
    { new: true }
  );
};

const releaseReserve = async (id, quantity = 1) => {
  const inv = await getById(id);
  const qty = Number(quantity || 1);

  if (!inv) {
    const error = new Error("Inventory not found");
    error.statusCode = 404;
    throw error;
  }

  const afterAtp = Number(inv.atpQty || 0) + qty;

  return Inventory.findByIdAndUpdate(
    inv._id,
    {
      $inc: {
        atpQty: qty,
        availableQty: qty,
        reservedQty: -qty,
      },
      $set: {
        stockStatus: getStockStatus(afterAtp),
      },
    },
    { new: true }
  );
};

const replenishmentSuggestions = async (query = {}, user = null) => {
  const threshold = Number(query.threshold || 2);

  const storeFilter = {
    locationType: "Store",
    atpQty: { $lte: threshold },
    status: "ACTIVE",
  };

  if (query.storeCode) storeFilter.storeCode = String(query.storeCode);
  if (user?.role === "MANAGER") storeFilter.storeCode = user.storeCode;

  const storeItems = await Inventory.find(storeFilter).limit(200);

  const suggestions = [];

  for (const item of storeItems) {
    const source = await Inventory.findOne({
      sku: item.sku,
      locationType: { $in: ["RDC", "MDC"] },
      atpQty: { $gt: 0 },
      status: "ACTIVE",
    }).sort({ atpQty: -1 });

    if (source) {
      suggestions.push({
        storeCode: item.storeCode,
        storeName: item.storeName,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        lob: item.lob,
        storeAtpQty: item.atpQty,
        storeStockStatus: item.stockStatus,
        suggestedSourceSite: source.siteCode,
        sourceName: source.siteName,
        sourceType: source.locationType,
        sourceAtpQty: source.atpQty,
        suggestedTransferQty: Math.min(
          Math.max(5 - Number(item.atpQty || 0), 1),
          Number(source.atpQty || 0)
        ),
      });
    }
  }

  return suggestions;
};

const bulkUpsert = async (records = []) => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of records) {
    if (!row.siteCode || !row.sku) {
      skipped++;
      continue;
    }

    const payload = {
      ...row,
      stockStatus: row.stockStatus || getStockStatus(row.atpQty),
      availableQty: Number(row.availableQty ?? row.atpQty ?? 0),
    };

    const result = await Inventory.updateOne(
      {
        siteCode: String(row.siteCode),
        sku: String(row.sku),
      },
      {
        $set: payload,
      },
      {
        upsert: true,
      }
    );

    if (result.upsertedCount) inserted++;
    else updated++;
  }

  return {
    inserted,
    updated,
    skipped,
    total: records.length,
  };
};

module.exports = {
  list,
  getById,
  getByStoreSku,
  summary,
  lowStock,
  outOfStock,
  adjust,
  reserve,
  releaseReserve,
  replenishmentSuggestions,
  bulkUpsert,
  getStockStatus,
};
