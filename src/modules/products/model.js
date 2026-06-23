const mongoose = require("mongoose");

const ProductDimensionsSchema = new mongoose.Schema(
  {
    lengthMm: Number,
    widthMm: Number,
    heightMm: Number
  },
  { _id: false, strict: false }
);

const ProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      index: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    articleNo: { type: String, index: true },
    articleDescription: String,
    barcode: {
      type: String,
      index: true
    },
    sapMaterialCode: {
      type: String,
      index: true
    },
    slug: {
      type: String,
      index: true
    },
    productName: {
      type: String,
      index: true
    },
    mainParent: String,
    brand: {
      type: String,
      default: "HomeTown",
      index: true
    },
    brandDescription: String,
    vendor: String,
    mainCategory: {
      type: String,
      index: true
    },
    category: {
      type: String,
      index: true
    },
    mercCategory: { type: String, index: true },
    subcategory: {
      type: String,
      index: true
    },
    productType: {
      type: String,
      index: true
    },
    lob: { type: String, index: true },
    description: String,
    shortDescription: String,
    mrp: Number,
    map: { type: Number, default: 0 },
    sellingPrice: Number,
    discountPercent: Number,
    discountAmount: Number,
    exchangePrice: Number,
    gstPercent: Number,
    hsnCode: {
      type: String,
      index: true
    },
    taxableAmount: Number,
    gstAmount: Number,
    currency: {
      type: String,
      default: "INR"
    },
    // --- Flat image fields (sourced from pos_products_with_best_match_images.json) ---
    // Nothing in this codebase reads the old object-array `images` shape, so this is
    // a safe straight repurpose rather than a breaking rename.
    primaryImage: { type: String, default: "" },
    thumbnailImage: { type: String, default: "" },
    images: { type: [String], default: [] },

    imageStatus: {
      type: String,
      enum: [
        "WEBSITE_IMAGE_MATCHED",
        "CATEGORY_BEST_MATCH",
        "PENDING_WEBSITE_IMAGE",
        "NO_IMAGE",
      ],
      default: "CATEGORY_BEST_MATCH",
      index: true,
    },

    imageMatchType: {
      type: String,
      default: "",
      index: true,
    },

    imageMatchConfidence: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW", "MEDIUM_CATEGORY_LEVEL", ""],
      default: "",
      index: true,
    },

    websiteCompare: {
      source: String,
      status: String,
      matchMethod: String,
      productUrl: String,
      matchedSku: String,
      matchedTitle: String,
      onlineMrp: Number,
      onlineSalePrice: Number,
      onlineDiscountPercent: Number,
      onlineAvailability: String,
      priceDifference: Number,
      lastCheckedAt: String,
      searchUrl: String,
    },

    sourceUrl: String,

    // --- SAP ATP real-inventory fields ---
    sourceSystem: { type: String, default: "SAP_ATP", index: true },
    sourceFile: String,
    isSapAtpProduct: { type: Boolean, default: false },

    inventorySummary: {
      totalStockQty: { type: Number, default: 0 },
      totalAtpQty: { type: Number, default: 0 },
      storeAtpQty: { type: Number, default: 0 },
      rdcAtpQty: { type: Number, default: 0 },
      mdcAtpQty: { type: Number, default: 0 },
      locationCount: { type: Number, default: 0 },
      storeCount: { type: Number, default: 0 },
      rdcCount: { type: Number, default: 0 },
      mdcCount: { type: Number, default: 0 },
      totalMapValue: { type: Number, default: 0 },
    },

    stockSummary: {
      totalStockQty: { type: Number, default: 0 },
      totalAtpQty: { type: Number, default: 0 },
      totalMapValue: { type: Number, default: 0 },
    },

    stockStatus: {
      type: String,
      enum: ["IN_STOCK", "LIMITED_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
      index: true,
    },

    availableInStores: { type: Boolean, default: false, index: true },
    availableInNetwork: { type: Boolean, default: false, index: true },

    posRules: {
      isSellable: { type: Boolean, default: true },
      allowDiscount: { type: Boolean, default: true },
      allowReturn: { type: Boolean, default: true },
      requireSerialNumber: { type: Boolean, default: false },
    },
    material: String,
    frameMaterial: String,
    upholstery: String,
    color: {
      type: String,
      index: true
    },
    size: String,
    dimensions: ProductDimensionsSchema,
    weightKg: Number,
    assemblyRequired: Boolean,
    installationRequired: Boolean,
    deliveryRequired: Boolean,
    returnEligible: Boolean,
    returnWindowDays: Number,
    warranty: String,
    availability: String,
    isOnlineProduct: Boolean,
    isOfflineProduct: Boolean,
    isPOSProduct: Boolean,
    source: String,
    dataQuality: String,
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "products"
  }
);

ProductSchema.index({
  productName: "text",
  articleDescription: "text",
  sku: "text",
  barcode: "text",
  articleNo: "text",
  sapMaterialCode: "text",
  mainCategory: "text",
  category: "text",
  subcategory: "text",
  productType: "text",
  color: "text",
  material: "text",
  brand: "text",
  lob: "text"
});

module.exports = mongoose.model("Product", ProductSchema, "products");
