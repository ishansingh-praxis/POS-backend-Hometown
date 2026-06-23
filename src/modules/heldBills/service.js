const HeldBill = require("./model");
const auditLogService = require("../auditLogs/service");

const generateHoldId = (storeCode) =>
  `HOLD-${storeCode}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const getContext = (payload = {}, user = {}) => {
  const storeCode = user.storeCode || payload.storeCode;
  const cashierId = user.email || user.employeeCode || user.loginId || payload.cashierId;

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

  return {
    storeCode,
    storeName: user.storeName || payload.storeName,
    cashierId,
    cashierName: user.name || payload.cashierName,
  };
};

const holdBill = async (payload = {}, user = {}) => {
  const { storeCode, storeName, cashierId, cashierName } = getContext(payload, user);

  if (!Array.isArray(payload.items) || !payload.items.length) {
    const error = new Error("Cannot hold an empty cart");
    error.statusCode = 400;
    throw error;
  }

  const holdId = generateHoldId(storeCode);

  const bill = await HeldBill.create({
    holdId,
    storeCode,
    storeName,
    cashierId,
    cashierName,

    customerPhone: payload.customerPhone || payload.customer?.phone || "",
    customer: payload.customer || {},

    items: payload.items,
    itemCount: payload.items.length,
    posState: payload.posState || {},

    subtotal: Number(payload.subtotal || 0),
    discountAmount: Number(payload.discountAmount || 0),
    gstAmount: Number(payload.gstAmount || 0),
    grandTotal: Number(payload.grandTotal || 0),

    status: "HELD",
    heldAt: new Date(),
  });

  await auditLogService.create({
    action: "HOLD_BILL",
    module: "HELD_BILLS",
    storeCode,
    storeName,
    cashierId,
    cashierName,
    customerPhone: bill.customerPhone,
    amount: bill.grandTotal,
    meta: { holdId, itemCount: bill.itemCount },
    message: `Bill held as ${holdId}`,
  });

  return bill;
};

const listHeldBills = async (query = {}, user = {}) => {
  const filter = { status: query.status || "HELD" };

  if (user.role === "CASHIER" || user.role === "MANAGER") {
    filter.storeCode = user.storeCode;
  } else if (query.storeCode) {
    filter.storeCode = query.storeCode;
  }

  if (query.cashierId) filter.cashierId = query.cashierId;

  return HeldBill.find(filter).sort({ heldAt: -1 });
};

const getHeldBill = async (holdId) => HeldBill.findOne({ holdId });

const recallHeldBill = async (holdId, user = {}) => {
  const bill = await HeldBill.findOne({ holdId });

  if (!bill) {
    const error = new Error("Held bill not found");
    error.statusCode = 404;
    throw error;
  }

  if (bill.status !== "HELD") {
    const error = new Error(`Held bill is already ${bill.status}`);
    error.statusCode = 400;
    throw error;
  }

  bill.status = "RECALLED";
  bill.recalledAt = new Date();
  await bill.save();

  await auditLogService.create({
    action: "RECALL_BILL",
    module: "HELD_BILLS",
    storeCode: bill.storeCode,
    storeName: bill.storeName,
    cashierId: user.email || user.employeeCode || bill.cashierId,
    cashierName: user.name || bill.cashierName,
    customerPhone: bill.customerPhone,
    amount: bill.grandTotal,
    meta: { holdId },
    message: `Bill ${holdId} recalled`,
  });

  return bill;
};

const voidHeldBill = async (holdId, user = {}) => {
  const bill = await HeldBill.findOne({ holdId });

  if (!bill) {
    const error = new Error("Held bill not found");
    error.statusCode = 404;
    throw error;
  }

  if (bill.status !== "HELD") {
    const error = new Error(`Held bill is already ${bill.status}`);
    error.statusCode = 400;
    throw error;
  }

  bill.status = "VOIDED";
  bill.voidedAt = new Date();
  await bill.save();

  await auditLogService.create({
    action: "VOID_BILL",
    module: "HELD_BILLS",
    storeCode: bill.storeCode,
    storeName: bill.storeName,
    cashierId: user.email || user.employeeCode || bill.cashierId,
    cashierName: user.name || bill.cashierName,
    customerPhone: bill.customerPhone,
    amount: bill.grandTotal,
    meta: { holdId },
    message: `Held bill ${holdId} voided`,
  });

  return bill;
};

module.exports = {
  holdBill,
  listHeldBills,
  getHeldBill,
  recallHeldBill,
  voidHeldBill,
};
