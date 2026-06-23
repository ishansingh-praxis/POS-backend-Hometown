const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, unique: true, index: true },

    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },

    storeCode: { type: String, index: true },
    storeName: String,

    userId: { type: String, index: true },
    userName: { type: String, index: true },
    userRole: { type: String, index: true },

    cashierId: { type: String, index: true },
    cashierName: { type: String, index: true },

    sessionId: { type: String, index: true },
    posDeviceId: { type: String, index: true },

    customerId: { type: String, index: true },
    customerPhone: { type: String, index: true },

    orderId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    paymentId: { type: String, index: true },

    amount: { type: Number, default: 0 },

    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed,

    ipAddress: String,
    userAgent: String,

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "WARNING"],
      default: "SUCCESS",
      index: true,
    },

    message: String,
  },
  {
    timestamps: true,
    strict: false,
    collection: "audit_logs",
  }
);

AuditLogSchema.index({
  auditId: "text",
  action: "text",
  module: "text",
  cashierName: "text",
  orderId: "text",
  invoiceId: "text",
  customerPhone: "text",
});

module.exports = mongoose.model("AuditLog", AuditLogSchema, "audit_logs");
