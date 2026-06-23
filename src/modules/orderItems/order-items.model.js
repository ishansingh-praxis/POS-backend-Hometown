const mongoose = require("mongoose");
const OrderItemSchema = new mongoose.Schema(
  {
    orderId: { type: String, index: true },
    sku: { type: String, index: true },
    productName: { type: String, index: true },
    quantity: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("OrderItem", OrderItemSchema);
