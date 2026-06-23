const mongoose = require("mongoose");

const PosSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    cashierId: { type: String, required: true, index: true },
    cashierName: String,

    posDeviceId: { type: String, index: true },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "AUTO_VERIFIED", "EXCEPTION_FLAGGED", "RESOLVED", "STORE_DAY_CLOSED"],
      default: "OPEN",
      index: true,
    },

    openingCash: { type: Number, default: 0 },
    closingCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    cashDifference: { type: Number, default: 0 },

    cashSales: { type: Number, default: 0 },
    upiSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    splitSales: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },

    orderCount: { type: Number, default: 0 },
    invoiceCount: { type: Number, default: 0 },
    paymentCount: { type: Number, default: 0 },

    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    closeRemarks: String,

    // --- Automated exception-based verification (replaces manual approval-on-every-session) ---
    autoVerificationStatus: {
      type: String,
      enum: ["PENDING", "PASSED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    managerApprovalRequired: { type: Boolean, default: false, index: true },
    exceptionCount: { type: Number, default: 0 },

    exceptions: {
      type: [
        {
          type: { type: String },
          severity: String,
          message: String,
          amount: Number,
          status: {
            type: String,
            enum: ["OPEN", "RESOLVED", "IGNORED"],
            default: "OPEN",
          },
          createdAt: Date,
          resolvedAt: Date,
          resolvedBy: String,
          resolutionNote: String,
        },
      ],
      default: [],
    },

    closedByCashierAt: Date,
    autoVerifiedAt: Date,
    resolvedByManagerAt: Date,
    storeDayClosedAt: Date,
    businessDate: { type: String, index: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "pos_sessions",
  }
);

PosSessionSchema.index({ storeCode: 1, cashierId: 1, status: 1 });

module.exports = mongoose.model("PosSession", PosSessionSchema, "pos_sessions");
