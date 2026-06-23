const mongoose = require("mongoose");

const PriceHistorySchema = new mongoose.Schema(
  {
    priceHistoryId: {
      type: String,
      index: true
    },
    productId: {
      type: String,
      index: true
    },
    sku: {
      type: String,
      index: true
    },
    mrp: Number,
    sellingPrice: Number,
    discountPercent: Number,
    effectiveFrom: String,
    effectiveTo: String,
    source: String
  },
  {
    timestamps: true,
    strict: false,
    collection: "price_history"
  }
);

module.exports = mongoose.model(
  "PriceHistory",
  PriceHistorySchema,
  "price_history"
);
