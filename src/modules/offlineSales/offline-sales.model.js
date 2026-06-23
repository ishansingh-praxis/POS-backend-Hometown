const mongoose = require("mongoose");
const OfflineSaleSchema = new mongoose.Schema(
  {
    offlineSaleId: { type: String, index: true },
    storeCode: { type: String, index: true },
    customerId: { type: String, index: true },
    localInvoiceNumber: { type: String, index: true },
    totalAmount: { type: Number, default: 0 },
    syncStatus: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("OfflineSale", OfflineSaleSchema);
