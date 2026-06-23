const mongoose = require("mongoose");
const Customer = require("../customers/customers.model");
const Order = require("../orders/model");
const Invoice = require("../invoices/model");
const Payment = require("../payments/model");
const Inventory = require("../inventories/model");
const InventoryMovement = require("../inventoryMovements/model");
const PosSession = require("../posSessions/model");
const auditLogService = require("../auditLogs/service");

const GST_PERCENT = 18;

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const getCashierContext = (payload, user = {}) => {
  const storeCode = user.storeCode || payload.storeCode;
  const storeName = user.storeName || payload.storeName;

  const cashierId =
    user.email ||
    user.employeeCode ||
    user.loginId ||
    payload.cashierId;

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

  return {
    storeCode,
    storeName,
    cashierId,
    cashierName,
  };
};

const findOrCreateCustomer = async ({ payload, storeCode, storeName, cashierId, cashierName, dbSession }) => {
  const customerPayload = payload.customer || {};
  const phone =
    customerPayload.customerPhone ||
    customerPayload.phone ||
    customerPayload.mobile;

  if (!phone) {
    const error = new Error("Customer phone is required");
    error.statusCode = 400;
    throw error;
  }

  let customer = await Customer.findOne({
    storeCode,
    customerPhone: String(phone),
  }).session(dbSession);

  if (customer) {
    customer.lastServedByCashierId = cashierId;
    customer.lastServedByCashierName = cashierName;
    customer.lastVisit = new Date().toISOString();
    await customer.save({ session: dbSession });
    return customer;
  }

  const createdArr = await Customer.create(
    [
      {
        customerId: customerPayload.customerId || `CUST-${phone}`,
        name: customerPayload.name || customerPayload.customerName || "Walk-in Customer",
        customerName: customerPayload.customerName || customerPayload.name || "Walk-in Customer",

        phone,
        mobile: phone,
        customerPhone: phone,

        email: customerPayload.email || "",
        customerType: customerPayload.customerType || "B2C",

        storeCode,
        storeName,

        city: customerPayload.city || "",
        primaryCity: customerPayload.city || "",

        gstNumber: customerPayload.gstNumber || customerPayload.gstin || "",
        gstin: customerPayload.gstNumber || customerPayload.gstin || "",
        // panNumber isn't in the declared schema (collection is strict:false), kept
        // ad-hoc here the same way other SAP-import fields are.
        panNumber: customerPayload.panNumber || "",

        billingAddress: customerPayload.billingAddress || {},
        deliveryAddress: customerPayload.deliveryAddress || {},
        deliveryAddresses: customerPayload.deliveryAddresses || [],

        createdByCashierId: cashierId,
        createdByCashierName: cashierName,
        lastServedByCashierId: cashierId,
        lastServedByCashierName: cashierName,

        invoiceCount: 0,
        orderCount: 0,
        totalSpend: 0,
        totalSpent: 0,
        totalPaid: 0,
        totalDue: 0,
        totalRefund: 0,

        status: "ACTIVE",
        isActive: true,
        sourceSystem: "POS",
      },
    ],
    { session: dbSession }
  );

  return createdArr[0];
};

const checkInventory = async ({ items, storeCode, dbSession }) => {
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

    if (Number(inventory.atpQty || 0) < Number(item.quantity || 1)) {
      const error = new Error(
        `Out of stock: ${item.productName || item.sku}. ATP available: ${inventory.atpQty}`
      );
      error.statusCode = 400;
      throw error;
    }
  }
};

const calculateBill = ({ items = [], billDiscountPercent = 0, couponDiscount = 0, voucherDiscount = 0, deliveryFee = 0, installationFee = 0 }) => {
  let subtotal = 0;
  let itemDiscountTotal = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const mrp = Number(item.mrp || item.unitPrice || item.sellingPrice || 0);
    const unitPrice = Number(item.unitPrice || item.sellingPrice || mrp || 0);

    const itemGross = round2(mrp * quantity);
    const itemNet = round2(unitPrice * quantity);
    const itemDiscountAmount = round2(itemGross - itemNet);

    subtotal += itemGross;
    itemDiscountTotal += itemDiscountAmount;

    return {
      ...item,
      quantity,
      mrp,
      unitPrice,
      itemGross,
      itemDiscountAmount,
      lineNetBeforeTax: itemNet,
    };
  });

  subtotal = round2(subtotal);
  itemDiscountTotal = round2(itemDiscountTotal);

  const afterItemDiscount = round2(subtotal - itemDiscountTotal);

  const billDiscountAmount = round2(
    (afterItemDiscount * Number(billDiscountPercent || 0)) / 100
  );

  const afterBillDiscount = round2(afterItemDiscount - billDiscountAmount);
  const afterCoupon = round2(afterBillDiscount - Number(couponDiscount || 0) - Number(voucherDiscount || 0));

  const taxableAmount = round2(afterCoupon / (1 + GST_PERCENT / 100));
  const gstTotal = round2(afterCoupon - taxableAmount);

  const grandTotal = round2(
    afterCoupon + Number(deliveryFee || 0) + Number(installationFee || 0)
  );

  const finalItems = calculatedItems.map((item) => {
    const itemShare =
      afterItemDiscount > 0 ? item.lineNetBeforeTax / afterItemDiscount : 0;

    const itemBillDiscount = round2(billDiscountAmount * itemShare);
    const itemCouponDiscount = round2(Number(couponDiscount || 0) * itemShare);
    const itemVoucherDiscount = round2(Number(voucherDiscount || 0) * itemShare);
    const lineTotal = round2(
      item.lineNetBeforeTax - itemBillDiscount - itemCouponDiscount - itemVoucherDiscount
    );

    const lineTaxable = round2(lineTotal / 1.18);
    const lineGst = round2(lineTotal - lineTaxable);

    return {
      ...item,
      billDiscountAmount: itemBillDiscount,
      couponDiscount: itemCouponDiscount,
      voucherDiscount: itemVoucherDiscount,
      gstPercent: GST_PERCENT,
      taxableAmount: lineTaxable,
      gstAmount: lineGst,
      lineTotal,
    };
  });

  return {
    items: finalItems,

    subtotal,
    itemDiscountTotal,
    billDiscountPercent: Number(billDiscountPercent || 0),
    billDiscountAmount,
    couponDiscount: Number(couponDiscount || 0),
    voucherDiscount: Number(voucherDiscount || 0),

    taxableAmount,
    gstPercent: GST_PERCENT,
    gstTotal,

    deliveryFee: Number(deliveryFee || 0),
    installationFee: Number(installationFee || 0),

    grandTotal,
  };
};

const calculatePayments = ({ payments = [], grandTotal }) => {
  const normalizedPayments = payments.map((payment) => ({
    ...payment,
    paymentMode: payment.paymentMode || payment.method || payment.paymentMethod,
    paymentMethod: payment.paymentMethod || payment.paymentMode || payment.method,
    amount: Number(payment.amount || 0),
  }));

  const paidAmount = round2(
    normalizedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  const dueAmount = round2(Math.max(0, Number(grandTotal || 0) - paidAmount));

  let paymentStatus = "PENDING";

  if (paidAmount >= grandTotal) paymentStatus = "PAID";
  else if (paidAmount > 0) paymentStatus = "PARTIAL";

  const paymentMode =
    normalizedPayments.length > 1
      ? "MIXED"
      : normalizedPayments[0]?.paymentMode || "PENDING";

  return {
    payments: normalizedPayments,
    paidAmount,
    dueAmount,
    paymentStatus,
    paymentMode,
  };
};

const updateInventoryAfterSale = async ({
  items,
  storeCode,
  storeName,
  cashierId,
  cashierName,
  sessionId,
  posDeviceId,
  orderId,
  invoiceId,
  dbSession,
}) => {
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
      const error = new Error(`Inventory not found for SKU ${item.sku}`);
      error.statusCode = 400;
      throw error;
    }

    const beforeQty = Number(inventory.stockQty || 0);
    const beforeAtpQty = Number(inventory.atpQty || 0);
    const quantity = Number(item.quantity || 1);

    const afterQty = beforeQty - quantity;
    const afterAtpQty = beforeAtpQty - quantity;

    if (afterAtpQty < 0) {
      const error = new Error(`ATP stock became negative for SKU ${item.sku}`);
      error.statusCode = 400;
      throw error;
    }

    const stockStatus =
      afterAtpQty <= 0
        ? "OUT_OF_STOCK"
        : afterAtpQty <= 2
        ? "LOW_STOCK"
        : afterAtpQty <= 5
        ? "LIMITED_STOCK"
        : "IN_STOCK";

    await Inventory.updateOne(
      {
        _id: inventory._id,
        atpQty: { $gte: quantity },
      },
      {
        $inc: {
          stockQty: -quantity,
          atpQty: -quantity,
          availableQty: -quantity,
          soldQty: quantity,
        },
        $set: {
          stockStatus,
          lastSoldAt: new Date(),
          lastSoldByCashierId: cashierId,
          lastSoldByCashierName: cashierName,
        },
      },
      { session: dbSession }
    );

    const movement = await InventoryMovement.create(
      [
        {
          movementId: generateId(`MOV-${storeCode}`),
          movementType: "SALE",

          storeCode,
          storeName,

          siteCode: inventory.siteCode,
          siteName: inventory.siteName,

          sku: item.sku,
          articleNo: item.articleNo || item.sku,
          productId: item.productId,
          productName: item.productName,
          barcode: item.barcode,
          category: item.category,
          brand: item.brand,
          lob: inventory.lob,

          quantity: -quantity,

          beforeQty,
          afterQty,
          beforeAtpQty,
          afterAtpQty,

          orderId,
          invoiceId,

          cashierId,
          cashierName,
          sessionId,
          posDeviceId,

          sourceSystem: "POS",
          status: "COMPLETED",
          remarks: "ATP inventory reduced due to POS sale",
        },
      ],
      { session: dbSession }
    );

    movements.push(movement[0]);
  }

  return movements;
};

const updateCustomerAfterSale = async ({
  customer,
  orderId,
  invoiceId,
  grandTotal,
  paidAmount,
  dueAmount,
  cashierId,
  cashierName,
  dbSession,
}) => {
  await Customer.updateOne(
    { _id: customer._id },
    {
      $inc: {
        invoiceCount: 1,
        orderCount: 1,
        orders: 1,
        visits: 1,
        totalSpend: grandTotal,
        totalSpent: grandTotal,
        totalHistoricalSalesValue: grandTotal,
        totalPaid: paidAmount,
        totalDue: dueAmount,
      },
      $set: {
        lastInvoiceId: invoiceId,
        lastOrderId: orderId,
        lastPurchaseDate: new Date(),
        lastVisit: new Date().toISOString(),
        lastServedByCashierId: cashierId,
        lastServedByCashierName: cashierName,
      },
    },
    { session: dbSession }
  );
};

const updateSessionAfterSale = async ({ session, payments, grandTotal, dbSession }) => {
  const inc = {
    totalSales: Number(grandTotal || 0),
    orderCount: 1,
    invoiceCount: 1,
    paymentCount: payments.length,
  };

  for (const payment of payments) {
    const mode = payment.paymentMode || payment.paymentMethod;
    const amount = Number(payment.amount || 0);

    if (mode === "CASH") {
      inc.cashSales = (inc.cashSales || 0) + amount;
      inc.expectedCash = (inc.expectedCash || 0) + amount;
    } else if (mode === "UPI") {
      inc.upiSales = (inc.upiSales || 0) + amount;
    } else if (mode === "CARD") {
      inc.cardSales = (inc.cardSales || 0) + amount;
    } else {
      inc.splitSales = (inc.splitSales || 0) + amount;
    }
  }

  await PosSession.updateOne(
    { _id: session._id },
    {
      $inc: inc,
    },
    { session: dbSession }
  );
};

const cashierCheckout = async (payload = {}, user = {}) => {
  const { storeCode, storeName, cashierId, cashierName } =
    getCashierContext(payload, user);

  const items = payload.items || [];

  if (!items.length) {
    const error = new Error("Cart is empty");
    error.statusCode = 400;
    throw error;
  }

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const session = await PosSession.findOne({
      storeCode,
      cashierId,
      status: "OPEN",
    }).session(dbSession);

    if (!session) {
      const error = new Error("Cashier must start shift before billing");
      error.statusCode = 400;
      throw error;
    }

    const customer = await findOrCreateCustomer({
      payload,
      storeCode,
      storeName,
      cashierId,
      cashierName,
      dbSession,
    });

    await checkInventory({
      items,
      storeCode,
      dbSession,
    });

    const bill = calculateBill({
      items,
      billDiscountPercent: payload.billDiscountPercent || 0,
      couponDiscount: payload.couponDiscount || payload.coupon?.discountAmount || 0,
      voucherDiscount: payload.voucherDiscount || 0,
      deliveryFee: payload.deliveryFee || 0,
      installationFee: payload.installationFee || 0,
    });

    const paymentCalc = calculatePayments({
      payments: payload.payments || [],
      grandTotal: bill.grandTotal,
    });

    const orderId = generateId(`ORD-${storeCode}`);
    const invoiceId = generateId(`INV-${storeCode}`);

    const common = {
      storeCode,
      storeName,
      cashierId,
      cashierName,
      sessionId: session.sessionId,
      posDeviceId: payload.posDeviceId || session.posDeviceId,
    };

    const orderArr = await Order.create(
      [
        {
          orderId,
          orderNumber: orderId,

          ...common,

          customerId: customer.customerId,
          customerName: customer.customerName || customer.name,
          customerPhone: customer.customerPhone || customer.phone,
          customerEmail: customer.email || "",

          items: bill.items,

          itemCount: bill.items.length,
          totalQuantity: bill.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          ),

          subtotal: bill.subtotal,
          itemDiscountTotal: bill.itemDiscountTotal,
          billDiscountPercent: bill.billDiscountPercent,
          billDiscountAmount: bill.billDiscountAmount,

          couponCode: payload.couponCode || payload.coupon?.offerCode || "",
          couponDiscount: bill.couponDiscount,
          voucherCode: payload.voucherCode || "",
          voucherDiscount: bill.voucherDiscount,

          taxableAmount: bill.taxableAmount,
          gstPercent: bill.gstPercent,
          gstTotal: bill.gstTotal,
          taxTotal: bill.gstTotal,

          deliveryFee: bill.deliveryFee,
          installationFee: bill.installationFee,

          grandTotal: bill.grandTotal,
          paidAmount: paymentCalc.paidAmount,
          dueAmount: paymentCalc.dueAmount,

          paymentStatus: paymentCalc.paymentStatus,
          paymentMode: paymentCalc.paymentMode,

          orderStatus: paymentCalc.paymentStatus === "PAID" ? "PAID" : "PARTIAL",
          fulfillmentStatus: "PROCESSING",

          invoiceId,
          channel: "POS",
          orderType: "STORE_SALE",
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

            orderId,
            invoiceId,

            ...common,

            customerId: customer.customerId,
            customerName: customer.customerName || customer.name,
            customerPhone: customer.customerPhone || customer.phone,

            paymentMethod: payment.paymentMethod,
            paymentMode: payment.paymentMode,
            amount: payment.amount,
            paymentStatus: "SUCCESS",

            upiTransactionId: payment.upiTransactionId || "",
            cardLast4: payment.cardLast4 || "",
            cardType: payment.cardType || "",
            bankName: payment.bankName || "",
            cardHolderName: payment.cardHolderName || "",
            cardApprovalCode: payment.cardApprovalCode || "",
            cashNotes: payment.cashNotes || {},

            transactionReference:
              payment.transactionReference ||
              payment.upiTransactionId ||
              payment.cardApprovalCode ||
              generateId("TXN"),

            paidAt: new Date(),
            sourceSystem: "POS",
            isHistoricalPayment: false,
          },
        ],
        { session: dbSession }
      );

      savedPayments.push(paymentArr[0]);
    }

    const invoiceArr = await Invoice.create(
      [
        {
          invoiceId,
          invoiceNumber: invoiceId,

          orderId,
          orderNumber: orderId,

          ...common,

          invoiceType: "TAX_INVOICE",
          invoiceStatus: "ISSUED",
          invoiceDate: new Date(),
          issuedAt: new Date(),

          customer: {
            customerId: customer.customerId,
            customerName: customer.customerName || customer.name,
            customerPhone: customer.customerPhone || customer.phone,
            customerEmail: customer.email || "",
            billingAddress: customer.billingAddress || customer.primaryAddress || {},
            shippingAddress: customer.deliveryAddress || {},
          },

          items: bill.items,

          billing: {
            subtotal: bill.subtotal,
            itemDiscountTotal: bill.itemDiscountTotal,
            billDiscountPercent: bill.billDiscountPercent,
            billDiscountAmount: bill.billDiscountAmount,

            couponCode: payload.couponCode || payload.coupon?.offerCode || "",
            couponDiscount: bill.couponDiscount,
            voucherCode: payload.voucherCode || "",
            voucherDiscount: bill.voucherDiscount,

            taxableAmount: bill.taxableAmount,
            gstPercent: bill.gstPercent,
            gstTotal: bill.gstTotal,
            taxTotal: bill.gstTotal,

            deliveryFee: bill.deliveryFee,
            installationFee: bill.installationFee,

            grandTotal: bill.grandTotal,
            paidAmount: paymentCalc.paidAmount,
            dueAmount: paymentCalc.dueAmount,
            currency: "INR",
          },

          payment: {
            paymentStatus: paymentCalc.paymentStatus,
            paymentMode: paymentCalc.paymentMode,
            payments: savedPayments.map((p) => ({
              paymentId: p.paymentId,
              paymentMode: p.paymentMode,
              amount: p.amount,
              paymentStatus: p.paymentStatus,
              transactionReference: p.transactionReference,
            })),
          },

          print: {
            printStatus: "READY",
            printCount: 0,
          },

          email: {
            emailStatus: "PENDING",
          },
        },
      ],
      { session: dbSession }
    );

    const invoice = invoiceArr[0];

    const inventoryMovements = await updateInventoryAfterSale({
      items: bill.items,
      ...common,
      orderId,
      invoiceId,
      dbSession,
    });

    await updateCustomerAfterSale({
      customer,
      orderId,
      invoiceId,
      grandTotal: bill.grandTotal,
      paidAmount: paymentCalc.paidAmount,
      dueAmount: paymentCalc.dueAmount,
      cashierId,
      cashierName,
      dbSession,
    });

    await updateSessionAfterSale({
      session,
      payments: savedPayments,
      grandTotal: bill.grandTotal,
      dbSession,
    });

    await auditLogService.create(
      {
        action: "POS_CHECKOUT_COMPLETED",
        module: "CASHIER_CHECKOUT",

        storeCode,
        storeName,

        userId: cashierId,
        userName: cashierName,
        userRole: "CASHIER",

        cashierId,
        cashierName,

        sessionId: session.sessionId,
        posDeviceId: common.posDeviceId,

        customerId: customer.customerId,
        customerPhone: customer.customerPhone || customer.phone,

        orderId,
        invoiceId,

        amount: bill.grandTotal,

        meta: {
          paymentMode: paymentCalc.paymentMode,
          paidAmount: paymentCalc.paidAmount,
          dueAmount: paymentCalc.dueAmount,
          itemCount: bill.items.length,
          totalQuantity: bill.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          ),
        },

        status: "SUCCESS",
        message: "Cashier checkout completed successfully",
      },
      { session: dbSession }
    );

    await dbSession.commitTransaction();

    return {
      customer,
      order: savedOrder,
      invoice,
      payments: savedPayments,
      inventoryMovements,
      sessionId: session.sessionId,
      checkoutSummary: {
        storeCode,
        cashierId,
        cashierName,
        customerPhone: customer.customerPhone || customer.phone,
        orderId,
        invoiceId,
        grandTotal: bill.grandTotal,
        paidAmount: paymentCalc.paidAmount,
        dueAmount: paymentCalc.dueAmount,
        paymentStatus: paymentCalc.paymentStatus,
      },
    };
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};

module.exports = {
  cashierCheckout,
  // Shared with salesOrders — booking a sales order needs the exact same
  // customer-lookup and bill-math (GST/discount/coupon/voucher proration) as
  // an OTC sale, just attached to a different transaction document.
  findOrCreateCustomer,
  calculateBill,
};
