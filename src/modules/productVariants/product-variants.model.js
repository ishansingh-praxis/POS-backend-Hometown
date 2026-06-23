const mongoose = require("mongoose");
const ProductVariantSchema = new mongoose.Schema(
  {
    parentSku: { type: String, index: true },
    variantSku: { type: String, index: true },
    variantName: { type: String, index: true },
    color: { type: String, index: true },
    size: { type: String, index: true },
    sellingPrice: { type: Number, default: 0 },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("ProductVariant", ProductVariantSchema);
