const PosSession = require("../posSessions/model");
const Order = require("../orders/model");
const Invoice = require("../invoices/model");
const Payment = require("../payments/model");
const Customer = require("../customers/customers.model");
const Inventory = require("../inventories/model");
const InventoryMovement = require("../inventoryMovements/model");
const AuditLog = require("../auditLogs/model");

const posSessionService = require("../posSessions/service");
const inventoryService = require("../inventories/service");
const { getManagerInventorySummary } = require("../dashboard/dashboard.service");

const toBusinessDate = (date = new Date()) => date.toISOString().slice(0, 10);

const dayRange = (businessDate) => {
  const date = businessDate || toBusinessDate();
  return {
    date,
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
};

const resolveStoreCode = (query = {}, user = {}) => {
  const storeCode = user.role === "ADMIN" ? query.storeCode || user.storeCode : user.storeCode;

  if (!storeCode) {
    const error = new Error("storeCode is required");
    error.statusCode = 400;
    throw error;
  }

  return storeCode;
};

const getSalesAndInvoices = async (storeCode, start, end) => {
  const [salesAgg] = await Order.aggregate([
    { $match: { storeCode, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSales: { $sum: "$grandTotal" },
        paidAmount: { $sum: "$paidAmount" },
        dueAmount: { $sum: "$dueAmount" },
      },
    },
  ]);

  const [invoiceAgg] = await Invoice.aggregate([
    { $match: { storeCode, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        invoiceValue: { $sum: "$billing.grandTotal" },
      },
    },
  ]);

  const orderStatusBreakup = await Order.aggregate([
    { $match: { storeCode, createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$orderStatus", count: { $sum: 1 }, value: { $sum: "$grandTotal" } } },
  ]);

  return {
    sales: salesAgg || { totalOrders: 0, totalSales: 0, paidAmount: 0, dueAmount: 0 },
    invoices: invoiceAgg || { totalInvoices: 0, invoiceValue: 0 },
    orderStatusBreakup,
  };
};

const getPaymentAndCash = async (storeCode, start, end) => {
  const byMethod = await Payment.aggregate([
    {
      $match: {
        storeCode,
        createdAt: { $gte: start, $lte: end },
        paymentStatus: "SUCCESS",
      },
    },
    { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  const payments = { CASH: 0, UPI: 0, CARD: 0, MIXED: 0, EMI: 0 };
  byMethod.forEach((row) => {
    if (row._id && payments[row._id] !== undefined) payments[row._id] = row.total;
  });

  const failedPaymentCount = await Payment.countDocuments({
    storeCode,
    createdAt: { $gte: start, $lte: end },
    paymentStatus: "FAILED",
  });

  return { payments, byMethod, failedPaymentCount };
};

const getCashierPerformance = async (storeCode, businessDate) => {
  const sessions = await PosSession.find({ storeCode, businessDate });
  const { start, end } = dayRange(businessDate);

  const qtyBySession = await Order.aggregate([
    { $match: { storeCode, createdAt: { $gte: start, $lte: end } } },
    { $unwind: "$items" },
    { $group: { _id: "$sessionId", quantitySold: { $sum: "$items.quantity" } } },
  ]);

  const qtyMap = new Map(qtyBySession.map((row) => [row._id, row.quantitySold]));

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    cashierId: s.cashierId,
    cashierName: s.cashierName,
    status: s.status,
    invoiceCount: s.invoiceCount || 0,
    paymentCount: s.paymentCount || 0,
    totalCollected: s.totalSales || 0,
    totalSales: s.totalSales || 0,
    cashCollected: s.cashSales || 0,
    upiCollected: s.upiSales || 0,
    cardCollected: s.cardSales || 0,
    quantitySold: qtyMap.get(s.sessionId) || 0,
    cashDifference: s.cashDifference || 0,
  }));
};

const getCatalogSummary = async (storeCode) => {
  const [agg] = await Inventory.aggregate([
    { $match: { storeCode, locationType: "Store", status: "ACTIVE" } },
    {
      $group: {
        _id: null,
        catalogRows: { $sum: 1 },
        catalogValue: { $sum: "$mapValue" },
        sellableProducts: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$isPosEnabled", true] }, { $gt: ["$atpQty", 0] }] }, 1, 0],
          },
        },
      },
    },
  ]);

  const summary = agg || { catalogRows: 0, catalogValue: 0, sellableProducts: 0 };
  summary.blockedProducts = Math.max((summary.catalogRows || 0) - (summary.sellableProducts || 0), 0);

  const categoriesAgg = await Inventory.aggregate([
    { $match: { storeCode, locationType: "Store", status: "ACTIVE" } },
    {
      $group: {
        _id: "$category",
        productCount: { $sum: 1 },
        storeAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
      },
    },
    { $sort: { totalMapValue: -1 } },
    { $limit: 10 },
  ]);

  const categories = categoriesAgg.map((row) => ({
    name: row._id || "Uncategorized",
    productCount: row.productCount,
    storeAtpQty: row.storeAtpQty,
    totalMapValue: row.totalMapValue,
  }));

  const topSellableProducts = await Inventory.find({
    storeCode,
    locationType: "Store",
    isPosEnabled: true,
    atpQty: { $gt: 0 },
    status: "ACTIVE",
  })
    .sort({ mapValue: -1 })
    .limit(10);

  return { summary, categories, topSellableProducts };
};

const getReplenishmentSuggestions = async (storeCode) => {
  const suggestions = await inventoryService.replenishmentSuggestions({ storeCode }, null);

  return suggestions.map((s) => ({
    productName: s.productName,
    sku: s.sku,
    category: s.category,
    lob: s.lob,
    storeAtpQty: s.storeAtpQty,
    sourceSiteCode: s.suggestedSourceSite,
    sourceSiteName: s.sourceName,
    sourceLocationType: s.sourceType,
    sourceAtpQty: s.sourceAtpQty,
    suggestedTransferQty: s.suggestedTransferQty,
    priority: Number(s.storeAtpQty || 0) <= 0 ? "HIGH" : Number(s.storeAtpQty || 0) <= 2 ? "MEDIUM" : "LOW",
  }));
};

const getInventoryMovementSummary = async (storeCode, start, end) => {
  const byType = await InventoryMovement.aggregate([
    { $match: { storeCode, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: "$movementType",
        count: { $sum: 1 },
        totalQty: { $sum: { $abs: "$quantity" } },
      },
    },
  ]);

  return {
    byType,
    totalMovements: byType.reduce((sum, row) => sum + row.count, 0),
  };
};

const getCustomerSummary = async (storeCode, start, end) => {
  const [agg] = await Customer.aggregate([
    { $match: { storeCode } },
    {
      $group: {
        _id: null,
        customers: { $sum: 1 },
        totalSpend: { $sum: "$totalSpend" },
        totalPaid: { $sum: "$totalPaid" },
        totalDue: { $sum: "$totalDue" },
      },
    },
  ]);

  const topCustomers = await Customer.find({ storeCode }).sort({ totalSpend: -1 }).limit(10);
  const newCustomers = await Customer.find({ storeCode, createdAt: { $gte: start, $lte: end } })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    summary: agg || { customers: 0, totalSpend: 0, totalPaid: 0, totalDue: 0 },
    topCustomers,
    newCustomers,
  };
};

const getApprovalRequests = (cashierSessions) => {
  const reviewWorthyTypes = ["HIGH_DISCOUNT", "INVOICE_CANCELLED", "NEGATIVE_INVOICE"];
  const items = [];

  for (const session of cashierSessions) {
    for (const ex of session.exceptions || []) {
      if (ex.status === "OPEN" && reviewWorthyTypes.includes(ex.type)) {
        items.push({
          sessionId: session.sessionId,
          cashierName: session.cashierName,
          ...(ex.toObject ? ex.toObject() : ex),
        });
      }
    }
  }

  return { pending: items.length, items };
};

const getAlerts = ({ exceptionCount, inventoryOverview, sales }) => {
  const alerts = [];

  if (exceptionCount > 0) {
    alerts.push({
      type: "EXCEPTION_SESSIONS",
      severity: "HIGH",
      message: `${exceptionCount} cashier session(s) flagged and waiting for your review.`,
    });
  }

  if (inventoryOverview.outOfStockSkus > 0) {
    alerts.push({
      type: "OUT_OF_STOCK",
      severity: "MEDIUM",
      message: `${inventoryOverview.outOfStockSkus} SKU(s) are out of stock at this store.`,
    });
  }

  if (inventoryOverview.lowStockSkus > 0) {
    alerts.push({
      type: "LOW_STOCK",
      severity: "MEDIUM",
      message: `${inventoryOverview.lowStockSkus} SKU(s) are running low — check replenishment suggestions.`,
    });
  }

  if (Number(sales.dueAmount || 0) > 0) {
    alerts.push({
      type: "DUE_AMOUNT",
      severity: "LOW",
      message: `₹${Math.round(sales.dueAmount)} is pending collection from today's orders.`,
    });
  }

  return alerts;
};

const getOverview = async (storeCode, businessDate) => {
  const { date, start, end } = dayRange(businessDate);

  const [{ sales, invoices }, { payments }, sessions, invSummary] = await Promise.all([
    getSalesAndInvoices(storeCode, start, end),
    getPaymentAndCash(storeCode, start, end),
    PosSession.find({ storeCode, businessDate: date }),
    inventoryService.summary({ storeCode, locationType: "Store" }, null),
  ]);

  const overall = invSummary.overall;

  return {
    businessDate: date,
    storeCode,
    sales,
    invoices,
    payments,
    sessions: {
      total: sessions.length,
      open: sessions.filter((s) => s.status === "OPEN").length,
      autoVerified: sessions.filter((s) => s.status === "AUTO_VERIFIED").length,
      exceptionFlagged: sessions.filter((s) => s.status === "EXCEPTION_FLAGGED").length,
      resolved: sessions.filter((s) => s.status === "RESOLVED").length,
      cashDifference: sessions.reduce((sum, s) => sum + Number(s.cashDifference || 0), 0),
    },
    inventory: {
      totalSkus: overall.rows,
      totalAtpQty: overall.totalAtpQty,
      totalMapValue: overall.totalMapValue,
      lowStockSkus: overall.lowStock + overall.limitedStock,
      outOfStockSkus: overall.outOfStock,
    },
  };
};

const getDashboard = async (query = {}, user = {}) => {
  const storeCode = resolveStoreCode(query, user);
  const { date, start, end } = dayRange(query.businessDate);

  const [
    overview,
    cashierSessions,
    cashierPerformance,
    paymentAndCash,
    customerSummary,
    inventorySummary,
    catalogSummary,
    replenishmentSuggestions,
    inventoryMovementSummary,
    latestLogs,
  ] = await Promise.all([
    getOverview(storeCode, date),
    PosSession.find({ storeCode, businessDate: date }).sort({ createdAt: -1 }),
    getCashierPerformance(storeCode, date),
    getPaymentAndCash(storeCode, start, end),
    getCustomerSummary(storeCode, start, end),
    getManagerInventorySummary({ storeCode }, { role: "MANAGER", storeCode }),
    getCatalogSummary(storeCode),
    getReplenishmentSuggestions(storeCode),
    getInventoryMovementSummary(storeCode, start, end),
    AuditLog.find({ storeCode }).sort({ createdAt: -1 }).limit(10),
  ]);

  const exceptionCount = cashierSessions.filter((s) => s.status === "EXCEPTION_FLAGGED").length;
  const approvalRequests = getApprovalRequests(cashierSessions);
  const alerts = getAlerts({ exceptionCount, inventoryOverview: overview.inventory, sales: overview.sales });

  return {
    overview,
    cashierSessions,
    cashierPerformance,
    salesAndInvoices: { sales: overview.sales, invoices: overview.invoices },
    paymentAndCash,
    customerSummary,
    inventorySummary,
    catalogSummary,
    replenishmentSuggestions,
    inventoryMovementSummary,
    approvalRequests,
    auditSummary: { latestLogs },
    alerts,
  };
};

const getSessions = async (query = {}, user = {}) => {
  const storeCode = resolveStoreCode(query, user);
  const { date } = dayRange(query.businessDate);

  const filter = { storeCode, businessDate: date };
  if (query.status) filter.status = query.status;

  return PosSession.find(filter).sort({ createdAt: -1 });
};

const resolveException = async (sessionId, payload = {}, user = {}) => {
  return posSessionService.resolveException(sessionId, payload, user);
};

const closeStoreDay = async (payload = {}, user = {}) => {
  const storeCode = resolveStoreCode(payload, user);
  return posSessionService.closeStoreDay({ storeCode, businessDate: payload.businessDate }, user);
};

module.exports = {
  getDashboard,
  getOverview,
  getSessions,
  getCashierPerformance,
  resolveException,
  closeStoreDay,
};
