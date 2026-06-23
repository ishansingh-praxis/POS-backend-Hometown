const mongoose = require("mongoose");

const CatalogueSchema = new mongoose.Schema(
  {
    catalogueId: {
      type: String,
      unique: true,
      index: true,
      default: "HOMETOWN-POS-CATALOGUE"
    },

    name: {
      type: String,
      default: "HomeTown POS Catalogue"
    },

    description: {
      type: String
    },

    totalStores: Number,
    totalCategories: Number,
    totalProducts: Number,
    totalInventoryRows: Number,

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

module.exports = mongoose.model("Catalogue", CatalogueSchema);
