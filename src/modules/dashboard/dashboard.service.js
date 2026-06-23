const Model = require("./dashboard.model");
const Store = require("../stores/model");
const Product = require("../products/model");
const Inventory = require("../inventories/model");
const InventoryMovement = require("../inventoryMovements/model");
const Order = require("../orders/model");
const Invoice = require("../invoices/model");
const PosUser = require("../auth/user.model");

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

const getDateStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const roleFilter = (user = {}) => {
  if (user.role === "ADMIN") return {};
  if (user.storeCode) {
    return {
      storeCode: user.storeCode
    };
  }
  return {
    storeCode: "__NO_STORE__"
  };
};

const getAdminDashboard = async () => {
  const today = getDateStart();
  const [
    totalStores,
    totalProducts,
    totalUsers,
    totalManagers,
    totalCashiers,
    totalOrders,
    totalInvoices,
    todayOrders,
    inventoryRows,
    lowStock,
    salesAgg,
    storeSales
  ] = await Promise.all([
    Store.countDocuments({}),
    Product.countDocuments({}),
    PosUser.countDocuments({}),
    PosUser.countDocuments({ role: "MANAGER" }),
    PosUser.countDocuments({ role: "CASHIER" }),
    Order.countDocuments({}),
    Invoice.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Inventory.countDocuments({}),
    Inventory.countDocuments({ stockStatus: "LOW_STOCK" }),
    Order.aggregate([
      { $match: { orderStatus: { $ne: "CANCELLED" } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
          avgOrderValue: { $avg: "$grandTotal" }
        }
      }
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $ne: "CANCELLED" } } },
      {
        $group: {
          _id: "$storeCode",
          storeName: { $first: "$storeName" },
          city: { $first: "$city" },
          region: { $first: "$region" },
          orders: { $sum: 1 },
          sales: { $sum: "$grandTotal" }
        }
      },
      { $sort: { sales: -1 } }
    ])
  ]);
  const sales = salesAgg[0] || {};
  return {
    role: "ADMIN",
    dashboardType: "ADMIN_DASHBOARD",
    scope: "ALL_STORES",
    cards: {
      totalStores,
      totalProducts,
      totalUsers,
      totalManagers,
      totalCashiers,
      totalOrders,
      totalInvoices,
      todayOrders,
      inventoryRows,
      lowStock,
      totalSales: Math.round(sales.totalSales || 0),
      totalPaid: Math.round(sales.totalPaid || 0),
      totalDue: Math.round(sales.totalDue || 0),
      avgOrderValue: Math.round(sales.avgOrderValue || 0)
    },
    storeSales
  };
};

const getStoreDashboard = async (user, query = {}) => {
  const filter = roleFilter(user);
  const today = getDateStart();
  const [
    store,
    totalOrders,
    totalInvoices,
    todayOrders,
    inventoryRows,
    lowStock,
    outOfStock,
    salesAgg,
    recentOrders,
    recentInvoices,
    topProducts
  ] = await Promise.all([
    Store.findOne({ storeCode: filter.storeCode }),
    Order.countDocuments(filter),
    Invoice.countDocuments(filter),
    Order.countDocuments({
      ...filter,
      createdAt: { $gte: today }
    }),
    Inventory.countDocuments(filter),
    Inventory.countDocuments({
      ...filter,
      stockStatus: "LOW_STOCK"
    }),
    Inventory.countDocuments({
      ...filter,
      stockStatus: "OUT_OF_STOCK"
    }),
    Order.aggregate([
      {
        $match: {
          ...filter,
          orderStatus: { $ne: "CANCELLED" }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
          avgOrderValue: { $avg: "$grandTotal" }
        }
      }
    ]),
    Order.find(filter).sort({ createdAt: -1 }).limit(10),
    Invoice.find(filter).sort({ invoiceDate: -1 }).limit(10),
    Order.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.sku",
          productName: { $first: "$items.productName" },
          qty: { $sum: "$items.quantity" },
          sales: { $sum: "$items.lineTotal" }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 10 }
    ])
  ]);
  const sales = salesAgg[0] || {};

  const inventory =
    user.role === "MANAGER" ? await getManagerInventorySummary(query, user) : undefined;

  return {
    role: user.role,
    dashboardType:
      user.role === "MANAGER" ? "MANAGER_DASHBOARD" : "CASHIER_DASHBOARD",
    scope: "STORE_ONLY",
    userStore: {
      storeCode: user.storeCode,
      storeName: user.storeName,
      city: user.city,
      region: user.region
    },
    store,
    cards: {
      totalOrders,
      totalInvoices,
      todayOrders,
      inventoryRows,
      lowStock,
      outOfStock,
      totalSales: Math.round(sales.totalSales || 0),
      totalPaid: Math.round(sales.totalPaid || 0),
      totalDue: Math.round(sales.totalDue || 0),
      avgOrderValue: Math.round(sales.avgOrderValue || 0)
    },
    recentOrders,
    recentInvoices,
    topProducts,
    ...(inventory ? { inventory } : {})
  };
};

async function getManagerInventorySummary(query = {}, user = {}) {
  const storeCode = user.role === "ADMIN" ? query.storeCode : user.storeCode;

  const [summary] = await Inventory.aggregate([
    {
      $match: {
        storeCode,
        locationType: "Store",
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: null,
        totalSkus: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
        outOfStockSkus: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "OUT_OF_STOCK"] }, 1, 0] },
        },
        lowStockSkus: {
          $sum: {
            $cond: [
              { $in: ["$stockStatus", ["LOW_STOCK", "LIMITED_STOCK"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const lowStock = await Inventory.find({
    storeCode,
    locationType: "Store",
    stockStatus: { $in: ["LOW_STOCK", "LIMITED_STOCK", "OUT_OF_STOCK"] },
    status: "ACTIVE",
  })
    .sort({ atpQty: 1 })
    .limit(30);

  const byLob = await Inventory.aggregate([
    {
      $match: {
        storeCode,
        locationType: "Store",
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: "$lob",
        skus: { $sum: 1 },
        stockQty: { $sum: "$stockQty" },
        atpQty: { $sum: "$atpQty" },
        mapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { mapValue: -1 } },
  ]);

  const byCategory = await Inventory.aggregate([
    {
      $match: {
        storeCode,
        locationType: "Store",
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: "$category",
        skus: { $sum: 1 },
        stockQty: { $sum: "$stockQty" },
        atpQty: { $sum: "$atpQty" },
        mapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { mapValue: -1 } },
    { $limit: 20 },
  ]);

  return {
    summary: summary || {
      totalSkus: 0,
      totalStockQty: 0,
      totalAtpQty: 0,
      totalMapValue: 0,
      outOfStockSkus: 0,
      lowStockSkus: 0,
    },
    lowStock,
    byLob,
    byCategory,
  };
}

const getDashboard = async (user, query = {}) => {
  if (user.role === "ADMIN") {
    return getAdminDashboard();
  }
  return getStoreDashboard(user, query);
};

module.exports = { list, getById, create, bulkCreate, update, remove, patchStatus, getDashboard, getAdminDashboard, getStoreDashboard, getManagerInventorySummary };
