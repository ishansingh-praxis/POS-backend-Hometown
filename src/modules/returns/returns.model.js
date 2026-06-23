const mongoose = require("mongoose");
const ReturnSchema = new mongoose.Schema(
  {
    returnId: { type: String, index: true },
    orderId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    customerId: { type: String, index: true },
    storeCode: { type: String, index: true },
    returnReason: { type: String, index: true },
    returnStatus: { type: String, index: true },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Return", ReturnSchema);
