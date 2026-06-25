const mongoose = require("mongoose");

const DsrStorewiseSchema = new mongoose.Schema(
  {
    sourceFile: {
      type: String,
      default: "Article-wise HT Jun DSR 2026",
      index: true,
    },

    storeCode: { type: String, required: true, index: true },
    storeName: { type: String, index: true },
    city: { type: String, index: true },
    zone: { type: String, index: true },
    concept: String,
    storeType: String,

    salesChannel: {
      type: String,
      enum: ["STORE", "ONLINE", "MARKETPLACE"],
      default: "STORE",
      index: true,
    },

    rows: { type: Number, default: 0 },
    bills: { type: Number, default: 0 },
    articles: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },

    qty: { type: Number, default: 0 },
    grossSales: { type: Number, default: 0 },
    netSales: { type: Number, default: 0 },
    taxValue: { type: Number, default: 0 },
    cogs: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    marginValue: { type: Number, default: 0 },

    docTypeBreakup: { type: [mongoose.Schema.Types.Mixed], default: [] },
    lobBreakup: { type: [mongoose.Schema.Types.Mixed], default: [] },
    topCategories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    topArticles: { type: [mongoose.Schema.Types.Mixed], default: [] },
    topCustomers: { type: [mongoose.Schema.Types.Mixed], default: [] },

    otcVsSalesOrder: {
      otcQty: { type: Number, default: 0 },
      otcGrossSales: { type: Number, default: 0 },
      salesOrderQty: { type: Number, default: 0 },
      salesOrderGrossSales: { type: Number, default: 0 },
    },

    businessMonth: { type: String, default: "2026-06", index: true },
    dateRange: {
      fromDate: String,
      toDate: String,
    },

    raw: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: "dsr_storewise_summaries",
    strict: false,
  }
);

DsrStorewiseSchema.index(
  {
    storeCode: 1,
    businessMonth: 1,
  },
  { unique: true }
);

DsrStorewiseSchema.index({
  storeName: "text",
  city: "text",
  zone: "text",
  storeCode: "text",
});

module.exports = mongoose.model(
  "DsrStorewise",
  DsrStorewiseSchema,
  "dsr_storewise_summaries"
);
