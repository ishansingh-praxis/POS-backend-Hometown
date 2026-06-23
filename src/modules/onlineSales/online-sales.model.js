const mongoose = require("mongoose");
const OnlineSaleSchema = new mongoose.Schema(
  {
    onlineOrderId: { type: String, index: true },
    source: { type: String, index: true },
    customerId: { type: String, index: true },
    storeCode: { type: String, index: true },
    paymentStatus: { type: String, index: true },
    orderStatus: { type: String, index: true },
    totalAmount: { type: Number, default: 0 },
    syncStatus: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("OnlineSale", OnlineSaleSchema);
