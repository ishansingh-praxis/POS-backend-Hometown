const mongoose = require("mongoose");
const ImportExportJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, index: true },
    jobType: { type: String, index: true },
    module: { type: String, index: true },
    fileName: { type: String, index: true },
    status: { type: String, index: true },
    summary: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("ImportExportJob", ImportExportJobSchema);
