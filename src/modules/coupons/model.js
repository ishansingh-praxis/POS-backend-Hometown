const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      index: true,
      uppercase: true
    },
    couponName: String,
    discountType: String,
    discountValue: Number,
    minimumBillAmount: Number,
    maximumDiscountAmount: Number,
    usageLimitPerCustomer: Number,
    totalUsageLimit: Number,
    usedCount: Number,
    startDate: String,
    endDate: String,
    channel: [String],
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "coupons"
  }
);

module.exports = mongoose.model("Coupon", CouponSchema, "coupons");
