const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    orderItemId: String,
    orderId: String,
    storeCode: { type: String, index: true },
    storeName: String,
    productId: { type: String, index: true },
    sku: { type: String, index: true },
    barcode: String,
    productName: String,
    brand: String,
    mainCategory: { type: String, index: true },
    category: { type: String, index: true },
    subcategory: { type: String, index: true },
    quantity: { type: Number, default: 1 },
    mrp: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    lineMrpTotal: { type: Number, default: 0 },
    lineDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
    imageUrl: String,
    returnEligible: { type: Boolean, default: true },
    deliveryRequired: { type: Boolean, default: true }
  },
  { _id: false, strict: false }
);

const AddressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    city: String,
    state: String,
    addressLine1: String,
    addressLine2: String,
    pincode: String
  },
  { _id: false, strict: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, index: true },
    channel: {
      type: String,
      enum: ["POS", "OFFLINE_STORE", "ONLINE", "ONLINE_TO_STORE"],
      default: "POS",
      index: true
    },
    orderType: {
      type: String,
      enum: ["STORE_SALE", "PICKUP", "HOME_DELIVERY"],
      default: "STORE_SALE",
      index: true
    },
    storeCode: { type: String, required: true, index: true },
    storeName: { type: String, index: true },
    city: { type: String, index: true },
    state: { type: String, index: true },
    region: { type: String, index: true },
    zone: { type: String, index: true },
    storeAddress: String,
    cashierId: { type: String, index: true },
    cashierName: String,
    managerId: { type: mongoose.Schema.Types.Mixed, index: true },
    customerId: { type: String, index: true },
    customerName: { type: String, index: true },
    customerPhone: { type: String, index: true },
    customerEmail: String,
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    items: [OrderItemSchema],
    itemCount: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    itemDiscountTotal: { type: Number, default: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "PARTIAL", "FAILED", "REFUNDED", "CANCELLED"],
      default: "PENDING",
      index: true
    },
    paymentMode: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "EMI", "WALLET", "MIXED"],
      index: true
    },
    orderStatus: {
      type: String,
      enum: ["PENDING", "PAID", "PARTIALLY_PAID", "PROCESSING", "COMPLETED", "CANCELLED", "RETURNED"],
      default: "PENDING",
      index: true
    },
    fulfillmentStatus: {
      type: String,
      enum: ["PROCESSING", "READY_FOR_PICKUP", "PICKED_UP", "PENDING_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "PROCESSING",
      index: true
    },
    invoiceId: { type: String, index: true },
    sapSyncStatus: { type: String, enum: ["PENDING", "SYNCED", "FAILED"], default: "PENDING", index: true },
    accountingStatus: { type: String, enum: ["PENDING", "POSTED", "FAILED"], default: "PENDING", index: true },
    remarks: String
  },
  { timestamps: true, strict: false, collection: "orders" }
);

OrderSchema.index({ storeCode: 1, createdAt: -1 });
OrderSchema.index({ storeCode: 1, orderStatus: 1 });

module.exports = mongoose.model("Order", OrderSchema, "orders");
