const mongoose = require("mongoose");
const InvoiceItemSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, index: true },
    sku: { type: String, index: true },
    productName: { type: String, index: true },
    quantity: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("InvoiceItem", InvoiceItemSchema);
