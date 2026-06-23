const mongoose = require("mongoose");
const CartSchema = new mongoose.Schema(
  {
    cartId: { type: String, index: true },
    storeCode: { type: String, index: true },
    customerId: { type: String, index: true },
    status: { type: String, index: true },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    createdBy: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Cart", CartSchema);
