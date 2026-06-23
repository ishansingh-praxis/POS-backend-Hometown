const mongoose = require("mongoose");
const SalesOrder = require("./model");
const Inventory = require("../inventories/model");
const InventoryMovement = require("../inventoryMovements/model");
const Payment = require("../payments/model");
const deliverySchedulesService = require("../deliverySchedules/service");
const auditLogService = require("../auditLogs/service");
const { findOrCreateCustomer, calculateBill } = require("../cashierCheckout/service");

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const round2 = (value) => Number(Number(value || 0).toFixed(2));

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

// Booking a sales order doesn't fulfill it immediately like an OTC sale does —
// stock is RESERVED for the scheduled delivery instead of sold/shipped now, so
// it can't be double-sold to a walk-in customer at the same store in the meantime.
const reserveInventory = async ({ items, storeCode, cashierId, cashierName, salesOrderId, dbSession }) => {
  const movements = [];

  for (const item of items) {
    const inventory = await Inventory.findOne({
      storeCode: String(storeCode),
      sku: String(item.sku),
      locationType: "Store",
      isPosEnabled: true,
      status: "ACTIVE",
    }).session(dbSession);

    if (!inventory) {
      const error = new Error(`Inventory not found in this store for SKU ${item.sku}`);
      error.statusCode = 400;
      throw error;
    }

    const quantity = Number(item.quantity || 1);

    if (Number(inventory.atpQty || 0) < quantity) {
      const error = new Error(`Out of stock: ${item.productName || item.sku}. ATP available: ${inventory.atpQty}`);
      error.statusCode = 400;
      throw error;
    }

    const beforeAtpQty = Number(inventory.atpQty || 0);

    await Inventory.updateOne(
      { _id: inventory._id, atpQty: { $gte: quantity } },
      {
        $inc: {
          reservedQty: quantity,
          availableQty: -quantity,
          atpQty: -quantity,
        },
      },
      { session: dbSession }
    );

    const movement = await InventoryMovement.create(
      [
        {
          movementId: generateId(`MOV-${storeCode}`),
          movementType: "RESERVATION",
          storeCode,
          siteCode: inventory.siteCode,
          siteName: inventory.siteName,
          sku: item.sku,
          productId: item.productId,
          productName: item.productName,
          quantity: -quantity,
          beforeQty: beforeAtpQty,
          afterQty: beforeAtpQty - quantity,
          orderId: salesOrderId,
          cashierId,
          cashierName,
          sourceSystem: "POS",
          status: "COMPLETED",
          remarks: "ATP reserved for sales order booking",
        },
      ],
      { session: dbSession }
    );

    movements.push(movement[0]);
  }

  return movements;
};

const releaseReservation = async ({ items, storeCode, salesOrderId, dbSession }) => {
  for (const item of items) {
    const quantity = Number(item.quantity || 1);

    await Inventory.updateOne(
      { storeCode: String(storeCode), sku: String(item.sku), locationType: "Store" },
      { $inc: { reservedQty: -quantity, availableQty: quantity, atpQty: quantity } },
      { session: dbSession }
    );

    await InventoryMovement.create(
      [
        {
          movementId: generateId(`MOV-${storeCode}`),
          movementType: "RESERVATION_RELEASE",
          storeCode,
          sku: item.sku,
          productId: item.productId,
          productName: item.productName,
          quantity,
          orderId: salesOrderId,
          sourceSystem: "POS",
          status: "COMPLETED",
          remarks: "Reservation released — sales order cancelled",
        },
      ],
      { session: dbSession }
    );
  }
};

const calculateOrderPayments = (payments = [], grandTotal) => {
  const normalized = payments.map((p) => ({
    ...p,
    paymentMode: p.paymentMode || p.method || p.paymentMethod,
    paymentMethod: p.paymentMethod || p.paymentMode || p.method,
    amount: Number(p.amount || 0),
  }));

  const paidAmount = round2(normalized.reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const dueAmount = round2(Math.max(0, Number(grandTotal || 0) - paidAmount));

  let paymentStatus = "UNPAID";
  if (paidAmount >= grandTotal && grandTotal > 0) paymentStatus = "PAID";
  else if (paidAmount > 0) paymentStatus = "PARTIAL";

  return { payments: normalized, paidAmount, dueAmount, paymentStatus };
};

const createSalesOrder = async (payload = {}, user = {}) => {
  const { storeCode, storeName, cashierId, cashierName } = getContext(payload, user);
  const items = payload.items || [];

  if (!items.length) {
    const error = new Error("Sales order must have at least one item");
    error.statusCode = 400;
    throw error;
  }

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const customer = await findOrCreateCustomer({
      payload,
      storeCode,
      storeName,
      cashierId,
      cashierName,
      dbSession,
    });

    const salesOrderId = generateId(`SO-${storeCode}`);

    const movements = await reserveInventory({
      items,
      storeCode,
      cashierId,
      cashierName,
      salesOrderId,
      dbSession,
    });

    const bill = calculateBill({
      items,
      billDiscountPercent: payload.billDiscountPercent || 0,
      couponDiscount: payload.couponDiscount || 0,
      voucherDiscount: payload.voucherDiscount || 0,
      deliveryFee: payload.deliveryFee || 0,
      installationFee: payload.installationFee || 0,
    });

    const paymentCalc = calculateOrderPayments(payload.payments || [], bill.grandTotal);

    const deliveryPayload = payload.deliverySchedule || {};

    const deliverySchedule = await deliverySchedulesService.createSchedule(
      {
        salesOrderId,
        storeCode,
        storeName,
        customerPhone: customer.customerPhone || customer.phone,
        customerName: customer.customerName || customer.name,
        deliveryOption: deliveryPayload.deliveryOption,
        deliveryDate: deliveryPayload.deliveryDate,
        deliverySiteCode: deliveryPayload.deliverySiteCode,
        billingAddress: deliveryPayload.billingAddress,
        shippingAddress: deliveryPayload.shippingAddress,
      },
      dbSession
    );

    const orderArr = await SalesOrder.create(
      [
        {
          salesOrderId,
          transactionType: "SALES_ORDER_BOOKING",
          storeCode,
          storeName,
          cashierId,
          cashierName,
          salespersonName: payload.salespersonName || cashierName,

          customerId: customer.customerId,
          customerName: customer.customerName || customer.name,
          customerPhone: customer.customerPhone || customer.phone,
          customerEmail: customer.email || "",

          items: bill.items,
          itemCount: bill.items.length,

          subtotal: bill.subtotal,
          itemDiscountTotal: bill.itemDiscountTotal,
          billDiscountPercent: bill.billDiscountPercent,
          billDiscountAmount: bill.billDiscountAmount,
          couponCode: payload.couponCode || "",
          couponDiscount: bill.couponDiscount,
          discountAmount: round2(bill.itemDiscountTotal + bill.billDiscountAmount + bill.couponDiscount + bill.voucherDiscount),

          taxableAmount: bill.taxableAmount,
          gstPercent: bill.gstPercent,
          gstAmount: bill.gstTotal,

          deliveryFee: bill.deliveryFee,
          installationFee: bill.installationFee,

          grandTotal: bill.grandTotal,
          paidAmount: paymentCalc.paidAmount,
          dueAmount: paymentCalc.dueAmount,
          paymentStatus: paymentCalc.paymentStatus,
          orderStatus: "BOOKED",

          deliveryScheduleId: deliverySchedule.deliveryScheduleId,
          deliverySchedule,

          payments: paymentCalc.payments,
        },
      ],
      { session: dbSession }
    );

    const savedOrder = orderArr[0];

    const savedPayments = [];
    for (const payment of paymentCalc.payments) {
      const paymentArr = await Payment.create(
        [
          {
            paymentId: generateId(`PAY-${storeCode}`),
            orderId: salesOrderId,
            storeCode,
            storeName,
            customerPhone: customer.customerPhone || customer.phone,
            customerName: customer.customerName || customer.name,
            paymentMethod: payment.paymentMethod,
            paymentMode: payment.paymentMode,
            amount: payment.amount,
            paymentStatus: "SUCCESS",
            transactionType: "SALES_ORDER_BOOKING",
            transactionReference: payment.transactionReference || generateId("TXN"),
            cashNotes: payment.cashNotes || {},
            paidAt: new Date(),
            sourceSystem: "POS",
          },
        ],
        { session: dbSession }
      );
      savedPayments.push(paymentArr[0]);
    }

    await auditLogService.create(
      {
        action: "ORDER_BOOKING_CREATED",
        module: "SALES_ORDERS",
        storeCode,
        storeName,
        cashierId,
        cashierName,
        customerPhone: customer.customerPhone || customer.phone,
        orderId: salesOrderId,
        amount: bill.grandTotal,
        meta: { salesOrderId, deliveryScheduleId: deliverySchedule.deliveryScheduleId, paymentStatus: paymentCalc.paymentStatus },
        message: `Sales order ${salesOrderId} booked`,
      },
      { session: dbSession }
    );

    await dbSession.commitTransaction();

    return { customer, salesOrder: savedOrder, deliverySchedule, payments: savedPayments, inventoryMovements: movements };
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};

const buildFilter = (query = {}, user = {}) => {
  const filter = {};

  if (query.salesOrderId) filter.salesOrderId = query.salesOrderId;
  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.customerPhone) filter.customerPhone = query.customerPhone;

  if (query.q || query.search) {
    const rx = new RegExp(query.q || query.search, "i");
    filter.$or = [{ salesOrderId: rx }, { customerPhone: rx }, { customerName: rx }];
  }

  if (user.role !== "ADMIN" && user.storeCode) filter.storeCode = user.storeCode;
  else if (query.storeCode) filter.storeCode = query.storeCode;

  return filter;
};

const listSalesOrders = async (query = {}, user = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "50", 10), 1), 200);
  const filter = buildFilter(query, user);

  const [data, total] = await Promise.all([
    SalesOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    SalesOrder.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

const getSalesOrderById = async (salesOrderId) => SalesOrder.findOne({ salesOrderId });

const updateStatus = async (salesOrderId, status, user = {}) => {
  const order = await SalesOrder.findOne({ salesOrderId });

  if (!order) {
    const error = new Error("Sales order not found");
    error.statusCode = 404;
    throw error;
  }

  if (status === "CANCELLED" && order.orderStatus !== "CANCELLED") {
    const dbSession = await mongoose.startSession();
    try {
      dbSession.startTransaction();
      await releaseReservation({ items: order.items, storeCode: order.storeCode, salesOrderId, dbSession });
      order.orderStatus = "CANCELLED";
      order.cancelledAt = new Date();
      order.cancelReason = "Cancelled from POS";
      await order.save({ session: dbSession });
      await auditLogService.create(
        {
          action: "ORDER_CANCELLED",
          module: "SALES_ORDERS",
          storeCode: order.storeCode,
          cashierId: user.email || user.employeeCode,
          cashierName: user.name,
          orderId: salesOrderId,
          amount: order.grandTotal,
          message: `Sales order ${salesOrderId} cancelled, reservation released`,
        },
        { session: dbSession }
      );
      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
    return order;
  }

  order.orderStatus = status;
  await order.save();

  if (order.deliveryScheduleId && ["SCHEDULED", "DISPATCHED", "DELIVERED"].includes(status)) {
    await deliverySchedulesService.updateStatus(order.deliveryScheduleId, status);
  }

  await auditLogService.create({
    action: "ORDER_STATUS_UPDATED",
    module: "SALES_ORDERS",
    storeCode: order.storeCode,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    orderId: salesOrderId,
    meta: { status },
    message: `Sales order ${salesOrderId} marked ${status}`,
  });

  return order;
};

const addPayment = async (salesOrderId, paymentPayload = {}, user = {}) => {
  const order = await SalesOrder.findOne({ salesOrderId });

  if (!order) {
    const error = new Error("Sales order not found");
    error.statusCode = 404;
    throw error;
  }

  const amount = Number(paymentPayload.amount || 0);
  if (amount <= 0) {
    const error = new Error("Payment amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const payment = {
    paymentMode: paymentPayload.paymentMode || paymentPayload.method,
    paymentMethod: paymentPayload.paymentMethod || paymentPayload.method,
    amount,
    transactionReference: paymentPayload.transactionReference || generateId("TXN"),
    cashNotes: paymentPayload.cashNotes || {},
  };

  order.payments = [...(order.payments || []), payment];
  order.paidAmount = round2(Number(order.paidAmount || 0) + amount);
  order.dueAmount = round2(Math.max(0, Number(order.grandTotal || 0) - order.paidAmount));
  order.paymentStatus = order.dueAmount <= 0 ? "PAID" : "PARTIAL";
  await order.save();

  await Payment.create({
    paymentId: generateId(`PAY-${order.storeCode}`),
    orderId: salesOrderId,
    storeCode: order.storeCode,
    storeName: order.storeName,
    customerPhone: order.customerPhone,
    customerName: order.customerName,
    paymentMethod: payment.paymentMethod,
    paymentMode: payment.paymentMode,
    amount,
    paymentStatus: "SUCCESS",
    transactionType: "SALES_ORDER_BOOKING",
    transactionReference: payment.transactionReference,
    cashNotes: payment.cashNotes,
    paidAt: new Date(),
    sourceSystem: "POS",
  });

  await auditLogService.create({
    action: "ORDER_STATUS_UPDATED",
    module: "SALES_ORDERS",
    storeCode: order.storeCode,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    orderId: salesOrderId,
    amount,
    meta: { paymentStatus: order.paymentStatus, dueAmount: order.dueAmount },
    message: `Payment of ${amount} collected against sales order ${salesOrderId}`,
  });

  return order;
};

module.exports = {
  createSalesOrder,
  listSalesOrders,
  getSalesOrderById,
  updateStatus,
  addPayment,
};
