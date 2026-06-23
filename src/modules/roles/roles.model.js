const mongoose = require("mongoose");
const RoleSchema = new mongoose.Schema(
  {
    roleName: { type: String, index: true },
    description: { type: String, index: true },
    status: { type: String, index: true },
    permissions: [String],
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Role", RoleSchema);
