const mongoose = require("mongoose");
const SettingSchema = new mongoose.Schema(
  {
    settingKey: { type: String, index: true },
    settingValue: mongoose.Schema.Types.Mixed,
    module: { type: String, index: true },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Setting", SettingSchema);
