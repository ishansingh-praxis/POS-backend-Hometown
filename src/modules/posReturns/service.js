const Order = require("../orders/model");
const Inventory = require("../inventories/model");
const InventoryMovement = require("../inventoryMovements/model");
const PosReturn = require("./model");
const creditNotesService = require("../creditNotes/service");
const auditLogService = require("../auditLogs/service");

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const round2 = (value) => Number(Number(value || 0).toFixed(2));

const fetchInvoice = async ({ invoiceId, orderId, q }, user = {}) => {
  const filter = {};

  if (invoiceId) filter.invoiceId = invoiceId;
  else if (orderId) filter.orderId = orderId;
  else if (q) filter.$or = [{ invoiceId: q }, { orderId: q }, { customerPhone: q }];
  else {
    const error = new Error("Provide an invoiceId, orderId, or mobile number to look up the original bill");
    error.statusCode = 400;
    throw error;
  }

  if (user.role !== "ADMIN" && user.storeCode) filter.storeCode = user.storeCode;

  const order = await Order.findOne(filter).sort({ createdAt: -1 });

  if (!order) {
    const error = new Error("Original bill not found");
    error.statusCode = 404;
    throw error;
  }

  if (order.orderStatus === "CANCELLED") {
    const error = new Error("This bill was cancelled and can't be returned against");
    error.statusCode = 400;
    throw error;
  }

  return order;
};

// Returned items become sellable stock again by default (the simple, common
// case) — stockQty/availableQty/atpQty all increase, logged as a RETURN movement.
const restockReturnedItems = async ({ returnItems, storeCode }) => {
  for (const item of returnItems) {
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) continue;

    const inventory = await Inventory.findOne({ storeCode: String(storeCode), sku: String(item.sku) });
    if (!inventory) continue; // SKU may no longer be carried at this store — return value still honored, stock just isn't tracked back

    const beforeQty = Number(inventory.stockQty || 0);

    await Inventory.updateOne(
      { _id: inventory._id },
      { $inc: { stockQty: quantity, availableQty: quantity, atpQty: quantity, returnedQty: quantity } }
    );

    await InventoryMovement.create({
      movementId: generateId(`MOV-${storeCode}`),
      movementType: "RETURN",
      storeCode,
      sku: item.sku,
      productId: item.productId,
      productName: item.productName,
      quantity,
      beforeQty,
      afterQty: beforeQty + quantity,
      sourceSystem: "POS",
      status: "COMPLETED",
      remarks: "Restocked from customer return",
    });
  }
};

const confirmReturn = async (payload = {}, user = {}) => {
  const storeCode = user.storeCode || payload.storeCode;
  const returnItems = payload.returnItems || [];

  if (!returnItems.length) {
    const error = new Error("Select at least one item to return");
    error.statusCode = 400;
    throw error;
  }

  if (!payload.customerPhone) {
    const error = new Error("Customer phone is required");
    error.statusCode = 400;
    throw error;
  }

  const returnAmount = round2(
    returnItems.reduce((sum, item) => sum + Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0)
  );

  if (returnAmount <= 0) {
    const error = new Error("Return amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const returnId = generateId(`RET-${storeCode}`);

  await restockReturnedItems({ returnItems, storeCode });

  const creditNote = await creditNotesService.issueCreditNote(
    {
      customerPhone: payload.customerPhone,
      customerName: payload.customerName,
      storeCode,
      originalInvoiceId: payload.originalInvoiceId,
      returnId,
      creditAmount: returnAmount,
    },
    user
  );

  const posReturn = await PosReturn.create({
    returnId,
    originalInvoiceId: payload.originalInvoiceId || "",
    originalOrderId: payload.originalOrderId || "",
    storeCode,
    cashierId: user.email || user.employeeCode || payload.cashierId,
    cashierName: user.name || payload.cashierName,
    customerPhone: payload.customerPhone,
    customerName: payload.customerName || "",
    returnItems,
    returnAmount,
    returnReason: payload.returnReason || "",
    status: "CONFIRMED",
    generatedCreditNoteId: creditNote.creditNoteId,
  });

  await auditLogService.create({
    action: "RETURN_INITIATED",
    module: "RETURNS",
    storeCode,
    cashierId: posReturn.cashierId,
    cashierName: posReturn.cashierName,
    customerPhone: payload.customerPhone,
    orderId: payload.originalOrderId,
    invoiceId: payload.originalInvoiceId,
    amount: returnAmount,
    meta: { returnId, creditNoteId: creditNote.creditNoteId },
    message: `Return ${returnId} confirmed, credit note ${creditNote.creditNoteId} issued`,
  });

  return { posReturn, creditNote };
};

const listReturns = async (query = {}, user = {}) => {
  const filter = {};
  if (query.customerPhone) filter.customerPhone = query.customerPhone;
  if (user.role !== "ADMIN" && user.storeCode) filter.storeCode = user.storeCode;
  else if (query.storeCode) filter.storeCode = query.storeCode;

  return PosReturn.find(filter).sort({ createdAt: -1 }).limit(200);
};

const getReturnById = async (returnId) => PosReturn.findOne({ returnId });

module.exports = {
  fetchInvoice,
  confirmReturn,
  listReturns,
  getReturnById,
};
