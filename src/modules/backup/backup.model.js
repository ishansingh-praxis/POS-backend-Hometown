const mongoose = require("mongoose");
const BackupJobSchema = new mongoose.Schema(
  {
    backupId: { type: String, index: true },
    backupType: { type: String, index: true },
    fileName: { type: String, index: true },
    status: { type: String, index: true },
    createdBy: { type: String, index: true },
    completedAt: { type: Date },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("BackupJob", BackupJobSchema);
