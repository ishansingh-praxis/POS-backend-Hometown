const mongoose = require("mongoose");
const AccountingEntrySchema = new mongoose.Schema(
  {
    entryId: { type: String, index: true },
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    storeCode: { type: String, index: true },
    entryType: { type: String, index: true },
    debitAccount: { type: String, index: true },
    creditAccount: { type: String, index: true },
    amount: { type: Number, default: 0 },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("AccountingEntry", AccountingEntrySchema);
