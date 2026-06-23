const mongoose = require("mongoose");
const MasterDataSchema = new mongoose.Schema(
  {
    masterId: { type: String, index: true },
    type: { type: String, index: true },
    code: { type: String, index: true },
    label: { type: String, index: true },
    value: mongoose.Schema.Types.Mixed,
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("MasterData", MasterDataSchema);
