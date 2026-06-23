const mongoose = require("mongoose");
const RefundSchema = new mongoose.Schema(
  {
    refundId: { type: String, index: true },
    returnId: { type: String, index: true },
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    customerId: { type: String, index: true },
    refundMode: { type: String, index: true },
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Refund", RefundSchema);
