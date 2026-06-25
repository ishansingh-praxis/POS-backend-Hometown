const DsrSalesFact = require("./dsrSalesFact.model");

const buildFilter = (query = {}, user = {}) => {
  const filter = {};

  if (query.storeCode) filter.storeCode = String(query.storeCode);
  if (query.sku) filter.sku = String(query.sku);
  if (query.article) filter.article = String(query.article);
  if (query.docType) filter.docType = String(query.docType);
  if (query.lob) filter.lob = new RegExp(query.lob, "i");
  if (query.newLob) filter.newLob = new RegExp(query.newLob, "i");
  if (query.category) filter.category = new RegExp(query.category, "i");
  if (query.brand) filter.brand = new RegExp(query.brand, "i");
  if (query.customerPhone) filter.customerPhone = String(query.customerPhone);

  if (query.fromDate || query.toDate) {
    filter.businessDate = {};
    if (query.fromDate)
      filter.businessDate.$gte = new Date(`${query.fromDate}T00:00:00.000Z`);
    if (query.toDate)
      filter.businessDate.$lte = new Date(`${query.toDate}T23:59:59.999Z`);
  }

  if (query.q || query.search) {
    const rx = new RegExp(query.q || query.search, "i");
    filter.$or = [
      { sku: rx },
      { article: rx },
      { articleDescription: rx },
      { category: rx },
      { lob: rx },
      { newLob: rx },
      { customerName: rx },
      { customerPhone: rx },
      { salesDoc: rx },
      { storeName: rx },
    ];
  }

  if (user.role === "MANAGER") {
    filter.storeCode = user.storeCode;
  }

  if (user.role === "CASHIER") {
    filter.storeCode = user.storeCode;
  }

  return filter;
};

const list = async (query = {}, user = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query, user);

  const [items, total] = await Promise.all([
    DsrSalesFact.find(filter)
      .sort({ businessDate: -1, grossValue: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DsrSalesFact.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const summary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  const [row] = await DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        rows: { $sum: 1 },
        stores: { $addToSet: "$storeCode" },
        articles: { $addToSet: "$sku" },
        customers: { $addToSet: "$customerPhone" },
        totalQty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        taxValue: { $sum: "$taxValue" },
        cogs: { $sum: "$cogs" },
        discount: { $sum: "$discount" },
        marginValue: { $sum: "$marginValue" },
      },
    },
    {
      $project: {
        _id: 0,
        rows: 1,
        storeCount: { $size: "$stores" },
        articleCount: { $size: "$articles" },
        customerCount: { $size: "$customers" },
        totalQty: 1,
        grossSales: 1,
        netSales: 1,
        taxValue: 1,
        cogs: 1,
        discount: 1,
        marginValue: 1,
      },
    },
  ]);

  return (
    row || {
      rows: 0,
      storeCount: 0,
      articleCount: 0,
      customerCount: 0,
      totalQty: 0,
      grossSales: 0,
      netSales: 0,
      taxValue: 0,
      cogs: 0,
      discount: 0,
      marginValue: 0,
    }
  );
};

const storeSummary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  return DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$storeCode",
        storeName: { $first: "$storeName" },
        city: { $first: "$city" },
        zone: { $first: "$zone" },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        marginValue: { $sum: "$marginValue" },
        articles: { $addToSet: "$sku" },
        customers: { $addToSet: "$customerPhone" },
      },
    },
    {
      $project: {
        storeCode: "$_id",
        storeName: 1,
        city: 1,
        zone: 1,
        rows: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        marginValue: 1,
        articleCount: { $size: "$articles" },
        customerCount: { $size: "$customers" },
      },
    },
    { $sort: { grossSales: -1 } },
  ]);
};

const articleSummary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);
  const limit = Math.min(Number(query.limit || 100), 500);

  return DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$sku",
        article: { $first: "$article" },
        articleDescription: { $first: "$articleDescription" },
        category: { $first: "$category" },
        lob: { $first: "$lob" },
        newLob: { $first: "$newLob" },
        brand: { $first: "$brand" },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        marginValue: { $sum: "$marginValue" },
        stores: { $addToSet: "$storeCode" },
      },
    },
    {
      $project: {
        sku: "$_id",
        article: 1,
        articleDescription: 1,
        category: 1,
        lob: 1,
        newLob: 1,
        brand: 1,
        rows: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        marginValue: 1,
        storeCount: { $size: "$stores" },
      },
    },
    { $sort: { grossSales: -1 } },
    { $limit: limit },
  ]);
};

const categorySummary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  return DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          lob: "$lob",
          newLob: "$newLob",
          category: "$category",
        },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        marginValue: { $sum: "$marginValue" },
        articles: { $addToSet: "$sku" },
      },
    },
    {
      $project: {
        lob: "$_id.lob",
        newLob: "$_id.newLob",
        category: "$_id.category",
        rows: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        marginValue: 1,
        articleCount: { $size: "$articles" },
      },
    },
    { $sort: { grossSales: -1 } },
  ]);
};

const customerSummary = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);
  const limit = Math.min(Number(query.limit || 100), 500);

  return DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$customerPhone",
        customerName: { $first: "$customerName" },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        lastVisit: { $max: "$businessDate" },
        stores: { $addToSet: "$storeCode" },
        categories: { $addToSet: "$category" },
      },
    },
    {
      $project: {
        customerPhone: "$_id",
        customerName: 1,
        rows: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        lastVisit: 1,
        storeCount: { $size: "$stores" },
        categoryCount: { $size: "$categories" },
      },
    },
    { $sort: { grossSales: -1 } },
    { $limit: limit },
  ]);
};

const replenishmentSignal = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);
  const days = Number(query.days || 22);

  return DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          storeCode: "$storeCode",
          sku: "$sku",
        },
        storeName: { $first: "$storeName" },
        articleDescription: { $first: "$articleDescription" },
        category: { $first: "$category" },
        lob: { $first: "$lob" },
        qtySold: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
      },
    },
    {
      $lookup: {
        from: "inventories",
        let: {
          sku: "$_id.sku",
          storeCode: "$_id.storeCode",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$sku", "$$sku"] },
                  { $eq: ["$storeCode", "$$storeCode"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "inventory",
      },
    },
    {
      $unwind: {
        path: "$inventory",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        dailyAverageSale: { $divide: ["$qtySold", days] },
        currentAtpQty: { $ifNull: ["$inventory.atpQty", 0] },
      },
    },
    {
      $addFields: {
        daysOfStockLeft: {
          $cond: [
            { $gt: ["$dailyAverageSale", 0] },
            { $divide: ["$currentAtpQty", "$dailyAverageSale"] },
            999,
          ],
        },
      },
    },
    {
      $addFields: {
        replenishmentPriority: {
          $switch: {
            branches: [
              { case: { $lte: ["$daysOfStockLeft", 3] }, then: "HIGH" },
              { case: { $lte: ["$daysOfStockLeft", 7] }, then: "MEDIUM" },
              { case: { $lte: ["$daysOfStockLeft", 15] }, then: "LOW" },
            ],
            default: "OK",
          },
        },
      },
    },
    {
      $project: {
        storeCode: "$_id.storeCode",
        sku: "$_id.sku",
        storeName: 1,
        articleDescription: 1,
        category: 1,
        lob: 1,
        qtySold: 1,
        grossSales: 1,
        currentAtpQty: 1,
        dailyAverageSale: 1,
        daysOfStockLeft: 1,
        replenishmentPriority: 1,
      },
    },
    { $sort: { replenishmentPriority: 1, grossSales: -1 } },
    { $limit: Math.min(Number(query.limit || 200), 500) },
  ]);
};

// Digital channel store codes from the June DSR — 6069 is the Hometown.in storefront,
// 6524 is third-party marketplace fulfilment. There's no live online-order management
// system; this reconstructs real "orders" (one per salesDoc) from the actual DSR rows
// so /admin online sales shows real customers/items/amounts instead of mock data.
const CHANNEL_STORE_CODES = { ONLINE: "6069", MARKETPLACE: "6524" };

const onlineOrders = async (query = {}, user = {}) => {
  const filter = buildFilter(query, user);

  if (query.channel && CHANNEL_STORE_CODES[String(query.channel).toUpperCase()]) {
    filter.storeCode = CHANNEL_STORE_CODES[String(query.channel).toUpperCase()];
  } else if (!filter.storeCode) {
    filter.storeCode = { $in: Object.values(CHANNEL_STORE_CODES) };
  }

  const limit = Math.min(Number(query.limit || 100), 500);

  const rows = await DsrSalesFact.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { salesDoc: "$salesDoc", storeCode: "$storeCode" },
        storeName: { $first: "$storeName" },
        businessDate: { $first: "$businessDate" },
        businessDateStr: { $first: "$businessDateStr" },
        docType: { $first: "$docType" },
        customerName: { $first: "$customerName" },
        customerPhone: { $first: "$customerPhone" },
        marketplace: { $first: "$marketplace" },
        deliverySite: { $first: "$deliverySite" },
        firstItem: { $first: "$articleDescription" },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
      },
    },
    {
      $project: {
        _id: 0,
        orderId: "$_id.salesDoc",
        storeCode: "$_id.storeCode",
        storeName: 1,
        channel: {
          $cond: [{ $eq: ["$_id.storeCode", CHANNEL_STORE_CODES.ONLINE] }, "ONLINE", "MARKETPLACE"],
        },
        businessDate: 1,
        businessDateStr: 1,
        docType: 1,
        customerName: 1,
        customerPhone: 1,
        marketplace: 1,
        deliverySite: 1,
        firstItem: 1,
        itemCount: "$rows",
        qty: 1,
        grossSales: 1,
      },
    },
    { $sort: { businessDate: -1 } },
    { $limit: limit },
  ]);

  return rows;
};

module.exports = {
  list,
  summary,
  storeSummary,
  articleSummary,
  categorySummary,
  customerSummary,
  replenishmentSignal,
  onlineOrders,
};
