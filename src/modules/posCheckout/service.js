const QRCode = require("qrcode");
const Order = require("../orders/model");
const Inventory = require("../inventories/model");
const Invoice = require("../invoices/model");
const Payment = require("../payments/model");
const couponCodeService = require("../couponCodes/service");

const GST_PERCENT = 18;

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
};

const calculateCart = (items = [], billDiscountPercent = 0, deliveryFee = 0, installationFee = 0) => {
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let taxableTotal = 0;
  let gstTotal = 0;

  const calculatedItems = items.map((item, index) => {
    const qty = Number(item.quantity || 1);
    const mrp = Number(item.mrp || item.unitPrice || 0);
    const unitPrice = Number(item.unitPrice || item.sellingPrice || 0);

    const lineMrpTotal = mrp * qty;
    const gross = unitPrice * qty;

    const itemDiscountPercent = Number(item.itemDiscountPercent || 0);
    const lineDiscount = Math.round((gross * itemDiscountPercent) / 100);

    const lineAfterDiscount = gross - lineDiscount;

    const taxableAmount = Number((lineAfterDiscount / (1 + GST_PERCENT / 100)).toFixed(2));
    const gstAmount = Number((lineAfterDiscount - taxableAmount).toFixed(2));

    subtotal += gross;
    itemDiscountTotal += lineDiscount;
    taxableTotal += taxableAmount;
    gstTotal += gstAmount;

    return {
      ...item,
      orderItemId: item.orderItemId || `OI-${Date.now()}-${index + 1}`,
      quantity: qty,
      mrp,
      unitPrice,
      lineMrpTotal,
      lineDiscount,
      taxableAmount,
      gstPercent: GST_PERCENT,
      gstAmount,
      lineTotal: lineAfterDiscount
    };
  });

  const afterItemDiscount = subtotal - itemDiscountTotal;
  const billDiscountAmount = Math.round((afterItemDiscount * Number(billDiscountPercent || 0)) / 100);

  const taxableAfterBillDiscount = taxableTotal - Math.round((taxableTotal * Number(billDiscountPercent || 0)) / 100);
  const gstAfterBillDiscount = gstTotal - Math.round((gstTotal * Number(billDiscountPercent || 0)) / 100);

  const charges = Number(deliveryFee || 0) + Number(installationFee || 0);
  const rawTotal = taxableAfterBillDiscount + gstAfterBillDiscount + charges;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));

  return {
    items: calculatedItems,
    subtotal,
    itemDiscountTotal,
    billDiscountPercent: Number(billDiscountPercent || 0),
    billDiscountAmount,
    taxableAmount: Number(taxableAfterBillDiscount.toFixed(2)),
    gstPercent: GST_PERCENT,
    gstTotal: Number(gstAfterBillDiscount.toFixed(2)),
    deliveryFee: Number(deliveryFee || 0),
    installationFee: Number(installationFee || 0),
    roundOff,
    grandTotal
  };
};

const createUpiQr = async ({ amount, orderId, upiId = "hometown@upi" }) => {
  const upiString = `upi://pay?pa=${upiId}&pn=HomeTown&am=${amount}&cu=INR&tn=${orderId}`;
  const qrDataUrl = await QRCode.toDataURL(upiString);

  return { upiId, amount, orderId, upiString, qrDataUrl };
};

const createPosSale = async (payload) => {
  const {
    storeCode,
    storeName,
    city,
    state,
    region,
    zone,
    cashierId,
    cashierName,
    managerId,
    customer,
    items,
    billDiscountPercent,
    deliveryFee,
    installationFee,
    payments = [],
    orderType = "STORE_SALE",
    channel = "POS",
    coupon = null,
    couponCode = ""
  } = payload;

  if (!storeCode) {
    const error = new Error("storeCode is required");
    error.statusCode = 400;
    throw error;
  }

  if (!customer?.phone) {
    const error = new Error("Customer mobile number is required");
    error.statusCode = 400;
    throw error;
  }

  if (!items?.length) {
    const error = new Error("Cart is empty");
    error.statusCode = 400;
    throw error;
  }

  const orderId = generateId(`ORD-${storeCode}`);
  const invoiceId = generateId(`INV-${storeCode}`);

  const totals = calculateCart(items, billDiscountPercent, deliveryFee, installationFee);

  const primaryPayment = payments[0] || {};
  const paymentMode =
    payments.length > 1 ? "MIXED" : primaryPayment.method || primaryPayment.paymentMode || "PENDING";

  // Coupon validation must happen on the backend; a frontend-supplied discount is never trusted.
  let couponValidation = null;
  let backendCouponDiscount = 0;
  let backendCouponCode = "";

  const offerCode = coupon?.offerCode || couponCode;

  if (offerCode) {
    const validationResult = await couponCodeService.validateCoupon({
      offerCode,
      storeCode,
      storeName,
      customerPhone: customer.phone,
      billAmount: totals.grandTotal,
      paymentMode,
      bankName: primaryPayment.bankName,
      cardType: primaryPayment.cardType,
      cashierId,
      cashierName
    });

    couponValidation = validationResult.validation;
    backendCouponDiscount = Number(couponValidation.discountAmount || 0);
    backendCouponCode = couponValidation.offerCode;
  }

  const grandTotalBeforeCoupon = totals.grandTotal;
  const grandTotalAfterCoupon = Math.max(0, Math.round(grandTotalBeforeCoupon - backendCouponDiscount));

  // Stock check before any writes — if a line is short, the checkout aborts and the
  // coupon (validated above, not yet marked availed) remains unused.
  for (const item of totals.items) {
    const inv = await Inventory.findOne({ storeCode, sku: item.sku });

    if (!inv || Number(inv.availableQty || 0) < Number(item.quantity || 1)) {
      const error = new Error(`Insufficient stock for SKU ${item.sku}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const dueAmount = Math.max(0, grandTotalAfterCoupon - paidAmount);

  let paymentStatus = "PENDING";
  if (paidAmount >= grandTotalAfterCoupon) paymentStatus = "PAID";
  else if (paidAmount > 0) paymentStatus = "PARTIAL";

  const orderStatus = paymentStatus === "PAID" ? "PAID" : "PARTIALLY_PAID";

  const couponDetails = couponValidation
    ? {
        offerCode: couponValidation.offerCode,
        campaignCode: couponValidation.campaignCode,
        campaignName: couponValidation.campaignName,
        campaignType: couponValidation.campaignType,
        discountType: couponValidation.discountType,
        discountValue: couponValidation.discountValue,
        minimumBillAmount: couponValidation.minimumBillAmount,
        maximumDiscountAmount: couponValidation.maximumDiscountAmount,
        billAmount: couponValidation.billAmount,
        discountAmount: couponValidation.discountAmount,
        finalPayableAmount: couponValidation.finalPayableAmount
      }
    : null;

  const order = await Order.create({
    orderId,
    orderNumber: orderId,
    channel,
    orderType,
    storeCode,
    storeName,
    city,
    state,
    region,
    zone,
    cashierId,
    cashierName,
    managerId,

    customerId: customer.customerId || `CUST-${customer.phone}`,
    customerName: customer.name || "Walk-in Customer",
    customerPhone: customer.phone,
    customerEmail: customer.email || "",

    billingAddress: customer.billingAddress || {},
    shippingAddress: customer.shippingAddress || {},

    items: totals.items.map((item) => ({
      ...item,
      orderId,
      storeCode,
      storeName
    })),

    itemCount: totals.items.length,
    totalQuantity: totals.items.reduce((s, i) => s + Number(i.quantity || 0), 0),

    subtotal: totals.subtotal,
    itemDiscountTotal: totals.itemDiscountTotal,
    billDiscountPercent: totals.billDiscountPercent,
    billDiscountAmount: totals.billDiscountAmount,
    taxableAmount: totals.taxableAmount,
    gstPercent: GST_PERCENT,
    taxTotal: totals.gstTotal,
    deliveryFee: totals.deliveryFee,
    installationFee: totals.installationFee,
    roundingAdjustment: totals.roundOff,

    couponCode: backendCouponCode,
    couponDiscount: backendCouponDiscount,
    couponDetails,

    grandTotalBeforeCoupon,
    grandTotal: grandTotalAfterCoupon,
    paidAmount,
    dueAmount,
    currency: "INR",

    paymentStatus,
    paymentMode,
    orderStatus,
    fulfillmentStatus: "PROCESSING",

    invoiceId,
    sapSyncStatus: "PENDING",
    accountingStatus: "PENDING",
    remarks: "Created from POS checkout"
  });

  const savedPayments = [];

  for (const p of payments) {
    const payment = await Payment.create({
      paymentId: generateId("PAY"),
      orderId,
      invoiceId,
      storeCode,
      storeName,
      customerPhone: customer.phone,
      paymentMethod: p.method || p.paymentMode,
      paymentMode: p.method || p.paymentMode,
      amount: Number(p.amount || 0),
      paymentStatus: "SUCCESS",
      upiTransactionId: p.upiTransactionId || "",
      cardLast4: p.cardLast4 || "",
      cardType: p.cardType || "",
      bankName: p.bankName || "",
      cardHolderName: p.cardHolderName || "",
      cardApprovalCode: p.cardApprovalCode || "",
      cashNotes: p.cashNotes || {},
      transactionReference: p.transactionReference || generateId("TXN"),
      paidAt: new Date()
    });

    savedPayments.push(payment);
  }

  const invoice = await Invoice.create({
    invoiceId,
    invoiceNumber: invoiceId,
    invoiceType: "TAX_INVOICE",
    invoiceStatus: "ISSUED",
    invoiceDate: new Date(),
    issuedAt: new Date(),
    financialYear: "2026-27",

    orderId,
    orderNumber: orderId,
    channel,
    orderType,

    storeCode,
    storeName,
    city,
    state,
    region,
    zone,

    store: { storeCode, storeName, city, state, region, zone },

    seller: {
      companyName: "Praxis Home Retail Limited - HomeTown",
      brandName: "HomeTown",
      storeCode,
      storeName,
      city,
      state,
      currency: "INR"
    },

    customer: {
      customerId: customer.customerId || `CUST-${customer.phone}`,
      customerName: customer.name || "Walk-in Customer",
      customerPhone: customer.phone,
      customerEmail: customer.email || "",
      billingAddress: customer.billingAddress || {},
      shippingAddress: customer.shippingAddress || {}
    },

    items: totals.items.map((item) => ({
      ...item,
      invoiceId,
      invoiceNumber: invoiceId,
      orderId,
      storeCode,
      storeName,
      gstPercent: GST_PERCENT,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: Number(((item.gstAmount || 0) / 2).toFixed(2)),
      sgstAmount: Number(((item.gstAmount || 0) / 2).toFixed(2)),
      igstAmount: 0
    })),

    billing: {
      itemCount: totals.items.length,
      totalQuantity: totals.items.reduce((s, i) => s + Number(i.quantity || 0), 0),

      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscountPercent: totals.billDiscountPercent,
      billDiscountAmount: totals.billDiscountAmount,

      couponCode: backendCouponCode,
      couponDiscount: backendCouponDiscount,
      couponDetails: couponValidation
        ? {
            offerCode: couponValidation.offerCode,
            campaignCode: couponValidation.campaignCode,
            campaignName: couponValidation.campaignName,
            campaignType: couponValidation.campaignType,
            discountType: couponValidation.discountType,
            discountValue: couponValidation.discountValue
          }
        : null,

      discountTotal:
        Number(totals.itemDiscountTotal || 0) +
        Number(totals.billDiscountAmount || 0) +
        Number(backendCouponDiscount || 0),

      taxableAmount: totals.taxableAmount,
      gstPercent: GST_PERCENT,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: Number(((totals.gstTotal || 0) / 2).toFixed(2)),
      sgstAmount: Number(((totals.gstTotal || 0) / 2).toFixed(2)),
      igstAmount: 0,
      taxTotal: totals.gstTotal,

      deliveryFee: totals.deliveryFee,
      installationFee: totals.installationFee,
      roundingAdjustment: totals.roundOff,

      grandTotalBeforeCoupon,
      grandTotal: grandTotalAfterCoupon,
      paidAmount,
      dueAmount,
      currency: "INR"
    },

    payment: {
      paymentStatus,
      paymentMode,
      payments: savedPayments.map((p) => ({
        paymentId: p.paymentId,
        paymentMode: p.paymentMode,
        paymentStatus: p.paymentStatus,
        amount: p.amount,
        transactionReference: p.transactionReference,
        paidAt: p.paidAt
      }))
    },

    fulfillment: {
      fulfillmentStatus: "PROCESSING",
      deliveryRequired: totals.items.some((item) => item.deliveryRequired),
      shippingAddress: customer.shippingAddress || {}
    },

    sap: {
      sapSyncStatus: "PENDING",
      sapInvoiceNumber: null,
      sapAccountingDocument: null,
      sapPostingDate: null
    },

    accounting: {
      accountingStatus: "PENDING",
      ledgerPosted: false,
      revenueAccount: "SALES-HOMETOWN-POS",
      taxAccount: "GST-OUTPUT-18"
    },

    print: {
      printStatus: "READY",
      printTemplate: "HOMETOWN_POS_TAX_INVOICE_A4",
      printCount: 0
    },

    remarks: "Invoice created from POS checkout"
  });

  // Mark coupon as availed only after order and invoice have both been saved successfully.
  if (couponValidation?.offerCode) {
    await couponCodeService.markAvailed({
      offerCode: couponValidation.offerCode,
      storeCode,
      storeName,
      customerId: customer.customerId || `CUST-${customer.phone}`,
      customerName: customer.name || "Walk-in Customer",
      customerPhone: customer.phone,
      orderId,
      invoiceId,
      billAmount: grandTotalBeforeCoupon,
      discountAmount: backendCouponDiscount,
      finalPayableAmount: grandTotalAfterCoupon,
      paymentMode,
      bankName: primaryPayment.bankName,
      cardType: primaryPayment.cardType,
      cashierId,
      cashierName
    });
  }

  for (const item of totals.items) {
    await Inventory.findOneAndUpdate(
      { storeCode, sku: item.sku },
      {
        $inc: { availableQty: -Number(item.quantity || 1), soldQty: Number(item.quantity || 1) },
        $set: { lastUpdated: new Date() }
      }
    );
  }

  return {
    order,
    invoice,
    payments: savedPayments,
    coupon: couponValidation
      ? {
          offerCode: couponValidation.offerCode,
          campaignCode: couponValidation.campaignCode,
          campaignName: couponValidation.campaignName,
          discountAmount: backendCouponDiscount,
          billAmount: grandTotalBeforeCoupon,
          finalPayableAmount: grandTotalAfterCoupon,
          status: "AVAILED"
        }
      : null
  };
};

module.exports = {
  GST_PERCENT,
  calculateCart,
  createUpiQr,
  createPosSale
};
