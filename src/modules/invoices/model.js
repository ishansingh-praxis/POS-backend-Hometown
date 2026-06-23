const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, index: true },
    invoiceType: { type: String, default: "TAX_INVOICE", index: true },
    invoiceStatus: {
      type: String,
      enum: ["ISSUED", "CANCELLED", "REFUNDED", "DRAFT"],
      default: "ISSUED",
      index: true
    },
    invoiceDate: { type: Date, index: true },
    issuedAt: { type: Date, index: true },
    financialYear: { type: String, index: true },
    orderId: { type: String, index: true },
    orderNumber: { type: String, index: true },
    channel: { type: String, index: true },
    orderType: { type: String, index: true },
    storeCode: { type: String, required: true, index: true },
    storeName: { type: String, index: true },
    city: { type: String, index: true },
    state: { type: String, index: true },
    region: { type: String, index: true },
    zone: { type: String, index: true },
    storeAddress: String,
    store: { type: mongoose.Schema.Types.Mixed, default: {} },
    seller: { type: mongoose.Schema.Types.Mixed, default: {} },
    customer: { type: mongoose.Schema.Types.Mixed, default: {} },
    items: { type: mongoose.Schema.Types.Mixed, default: [] },
    billing: { type: mongoose.Schema.Types.Mixed, default: {} },
    payment: { type: mongoose.Schema.Types.Mixed, default: {} },
    fulfillment: { type: mongoose.Schema.Types.Mixed, default: {} },
    sap: { type: mongoose.Schema.Types.Mixed, default: {} },
    accounting: { type: mongoose.Schema.Types.Mixed, default: {} },
    print: { type: mongoose.Schema.Types.Mixed, default: {} },
    remarks: String
  },
  { timestamps: true, strict: false, collection: "invoices" }
);

InvoiceSchema.index({ storeCode: 1, invoiceDate: -1 });
InvoiceSchema.index({ storeCode: 1, invoiceStatus: 1 });
InvoiceSchema.index({ invoiceId: 1, storeCode: 1 });
InvoiceSchema.index({ "customer.customerPhone": 1 });
InvoiceSchema.index({ "billing.grandTotal": 1 });

module.exports = mongoose.model("Invoice", InvoiceSchema, "invoices");
