const mongoose = require("mongoose");

const CouponCodeSchema = new mongoose.Schema(
  {
    couponCodeId: {
      type: String,
      index: true
    },

    offerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },

    campaignCode: {
      type: String,
      required: true,
      index: true
    },

    campaignName: String,

    campaignType: {
      type: String,
      index: true
    },

    storeCode: {
      type: String,
      default: "ALL",
      index: true
    },

    storeName: {
      type: String,
      default: "ALL STORES"
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true
    },

    minimumBillAmount: {
      type: Number,
      default: 0
    },

    maximumDiscountAmount: {
      type: Number,
      default: 0
    },

    paymentEligibility: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    singleUse: {
      type: Boolean,
      default: true
    },

    availed: {
      type: Boolean,
      default: false,
      index: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true
    },

    validFrom: {
      type: Date,
      index: true
    },

    validTo: {
      type: Date,
      index: true
    },

    availedAt: Date,
    availedByCustomerId: String,
    availedByCustomerName: String,
    availedByCustomerPhone: String,

    availedStoreCode: String,
    availedStoreName: String,

    availedOrderId: String,
    availedInvoiceId: String,

    appliedDiscountAmount: {
      type: Number,
      default: 0
    },

    billAmountAtRedemption: {
      type: Number,
      default: 0
    },

    finalPayableAmount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "coupon_codes"
  }
);

CouponCodeSchema.index({ offerCode: 1, availed: 1 });
CouponCodeSchema.index({ campaignCode: 1, availed: 1 });
CouponCodeSchema.index({ storeCode: 1, availed: 1 });
CouponCodeSchema.index({ status: 1, validFrom: 1, validTo: 1 });

module.exports = mongoose.model("CouponCode", CouponCodeSchema, "coupon_codes");
