const mongoose = require("mongoose");
const PosDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, index: true },
    storeCode: { type: String, index: true },
    deviceName: { type: String, index: true },
    deviceType: { type: String, index: true },
    status: { type: String, index: true },
    lastActiveAt: { type: Date },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("PosDevice", PosDeviceSchema);
