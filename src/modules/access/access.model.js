const mongoose = require("mongoose");
const AccessProfileSchema = new mongoose.Schema(
  {
    accessId: { type: String, index: true },
    role: { type: String, index: true },
    permissions: [String],
    storeCode: { type: String, index: true },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("AccessProfile", AccessProfileSchema);
