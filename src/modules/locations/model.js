const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    locationId: { type: String, index: true },

    siteCode: { type: String },
    storeCode: { type: String, index: true },

    siteName: { type: String, index: true },
    storeName: { type: String, index: true },

    locationType: {
      type: String,
      enum: ["Store", "RDC", "MDC", "CDC", "UNKNOWN"],
      index: true,
    },

    warehouseType: { type: String, index: true },
    warehouseZone: String,

    city: { type: String, index: true },
    region: { type: String, index: true },

    operationalStatus: String,

    isPosEnabled: { type: Boolean, default: false, index: true },
    isInventoryNode: { type: Boolean, default: true },

    inventorySummary: {
      skuCount: { type: Number, default: 0 },
      totalStockQty: { type: Number, default: 0 },
      totalAtpQty: { type: Number, default: 0 },
      totalMapValue: { type: Number, default: 0 },
      lowStockSkus: { type: Number, default: 0 },
      outOfStockSkus: { type: Number, default: 0 },
    },

    sourceSystem: { type: String, default: "SAP_ATP" },
    sourceFile: String,

    status: { type: String, default: "ACTIVE", index: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "locations",
  }
);

LocationSchema.index({ siteCode: 1 }, { unique: true });
LocationSchema.index({
  siteName: "text",
  storeName: "text",
  city: "text",
  region: "text",
  siteCode: "text",
});

module.exports = mongoose.model("Location", LocationSchema, "locations");
