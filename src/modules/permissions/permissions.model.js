const mongoose = require("mongoose");
const PermissionSchema = new mongoose.Schema(
  {
    permissionKey: { type: String, index: true },
    label: { type: String, index: true },
    module: { type: String, index: true },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Permission", PermissionSchema);
