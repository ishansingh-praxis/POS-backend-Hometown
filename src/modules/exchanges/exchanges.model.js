const mongoose = require("mongoose");
const ExchangeSchema = new mongoose.Schema(
  {
    exchangeId: { type: String, index: true },
    oldOrderId: { type: String, index: true },
    oldSku: { type: String, index: true },
    newSku: { type: String, index: true },
    customerId: { type: String, index: true },
    storeCode: { type: String, index: true },
    priceDifference: { type: Number, default: 0 },
    exchangeStatus: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Exchange", ExchangeSchema);
