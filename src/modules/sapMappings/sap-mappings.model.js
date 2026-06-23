const mongoose = require("mongoose");
const SapMappingSchema = new mongoose.Schema(
  {
    mappingId: { type: String, index: true },
    entityType: { type: String, index: true },
    localCode: { type: String, index: true },
    sapCode: { type: String, index: true },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("SapMapping", SapMappingSchema);
