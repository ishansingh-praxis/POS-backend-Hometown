const mongoose = require("mongoose");

const DiscountSchema = new mongoose.Schema(
  {
    discountId: {
      type: String,
      index: true
    },
    discountName: {
      type: String,
      index: true
    },
    discountScope: {
      type: String,
      index: true
    },
    discountValueType: String,
    discountValue: Number,
    maxDiscountAmount: Number,
    sku: {
      type: String,
      index: true
    },
    productId: {
      type: String,
      index: true
    },
    mainCategory: {
      type: String,
      index: true
    },
    category: {
      type: String,
      index: true
    },
    subcategory: {
      type: String,
      index: true
    },
    applicableStoreCodes: [String],
    requiresManagerApproval: Boolean,
    startDate: String,
    endDate: String,
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "discounts"
  }
);

module.exports = mongoose.model("Discount", DiscountSchema, "discounts");
