const mongoose = require("mongoose");
const CartItemSchema = new mongoose.Schema(
  {
    cartId: { type: String, index: true },
    sku: { type: String, index: true },
    productName: { type: String, index: true },
    quantity: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("CartItem", CartItemSchema);
