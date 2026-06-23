const PosSession = require("./model");
const Payment = require("../payments/model");
const Invoice = require("../invoices/model");
const Order = require("../orders/model");
const InventoryMovement = require("../inventoryMovements/model");
const THRESHOLDS = require("../../config/posThresholds");

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const toBusinessDate = (date = new Date()) => date.toISOString().slice(0, 10);

const getContext = (payload = {}, user = {}) => {
  const storeCode = user.storeCode || payload.storeCode;
  const storeName = user.storeName || payload.storeName;

  const cashierId = user.email || user.employeeCode || user.loginId || payload.cashierId;
  const cashierName = user.name || payload.cashierName;

  if (!storeCode) {
    const error = new Error("storeCode is required");
    error.statusCode = 400;
    throw error;
  }

  if (!cashierId) {
    const error = new Error("cashierId is required");
    error.statusCode = 400;
    throw error;
  }

  return { storeCode, storeName, cashierId, cashierName };
};

const start = async (payload = {}, user = {}) => {
  const { storeCode, storeName, cashierId, cashierName } = getContext(payload, user);

  const existing = await PosSession.findOne({
    storeCode,
    cashierId,
    status: "OPEN",
  });

  if (existing) {
    const error = new Error("Cashier already has an open session");
    error.statusCode = 409;
    throw error;
  }

  const openingCash = Number(payload.openingCash || 0);

  return PosSession.create({
    sessionId: generateId(`SESSION-${storeCode}`),
    storeCode,
    storeName,
    cashierId,
    cashierName,
    posDeviceId: payload.posDeviceId || "",
    status: "OPEN",
    openingCash,
    expectedCash: openingCash,
    openedAt: new Date(),
    businessDate: toBusinessDate(),
  });
};

const getCurrent = async (query = {}, user = {}) => {
  const storeCode = user.storeCode || query.storeCode;
  const cashierId = user.email || user.employeeCode || user.loginId || query.cashierId;

  return PosSession.findOne({
    storeCode,
    cashierId,
    status: "OPEN",
  });
};

const getById = (sessionId) => PosSession.findOne({ sessionId });

// ---- Automated exception-based verification (replaces manager-approves-everything) ----
const autoVerifySession = async (session, config = {}) => {
  const rules = { ...THRESHOLDS, ...config };

  const exceptions = [];
  const now = new Date();

  const diff = Number(session.cashDifference || 0);

  if (Math.abs(diff) > rules.cashDifferenceAllowed) {
    exceptions.push({
      type: "CASH_MISMATCH",
      severity: Math.abs(diff) > rules.highCashDifference ? "HIGH" : "MEDIUM",
      message: `Cash difference of ₹${diff} found.`,
      amount: diff,
      status: "OPEN",
      createdAt: now,
    });
  }

  const failedPaymentCount = await Payment.countDocuments({
    sessionId: session.sessionId,
    paymentStatus: "FAILED",
  });

  if (failedPaymentCount > rules.failedPaymentAllowed) {
    exceptions.push({
      type: "FAILED_PAYMENT",
      severity: "HIGH",
      message: `${failedPaymentCount} failed payment(s) found.`,
      amount: 0,
      status: "OPEN",
      createdAt: now,
    });
  }

  const negativeInvoices = await Invoice.find({
    sessionId: session.sessionId,
    "billing.grandTotal": { $lt: 0 },
  }).select("invoiceId billing.grandTotal");

  for (const inv of negativeInvoices) {
    exceptions.push({
      type: "NEGATIVE_INVOICE",
      severity: "HIGH",
      message: `Invoice ${inv.invoiceId} has a negative grand total.`,
      amount: inv.billing?.grandTotal || 0,
      status: "OPEN",
      createdAt: now,
    });
  }

  const cancelledInvoices = await Invoice.find({
    sessionId: session.sessionId,
    invoiceStatus: "CANCELLED",
  }).select("invoiceId billing.grandTotal");

  for (const inv of cancelledInvoices) {
    const amount = Number(inv.billing?.grandTotal || 0);
    exceptions.push({
      type: "INVOICE_CANCELLED",
      severity: amount > rules.highInvoiceCancelAmount ? "HIGH" : "MEDIUM",
      message: `Invoice ${inv.invoiceId} was cancelled during this session.`,
      amount,
      status: "OPEN",
      createdAt: now,
    });
  }

  const highDiscountOrders = await Order.find({
    sessionId: session.sessionId,
    billDiscountPercent: { $gt: rules.maxManualDiscountPercent },
  }).select("orderId billDiscountPercent grandTotal");

  for (const order of highDiscountOrders) {
    exceptions.push({
      type: "HIGH_DISCOUNT",
      severity: "MEDIUM",
      message: `Order ${order.orderId} has a ${order.billDiscountPercent}% bill discount.`,
      amount: order.grandTotal || 0,
      status: "OPEN",
      createdAt: now,
    });
  }

  if (!rules.negativeStockAllowed) {
    const invalidMovements = await InventoryMovement.find({
      sessionId: session.sessionId,
      status: { $ne: "COMPLETED" },
    }).select("movementId sku status");

    for (const mv of invalidMovements) {
      exceptions.push({
        type: "STOCK_ISSUE",
        severity: "HIGH",
        message: `Inventory movement ${mv.movementId} for SKU ${mv.sku} is ${mv.status}.`,
        amount: 0,
        status: "OPEN",
        createdAt: now,
      });
    }
  }

  if (exceptions.length === 0) {
    session.status = "AUTO_VERIFIED";
    session.autoVerificationStatus = "PASSED";
    session.managerApprovalRequired = false;
    session.exceptionCount = 0;
    session.exceptions = [];
    session.autoVerifiedAt = now;
  } else {
    session.status = "EXCEPTION_FLAGGED";
    session.autoVerificationStatus = "FAILED";
    session.managerApprovalRequired = true;
    session.exceptionCount = exceptions.length;
    session.exceptions = exceptions;
  }

  await session.save();

  return session;
};

const closeSession = async (session, payload = {}) => {
  if (session.status !== "OPEN") {
    const error = new Error("Session is already closed");
    error.statusCode = 400;
    throw error;
  }

  const closingCash = Number(payload.closingCash ?? payload.actualCash ?? 0);
  const cashDifference = Number((closingCash - Number(session.expectedCash || 0)).toFixed(2));

  session.status = "CLOSED";
  session.closingCash = closingCash;
  session.cashDifference = cashDifference;
  session.closedAt = new Date();
  session.closedByCashierAt = new Date();
  session.closeRemarks = payload.remarks || payload.closeRemarks || "";

  await session.save();

  return autoVerifySession(session);
};

const close = async (sessionId, payload = {}) => {
  const session = await PosSession.findOne({ sessionId });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  return closeSession(session, payload);
};

const closeCurrent = async (payload = {}, user = {}) => {
  const storeCode = user.storeCode || payload.storeCode;
  const cashierId = user.email || user.employeeCode || user.loginId || payload.cashierId;

  const session = await PosSession.findOne({
    storeCode,
    cashierId,
    status: "OPEN",
  });

  if (!session) {
    const error = new Error("No open session found for this cashier");
    error.statusCode = 404;
    throw error;
  }

  return closeSession(session, payload);
};

// ---- Manager resolves only flagged exceptions; clean sessions need no action ----
const resolveException = async (sessionId, payload = {}, user = {}) => {
  const session = await PosSession.findOne({ sessionId });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role === "MANAGER" && session.storeCode !== user.storeCode) {
    const error = new Error("You cannot resolve another store's session");
    error.statusCode = 403;
    throw error;
  }

  const resolvedBy = user.email || user.employeeCode || "MANAGER";
  const now = new Date();

  session.exceptions = (session.exceptions || []).map((ex) => {
    const plain = ex.toObject ? ex.toObject() : ex;

    if (plain.status === "OPEN" && (!payload.exceptionType || plain.type === payload.exceptionType)) {
      return {
        ...plain,
        status: payload.action === "ignore" ? "IGNORED" : "RESOLVED",
        resolvedAt: now,
        resolvedBy,
        resolutionNote: payload.resolutionNote || "Resolved by manager",
      };
    }

    return plain;
  });

  const openExceptions = session.exceptions.filter((x) => x.status === "OPEN");

  if (openExceptions.length === 0) {
    session.status = "RESOLVED";
    session.managerApprovalRequired = false;
    session.resolvedByManagerAt = now;
  }

  await session.save();

  return session;
};

const list = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.cashierId) filter.cashierId = query.cashierId;
  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.businessDate) filter.businessDate = query.businessDate;
  if (query.managerApprovalRequired === "true") filter.managerApprovalRequired = true;

  if (user && user.role !== "ADMIN" && user.storeCode) {
    filter.storeCode = user.storeCode;
  }

  const [items, total] = await Promise.all([
    PosSession.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    PosSession.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

// ---- Store day closing: blocked only by OPEN or EXCEPTION_FLAGGED sessions ----
const getStoreDaySessions = async ({ storeCode, businessDate }) => {
  if (!storeCode) {
    const error = new Error("storeCode is required");
    error.statusCode = 400;
    throw error;
  }

  const date = businessDate || toBusinessDate();
  const sessions = await PosSession.find({ storeCode, businessDate: date });

  return { date, sessions };
};

const canCloseStoreDay = async ({ storeCode, businessDate }) => {
  const { date, sessions } = await getStoreDaySessions({ storeCode, businessDate });

  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const exceptionSessions = sessions.filter((s) => s.status === "EXCEPTION_FLAGGED");
  const validSessions = sessions.filter((s) => ["AUTO_VERIFIED", "RESOLVED"].includes(s.status));

  const blockers = [];

  if (openSessions.length) {
    blockers.push(`${openSessions.length} cashier session(s) still open`);
  }

  if (exceptionSessions.length) {
    blockers.push(`${exceptionSessions.length} exception session(s) need resolution`);
  }

  return {
    storeCode,
    businessDate: date,
    canCloseStoreDay: blockers.length === 0,
    totalSessions: sessions.length,
    validSessions: validSessions.length,
    openSessions: openSessions.length,
    exceptionSessions: exceptionSessions.length,
    autoVerifiedSessions: sessions.filter((s) => s.status === "AUTO_VERIFIED").length,
    criticalExceptions: exceptionSessions.length,
    blockers,
    status: blockers.length === 0 ? "READY_TO_CLOSE" : "BLOCKED",
  };
};

const closeStoreDay = async ({ storeCode, businessDate }, user = {}) => {
  if (user.role === "MANAGER" && storeCode !== user.storeCode) {
    const error = new Error("You cannot close another store's day");
    error.statusCode = 403;
    throw error;
  }

  const report = await canCloseStoreDay({ storeCode, businessDate });

  if (!report.canCloseStoreDay) {
    const error = new Error("Store day cannot be closed: " + report.blockers.join("; "));
    error.statusCode = 409;
    error.report = report;
    throw error;
  }

  await PosSession.updateMany(
    {
      storeCode,
      businessDate: report.businessDate,
      status: { $in: ["AUTO_VERIFIED", "RESOLVED"] },
    },
    {
      $set: { status: "STORE_DAY_CLOSED", storeDayClosedAt: new Date() },
    }
  );

  return { ...report, closedAt: new Date(), closedBy: user.email || user.employeeCode || "MANAGER" };
};

module.exports = {
  start,
  getCurrent,
  getById,
  close,
  closeCurrent,
  closeSession,
  autoVerifySession,
  resolveException,
  list,
  canCloseStoreDay,
  closeStoreDay,
};
