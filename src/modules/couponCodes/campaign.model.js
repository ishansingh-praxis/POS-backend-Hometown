const mongoose = require("mongoose");

const CouponCampaignSchema = new mongoose.Schema(
  {
    campaignCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    campaignName: {
      type: String,
      required: true
    },

    campaignType: {
      type: String,
      index: true
    },

    bankName: String,

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

    validFrom: Date,
    validTo: Date,

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
      default: "ACTIVE",
      index: true
    },

    totalCodes: {
      type: Number,
      default: 0
    },

    usedCodes: {
      type: Number,
      default: 0
    },

    unusedCodes: {
      type: Number,
      default: 0
    },

    utilizationPercent: {
      type: Number,
      default: 0
    },

    allowedChannels: {
      type: [String],
      default: ["POS", "ONLINE"]
    },

    requiresManagerApproval: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "coupon_campaigns"
  }
);

module.exports = mongoose.model(
  "CouponCampaign",
  CouponCampaignSchema,
  "coupon_campaigns"
);
