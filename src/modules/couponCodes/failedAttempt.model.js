const mongoose = require("mongoose");

const CouponFailedAttemptSchema = new mongoose.Schema(
  {
    failedAttemptId: {
      type: String,
      index: true
    },

    offerCode: {
      type: String,
      index: true
    },

    storeCode: {
      type: String,
      index: true
    },

    storeName: String,

    customerPhone: {
      type: String,
      index: true
    },

    billAmount: {
      type: Number,
      default: 0
    },

    paymentMode: String,
    bankName: String,

    reason: {
      type: String,
      required: true
    },

    cashierId: String,
    cashierName: String,

    status: {
      type: String,
      enum: ["FAILED", "SAMPLE_NOT_IMPORTED"],
      default: "FAILED",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "coupon_failed_attempts"
  }
);

module.exports = mongoose.model(
  "CouponFailedAttempt",
  CouponFailedAttemptSchema,
  "coupon_failed_attempts"
);
