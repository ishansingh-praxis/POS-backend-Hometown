const mongoose = require("mongoose");

const CouponRedemptionLogSchema = new mongoose.Schema(
  {
    redemptionLogId: {
      type: String,
      index: true
    },

    offerCode: {
      type: String,
      required: true,
      index: true
    },

    campaignCode: {
      type: String,
      index: true
    },

    storeCode: {
      type: String,
      index: true
    },

    storeName: String,

    customerId: String,
    customerName: String,

    customerPhone: {
      type: String,
      index: true
    },

    orderId: {
      type: String,
      index: true
    },

    invoiceId: {
      type: String,
      index: true
    },

    billAmount: {
      type: Number,
      default: 0
    },

    discountAmount: {
      type: Number,
      default: 0
    },

    finalPayableAmount: {
      type: Number,
      default: 0
    },

    paymentMode: String,
    bankName: String,
    cardType: String,

    cashierId: String,
    cashierName: String,

    status: {
      type: String,
      enum: ["SUCCESS", "REVERSED", "SAMPLE_NOT_IMPORTED"],
      default: "SUCCESS",
      index: true
    },

    remarks: String
  },
  {
    timestamps: true,
    strict: false,
    collection: "coupon_redemption_logs"
  }
);

module.exports = mongoose.model(
  "CouponRedemptionLog",
  CouponRedemptionLogSchema,
  "coupon_redemption_logs"
);
