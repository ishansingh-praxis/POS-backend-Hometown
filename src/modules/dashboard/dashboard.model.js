const mongoose = require("mongoose");
const DashboardSnapshotSchema = new mongoose.Schema(
  {
    snapshotId: { type: String, index: true },
    dashboardType: { type: String, index: true },
    storeCode: { type: String, index: true },
    kpis: mongoose.Schema.Types.Mixed,
    charts: mongoose.Schema.Types.Mixed,
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("DashboardSnapshot", DashboardSnapshotSchema);
