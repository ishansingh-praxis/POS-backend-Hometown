const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    inventoryId: {
      type: String,
      index: true
    },
    storeCode: {
      type: String,
      index: true
    },
    storeName: String,
    city: {
      type: String,
      index: true
    },
    state: {
      type: String,
      index: true
    },
    region: {
      type: String,
      index: true
    },
    zone: {
      type: String,
      index: true
    },
    productId: {
      type: String,
      index: true
    },
    sku: {
      type: String,
      index: true
    },
    barcode: {
      type: String,
      index: true
    },
    productName: {
      type: String,
      index: true
    },
    mainCategory: {
      type: String,
      index: true
    },
    category: {
      type: String,
      index: true
    },
    subcategory: {
      type: String,
      index: true
    },
    availableQty: {
      type: Number,
      default: 0
    },
    reservedQty: {
      type: Number,
      default: 0
    },
    displayQty: {
      type: Number,
      default: 0
    },
    damagedQty: {
      type: Number,
      default: 0
    },
    soldQty: {
      type: Number,
      default: 0
    },
    inTransitQty: {
      type: Number,
      default: 0
    },
    warehouseQty: {
      type: Number,
      default: 0
    },
    minimumStockLevel: Number,
    maximumStockLevel: Number,
    stockStatus: {
      type: String,
      index: true
    },
    lastStockInDate: String,
    lastUpdated: Date,

    // --- SAP ATP real-inventory fields ---
    siteCode: { type: String, index: true },
    siteName: { type: String, index: true },

    locationType: {
      type: String,
      enum: ["Store", "RDC", "MDC", "CDC", "UNKNOWN"],
      default: "UNKNOWN",
      index: true,
    },

    warehouseType: { type: String, index: true },
    warehouseZone: { type: String, index: true },

    isPosEnabled: { type: Boolean, default: false, index: true },
    isInventoryNode: { type: Boolean, default: true },

    articleNo: { type: String, index: true },
    articleDescription: String,

    mainParent: String,
    brandDescription: String,
    brand: { type: String, index: true },

    mercCategory: { type: String, index: true },
    lob: { type: String, index: true },

    stockQty: { type: Number, default: 0 },
    atpQty: { type: Number, default: 0 },
    transferQty: { type: Number, default: 0 },

    mrp: { type: Number, default: 0 },
    map: { type: Number, default: 0 },
    mapValue: { type: Number, default: 0 },
    stockValueMrp: { type: Number, default: 0 },

    rdcSite: String,
    rdcName: String,

    operationalStatus: { type: String, index: true },
    assortment: String,

    inventoryDate: String,
    sourceFile: String,

    sourceSystem: {
      type: String,
      default: "SAP_ATP",
      index: true,
    },

    lastImportedAt: Date,

    lastSoldAt: Date,
    lastSoldByCashierId: String,
    lastSoldByCashierName: String,

    status: {
      type: String,
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "inventories"
  }
);

InventorySchema.index({ storeCode: 1, sku: 1 });
InventorySchema.index({ siteCode: 1, sku: 1 });
InventorySchema.index({ storeCode: 1, locationType: 1, atpQty: 1 });
InventorySchema.index({
  productName: "text",
  sku: "text",
  articleNo: "text",
  category: "text",
  brand: "text",
  lob: "text",
});

module.exports = mongoose.model("Inventory", InventorySchema, "inventories");
