const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema(
  {
    storeCode: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    storeName: {
      type: String,
      index: true
    },
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
    address: String,
    latitude: Number,
    longitude: Number,
    geofenceRadiusMeters: {
      type: Number,
      default: 200
    },
    openingTime: {
      type: String,
      default: "10:00"
    },
    closingTime: {
      type: String,
      default: "22:00"
    },
    managerId: mongoose.Schema.Types.Mixed,
    gstNumber: String,
    sapStoreCode: String,
    posEnabled: Boolean,
    onlineFulfillmentEnabled: Boolean,
    offlineBillingEnabled: Boolean,
    inventoryTrackingEnabled: Boolean,
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "stores"
  }
);

module.exports = mongoose.model("Store", StoreSchema, "stores");
