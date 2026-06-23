const mongoose = require("mongoose");
const DeviceSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true },
    userId: { type: String, index: true },
    username: { type: String, index: true },
    role: { type: String, index: true },
    storeCode: { type: String, index: true },
    deviceId: { type: String, index: true },
    deviceLabel: { type: String, index: true },
    ip: { type: String, index: true },
    lastActive: { type: Date },
    current: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("DeviceSession", DeviceSessionSchema);
