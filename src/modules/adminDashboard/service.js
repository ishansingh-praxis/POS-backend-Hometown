const Store = require("../stores/model");
const Order = require("../orders/model");
const Invoice = require("../invoices/model");
const Payment = require("../payments/model");
const PosSession = require("../posSessions/model");
const Inventory = require("../inventories/model");
const HeldBill = require("../heldBills/model");
const { CreditNote } = require("../creditNotes/model");
const PosReturn = require("../posReturns/model");

const toBusinessDate = (date) => date || new Date().toISOString().slice(0, 10);

const dayRange = (businessDate) => {
  const date = toBusinessDate(businessDate);
  return {
    date,
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
};

// Admin is the only role with no store boundary — a storeCode query param lets
// admin drill into one store without losing the "all stores" default behavior.
const resolveStoreFilter = (query = {}, user = {}) => {
  if (user.role && user.role !== "ADMIN" && user.storeCode) {
    return { storeCode: user.storeCode };
  }
  return query.storeCode ? { storeCode: query.storeCode } : {};
};

const getSalesAndInvoices = async (filter, start, end) => {
  const match = { ...filter, createdAt: { $gte: start, $lte: end } };

  const [salesAgg] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSales: { $sum: "$grandTotal" },
        paidAmount: { $sum: "$paidAmount" },
        dueAmount: { $sum: "$dueAmount" },
        avgOrderValue: { $avg: "$grandTotal" },
      },
    },
  ]);

  const [invoiceAgg] = await Invoice.aggregate([
    { $match: match },
    { $group: { _id: null, totalInvoices: { $sum: 1 } } },
  ]);

  const partialAgg = await Order.aggregate([
    { $match: { ...match, paymentStatus: "PARTIAL" } },
    {
      $group: {
        _id: null,
        partialOrders: { $sum: 1 },
        collectedAmount: { $sum: "$paidAmount" },
        dueAmount: { $sum: "$dueAmount" },
      },
    },
  ]);

  return {
    sales: salesAgg || { totalOrders: 0, totalSales: 0, paidAmount: 0, dueAmount: 0, avgOrderValue: 0 },
    invoices: invoiceAgg || { totalInvoices: 0 },
    partialPayments: partialAgg[0] || { partialOrders: 0, collectedAmount: 0, dueAmount: 0 },
  };
};

const getPayments = async (filter, start, end) => {
  const byMethod = await Payment.aggregate([
    { $match: { ...filter, createdAt: { $gte: start, $lte: end }, paymentStatus: "SUCCESS" } },
    { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  const payments = { CASH: 0, UPI: 0, CARD: 0, MIXED: 0, EMI: 0, CREDIT_NOTE: 0 };
  byMethod.forEach((row) => {
    if (row._id && payments[row._id] !== undefined) payments[row._id] = row.total;
  });

  return payments;
};

const getOperations = async (filter, start, end) => {
  const sessionFilter = { ...filter, businessDate: toBusinessDate() };

  const [
    openSessions,
    exceptionSessions,
    heldBills,
    returnsAgg,
    creditNotesAgg,
    voucherDummy,
  ] = await Promise.all([
    PosSession.countDocuments({ ...sessionFilter, status: "OPEN" }),
    PosSession.countDocuments({ ...sessionFilter, status: "EXCEPTION_FLAGGED" }),
    HeldBill.countDocuments({ ...filter, status: "HELD" }),
    PosReturn.aggregate([
      { $match: { ...filter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$returnAmount" } } },
    ]),
    CreditNote.aggregate([
      { $match: { ...filter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$creditAmount" }, redeemed: { $sum: "$redeemedAmount" } } },
    ]),
    Promise.resolve(null),
  ]);

  return {
    openSessions,
    exceptionSessions,
    heldBills,
    returns: returnsAgg[0]?.count || 0,
    returnAmount: returnsAgg[0]?.amount || 0,
    creditNotesIssued: creditNotesAgg[0]?.count || 0,
    creditNoteValue: creditNotesAgg[0]?.amount || 0,
    creditNoteRedeemed: creditNotesAgg[0]?.redeemed || 0,
  };
};

const getInventoryOverview = async (filter) => {
  const invFilter = { ...filter, locationType: "Store", status: "ACTIVE" };

  const [agg] = await Inventory.aggregate([
    { $match: invFilter },
    {
      $group: {
        _id: null,
        totalSkus: { $sum: 1 },
        totalAtpQty: { $sum: "$atpQty" },
        totalMapValue: { $sum: "$mapValue" },
        lowStockSkus: {
          $sum: { $cond: [{ $in: ["$stockStatus", ["LOW_STOCK", "LIMITED_STOCK"]] }, 1, 0] },
        },
        outOfStockSkus: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "OUT_OF_STOCK"] }, 1, 0] },
        },
      },
    },
  ]);

  return agg || { totalSkus: 0, totalAtpQty: 0, totalMapValue: 0, lowStockSkus: 0, outOfStockSkus: 0 };
};

const getOverview = async (query = {}, user = {}) => {
  const filter = resolveStoreFilter(query, user);
  const { date, start, end } = dayRange(query.businessDate);

  const [{ sales, invoices, partialPayments }, payments, operations, inventory, storeCount] = await Promise.all([
    getSalesAndInvoices(filter, start, end),
    getPayments(filter, start, end),
    getOperations(filter, start, end),
    getInventoryOverview(filter),
    Store.countDocuments(filter.storeCode ? { storeCode: filter.storeCode } : {}),
  ]);

  return {
    businessDate: date,
    scope: filter.storeCode ? "SINGLE_STORE" : "ALL_STORES",
    storeCode: filter.storeCode || null,
    storeCount,
    sales,
    invoices,
    payments,
    partialPayments,
    operations,
    inventory,
  };
};

const getStorePerformance = async (query = {}, user = {}) => {
  const filter = resolveStoreFilter(query, user);
  const { date, start, end } = dayRange(query.businessDate);
  const sessionBusinessDate = toBusinessDate();

  const [salesByStore, sessionsByStore, lowStockByStore, returnsByStore, creditNotesByStore] = await Promise.all([
    Order.aggregate([
      { $match: { ...filter, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$storeCode",
          storeName: { $first: "$storeName" },
          orders: { $sum: 1 },
          sales: { $sum: "$grandTotal" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
        },
      },
    ]),
    PosSession.aggregate([
      { $match: { ...filter, businessDate: sessionBusinessDate } },
      {
        $group: {
          _id: "$storeCode",
          openSessions: { $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] } },
          exceptionSessions: { $sum: { $cond: [{ $eq: ["$status", "EXCEPTION_FLAGGED"] }, 1, 0] } },
          storeDayClosed: { $sum: { $cond: [{ $eq: ["$status", "STORE_DAY_CLOSED"] }, 1, 0] } },
          totalSessions: { $sum: 1 },
        },
      },
    ]),
    Inventory.aggregate([
      { $match: { ...filter, locationType: "Store", status: "ACTIVE", stockStatus: { $in: ["LOW_STOCK", "LIMITED_STOCK", "OUT_OF_STOCK"] } } },
      { $group: { _id: "$storeCode", lowStockSkus: { $sum: 1 } } },
    ]),
    PosReturn.aggregate([
      { $match: { ...filter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$storeCode", returns: { $sum: 1 }, returnAmount: { $sum: "$returnAmount" } } },
    ]),
    CreditNote.aggregate([
      { $match: { ...filter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$storeCode", creditNotesIssued: { $sum: 1 } } },
    ]),
  ]);

  const sessionsMap = new Map(sessionsByStore.map((r) => [r._id, r]));
  const lowStockMap = new Map(lowStockByStore.map((r) => [r._id, r.lowStockSkus]));
  const returnsMap = new Map(returnsByStore.map((r) => [r._id, r]));
  const creditNotesMap = new Map(creditNotesByStore.map((r) => [r._id, r.creditNotesIssued]));

  const rows = salesByStore.map((row) => {
    const sessions = sessionsMap.get(row._id) || { openSessions: 0, exceptionSessions: 0, storeDayClosed: 0, totalSessions: 0 };
    const returns = returnsMap.get(row._id) || { returns: 0, returnAmount: 0 };

    let closingStatus = "NOT_STARTED";
    if (sessions.totalSessions > 0) {
      if (sessions.openSessions > 0) closingStatus = "BLOCKED_OPEN_SESSION";
      else if (sessions.exceptionSessions > 0) closingStatus = "BLOCKED_EXCEPTION";
      else if (sessions.storeDayClosed > 0) closingStatus = "CLOSED";
      else closingStatus = "READY_TO_CLOSE";
    }

    return {
      storeCode: row._id,
      storeName: row.storeName,
      orders: row.orders,
      sales: Math.round(row.sales || 0),
      paidAmount: Math.round(row.paidAmount || 0),
      dueAmount: Math.round(row.dueAmount || 0),
      openSessions: sessions.openSessions,
      exceptionSessions: sessions.exceptionSessions,
      lowStockSkus: lowStockMap.get(row._id) || 0,
      returns: returns.returns,
      returnAmount: Math.round(returns.returnAmount || 0),
      creditNotesIssued: creditNotesMap.get(row._id) || 0,
      closingStatus,
    };
  });

  rows.sort((a, b) => b.sales - a.sales);

  return { businessDate: date, stores: rows };
};

const getDashboard = async (query = {}, user = {}) => {
  const [overview, storePerformance] = await Promise.all([
    getOverview(query, user),
    getStorePerformance(query, user),
  ]);

  return { overview, storePerformance: storePerformance.stores };
};

module.exports = {
  getOverview,
  getStorePerformance,
  getDashboard,
};
