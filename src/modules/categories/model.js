const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      index: true
    },
    name: {
      type: String,
      required: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      index: true
    },
    description: String,
    children: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    },

    // --- SAP ATP LOB / Merc. Category hierarchy fields ---
    level: {
      type: String,
      enum: ["LOB", "CATEGORY", "SUBCATEGORY"],
      default: "CATEGORY",
      index: true,
    },

    parentId: { type: String, index: true },
    parentName: String,
    parentSlug: String,

    lob: { type: String, index: true },
    mercCategory: { type: String, index: true },

    productCount: { type: Number, default: 0 },
    inventoryRows: { type: Number, default: 0 },

    totalStockQty: { type: Number, default: 0 },
    totalAtpQty: { type: Number, default: 0 },
    storeAtpQty: { type: Number, default: 0 },
    rdcAtpQty: { type: Number, default: 0 },
    mdcAtpQty: { type: Number, default: 0 },

    totalMapValue: { type: Number, default: 0 },
    totalMrpValue: { type: Number, default: 0 },

    lowStockCount: { type: Number, default: 0 },
    outOfStockCount: { type: Number, default: 0 },

    brands: { type: [String], default: [] },

    image: String,
    icon: String,

    sortOrder: { type: Number, default: 0 },

    isVisibleOnPos: { type: Boolean, default: true },
    isVisibleOnWebsite: { type: Boolean, default: true },

    sourceSystem: { type: String, default: "MANUAL" },
    sourceFile: String,
  },
  {
    timestamps: true,
    strict: false,
    collection: "categories"
  }
);

CategorySchema.index({ slug: 1, level: 1 }, { unique: true });
CategorySchema.index({
  name: "text",
  slug: "text",
  lob: "text",
  mercCategory: "text",
  parentName: "text",
});

module.exports = mongoose.model("Category", CategorySchema, "categories");
