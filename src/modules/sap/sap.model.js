const mongoose = require("mongoose");
const SapSyncLogSchema = new mongoose.Schema(
  {
    syncId: { type: String, index: true },
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    storeCode: { type: String, index: true },
    syncStatus: { type: String, index: true },
    retryCount: { type: Number, default: 0 },
    errorMessage: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("SapSyncLog", SapSyncLogSchema);
