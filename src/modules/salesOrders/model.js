const mongoose = require("mongoose");

const SalesOrderSchema = new mongoose.Schema(
  {
    salesOrderId: { type: String, required: true, unique: true, index: true },
    transactionType: { type: String, default: "SALES_ORDER_BOOKING", index: true },

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    cashierId: { type: String, required: true, index: true },
    cashierName: String,

    salespersonName: { type: String, index: true },

    customerId: { type: String, index: true },
    customerName: String,
    customerPhone: { type: String, index: true },
    customerEmail: String,

    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    itemCount: { type: Number, default: 0 },

    subtotal: { type: Number, default: 0 },
    itemDiscountTotal: { type: Number, default: 0 },
    billDiscountPercent: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },

    taxableAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },

    deliveryFee: { type: Number, default: 0 },
    installationFee: { type: Number, default: 0 },

    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
      index: true,
    },

    orderStatus: {
      type: String,
      enum: ["BOOKED", "SCHEDULED", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "BOOKED",
      index: true,
    },

    deliveryScheduleId: { type: String, index: true },
    deliverySchedule: mongoose.Schema.Types.Mixed,

    payments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    cancelReason: String,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    strict: false,
    collection: "sales_orders",
  }
);

SalesOrderSchema.index({ storeCode: 1, orderStatus: 1 });
SalesOrderSchema.index({
  salesOrderId: "text",
  customerPhone: "text",
  customerName: "text",
});

module.exports = mongoose.model("SalesOrder", SalesOrderSchema, "sales_orders");
