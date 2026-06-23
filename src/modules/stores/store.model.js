const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema(
  {
    storeCode: { type: String, unique: true, required: true },
    storeName: String,
    city: String,
    state: String,
    region: String,
    zone: String,
    address: String,
    siteId: String,
    sapStoreCode: String,
    managerId: String,
    managerName: String,
    status: { type: String, default: "ACTIVE" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Store", StoreSchema);
