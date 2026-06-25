const mongoose = require("mongoose");

const DsrSalesFactSchema = new mongoose.Schema(
  {
    sourceFile: { type: String, index: true },
    storeCode: { type: String, index: true },
    storeName: { type: String, index: true },
    concept: String,
    city: { type: String, index: true },
    zone: { type: String, index: true },
    storeType: String,
    salesDoc: { type: String, index: true },
    businessDate: { type: Date, index: true },
    businessDateStr: { type: String, index: true },
    day: String,
    finWeek: { type: String, index: true },
    mc: String,
    category: { type: String, index: true },
    article: { type: String, index: true },
    sku: { type: String, index: true },
    articleDescription: String,
    qty: { type: Number, default: 0 },
    val: { type: Number, default: 0 },
    grossValue: { type: Number, default: 0 },
    netSaleWithoutTax: { type: Number, default: 0 },
    taxValue: { type: Number, default: 0 },
    cogs: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    marginValue: { type: Number, default: 0 },
    source: String,
    docType: { type: String, index: true },
    sourceType: String,
    lob: { type: String, index: true },
    newLob: { type: String, index: true },
    className: { type: String, index: true },
    subClass: { type: String, index: true },
    brand: { type: String, index: true },
    mainParent: String,
    customerName: { type: String, index: true },
    customerId: { type: String, index: true },
    customerPhone: { type: String, index: true },
    deliverySite: String,
    assortmentStatus: String,
    remark: String,
    marketplace: String,
    liquidation: String,
    externalItem: String,
    raw: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: "dsr_sales_facts",
    strict: false,
  }
);

DsrSalesFactSchema.index({
  storeCode: 1,
  businessDate: 1,
  sku: 1,
  docType: 1,
});

DsrSalesFactSchema.index({
  salesDoc: 1,
  storeCode: 1,
  sku: 1,
  businessDateStr: 1,
});

DsrSalesFactSchema.index({
  articleDescription: "text",
  sku: "text",
  storeName: "text",
  customerName: "text",
  category: "text",
  lob: "text",
  newLob: "text",
});

module.exports = mongoose.model(
  "DsrSalesFact",
  DsrSalesFactSchema,
  "dsr_sales_facts"
);
