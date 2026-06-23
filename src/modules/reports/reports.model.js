const mongoose = require("mongoose");
const ReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, index: true },
    reportType: { type: String, index: true },
    name: { type: String, index: true },
    module: { type: String, index: true },
    storeCode: { type: String, index: true },
    dateRange: { type: String, index: true },
    payload: mongoose.Schema.Types.Mixed,
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Report", ReportSchema);
