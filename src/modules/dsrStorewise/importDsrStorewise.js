require("dotenv").config();

const connectDB = require("../../config/db");
const DsrSalesFact = require("../dsrSalesFacts/dsrSalesFact.model");
const DsrStorewise = require("./dsrStorewise.model");

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, "").split("=");
  if (key) acc[key] = value ?? true;
  return acc;
}, {});

const FROM_DATE = args.fromDate || "2026-06-01";
const TO_DATE = args.toDate || "2026-06-22";
const BUSINESS_MONTH = args.businessMonth || "2026-06";
const TOP_N = Number(args.topN || 15);

const dateFilter = {
  businessDateStr: { $gte: FROM_DATE, $lte: TO_DATE },
};

// June DSR channel mapping — store 6069 (Hometown.in) is the online storefront,
// 6524 (Marketplace) is third-party marketplace fulfilment; everything else is a physical store.
const getSalesChannel = (storeCode, storeName = "") => {
  const code = String(storeCode || "").trim();
  const name = String(storeName || "").toLowerCase();

  if (code === "6069" || name.includes("hometown.in")) {
    return "ONLINE";
  }

  if (code === "6524" || name.includes("marketplace")) {
    return "MARKETPLACE";
  }

  return "STORE";
};

const buildStoreTotals = () =>
  DsrSalesFact.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$storeCode",
        storeName: { $first: "$storeName" },
        city: { $first: "$city" },
        zone: { $first: "$zone" },
        concept: { $first: "$concept" },
        storeType: { $first: "$storeType" },
        rows: { $sum: 1 },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        netSales: { $sum: "$netSaleWithoutTax" },
        taxValue: { $sum: "$taxValue" },
        cogs: { $sum: "$cogs" },
        discount: { $sum: "$discount" },
        marginValue: { $sum: "$marginValue" },
        bills: { $addToSet: "$salesDoc" },
        articles: { $addToSet: "$sku" },
        customers: { $addToSet: "$customerPhone" },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id",
        storeName: 1,
        city: 1,
        zone: 1,
        concept: 1,
        storeType: 1,
        rows: 1,
        qty: 1,
        grossSales: 1,
        netSales: 1,
        taxValue: 1,
        cogs: 1,
        discount: 1,
        marginValue: 1,
        bills: { $size: "$bills" },
        articles: { $size: "$articles" },
        customers: { $size: "$customers" },
      },
    },
  ]);

const buildDocTypeBreakup = () =>
  DsrSalesFact.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { storeCode: "$storeCode", docType: "$docType" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        rows: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id.storeCode",
        docType: "$_id.docType",
        qty: 1,
        grossSales: 1,
        rows: 1,
      },
    },
    { $sort: { grossSales: -1 } },
  ]);

const buildLobBreakup = () =>
  DsrSalesFact.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { storeCode: "$storeCode", lob: "$lob" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id.storeCode",
        lob: "$_id.lob",
        qty: 1,
        grossSales: 1,
      },
    },
    { $sort: { grossSales: -1 } },
  ]);

const buildTopCategories = () =>
  DsrSalesFact.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { storeCode: "$storeCode", category: "$category" },
        lob: { $first: "$lob" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
      },
    },
    { $sort: { grossSales: -1 } },
    {
      $group: {
        _id: "$_id.storeCode",
        categories: {
          $push: {
            category: "$_id.category",
            lob: "$lob",
            qty: "$qty",
            grossSales: "$grossSales",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id",
        categories: { $slice: ["$categories", TOP_N] },
      },
    },
  ]);

const buildTopArticles = () =>
  DsrSalesFact.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { storeCode: "$storeCode", sku: "$sku" },
        articleDescription: { $first: "$articleDescription" },
        category: { $first: "$category" },
        lob: { $first: "$lob" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
      },
    },
    { $sort: { grossSales: -1 } },
    {
      $group: {
        _id: "$_id.storeCode",
        articles: {
          $push: {
            sku: "$_id.sku",
            articleDescription: "$articleDescription",
            category: "$category",
            lob: "$lob",
            qty: "$qty",
            grossSales: "$grossSales",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id",
        articles: { $slice: ["$articles", TOP_N] },
      },
    },
  ]);

const buildTopCustomers = () =>
  DsrSalesFact.aggregate([
    { $match: { ...dateFilter, customerPhone: { $nin: ["", null] } } },
    {
      $group: {
        _id: { storeCode: "$storeCode", customerPhone: "$customerPhone" },
        customerName: { $first: "$customerName" },
        qty: { $sum: "$qty" },
        grossSales: { $sum: "$grossValue" },
        lastVisit: { $max: "$businessDate" },
      },
    },
    { $sort: { grossSales: -1 } },
    {
      $group: {
        _id: "$_id.storeCode",
        customers: {
          $push: {
            customerPhone: "$_id.customerPhone",
            customerName: "$customerName",
            qty: "$qty",
            grossSales: "$grossSales",
            lastVisit: "$lastVisit",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        storeCode: "$_id",
        customers: { $slice: ["$customers", TOP_N] },
      },
    },
  ]);

const toMap = (rows, key) => {
  const map = new Map();
  for (const row of rows) map.set(row[key], row);
  return map;
};

const groupByStore = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.storeCode)) map.set(row.storeCode, []);
    map.get(row.storeCode).push(row);
  }
  return map;
};

const otcVsSalesOrder = (docTypeRows = []) => {
  const totals = {
    otcQty: 0,
    otcGrossSales: 0,
    salesOrderQty: 0,
    salesOrderGrossSales: 0,
  };

  for (const row of docTypeRows) {
    if (row.docType === "OTC") {
      totals.otcQty += row.qty || 0;
      totals.otcGrossSales += row.grossSales || 0;
    } else {
      totals.salesOrderQty += row.qty || 0;
      totals.salesOrderGrossSales += row.grossSales || 0;
    }
  }

  return totals;
};

const run = async () => {
  await connectDB();

  const [storeTotals, docTypeRows, lobRows, topCategoriesRows, topArticlesRows, topCustomersRows] =
    await Promise.all([
      buildStoreTotals(),
      buildDocTypeBreakup(),
      buildLobBreakup(),
      buildTopCategories(),
      buildTopArticles(),
      buildTopCustomers(),
    ]);

  if (!storeTotals.length) {
    throw new Error(
      `No dsr_sales_facts rows found for ${FROM_DATE} to ${TO_DATE}. Run "npm run import:dsr" first.`
    );
  }

  const docTypeByStore = groupByStore(docTypeRows);
  const lobByStore = groupByStore(lobRows);
  const categoriesByStore = toMap(topCategoriesRows, "storeCode");
  const articlesByStore = toMap(topArticlesRows, "storeCode");
  const customersByStore = toMap(topCustomersRows, "storeCode");

  let inserted = 0;
  let updated = 0;

  for (const store of storeTotals) {
    const storeDocTypes = docTypeByStore.get(store.storeCode) || [];

    const doc = {
      sourceFile: "Article-wise HT Jun DSR 2026",
      storeCode: store.storeCode,
      storeName: store.storeName,
      city: store.city,
      zone: store.zone,
      concept: store.concept,
      storeType: store.storeType,
      salesChannel: getSalesChannel(store.storeCode, store.storeName),

      rows: store.rows,
      bills: store.bills,
      articles: store.articles,
      customers: store.customers,

      qty: store.qty,
      grossSales: store.grossSales,
      netSales: store.netSales,
      taxValue: store.taxValue,
      cogs: store.cogs,
      discount: store.discount,
      marginValue: store.marginValue,

      docTypeBreakup: storeDocTypes,
      lobBreakup: lobByStore.get(store.storeCode) || [],
      topCategories: categoriesByStore.get(store.storeCode)?.categories || [],
      topArticles: articlesByStore.get(store.storeCode)?.articles || [],
      topCustomers: customersByStore.get(store.storeCode)?.customers || [],

      otcVsSalesOrder: otcVsSalesOrder(storeDocTypes),

      businessMonth: BUSINESS_MONTH,
      dateRange: { fromDate: FROM_DATE, toDate: TO_DATE },
    };

    const result = await DsrStorewise.updateOne(
      { storeCode: doc.storeCode, businessMonth: doc.businessMonth },
      { $set: doc },
      { upsert: true }
    );

    if (result.upsertedCount) inserted++;
    else updated++;
  }

  const total = await DsrStorewise.countDocuments({
    businessMonth: BUSINESS_MONTH,
  });

  console.log("DSR storewise import completed");
  console.log({
    inserted,
    updated,
    storesImported: storeTotals.length,
    total,
  });

  process.exit(0);
};

run().catch((error) => {
  console.error("DSR storewise import failed:", error);
  process.exit(1);
});
