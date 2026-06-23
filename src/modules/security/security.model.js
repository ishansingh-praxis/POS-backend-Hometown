const mongoose = require("mongoose");
const SecurityLogSchema = new mongoose.Schema(
  {
    securityId: { type: String, index: true },
    eventType: { type: String, index: true },
    userId: { type: String, index: true },
    ip: { type: String, index: true },
    status: { type: String, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("SecurityLog", SecurityLogSchema);
