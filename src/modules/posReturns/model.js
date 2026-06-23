const mongoose = require("mongoose");

const PosReturnSchema = new mongoose.Schema(
  {
    returnId: { type: String, required: true, unique: true, index: true },

    originalInvoiceId: { type: String, index: true },
    originalOrderId: { type: String, index: true },

    storeCode: { type: String, required: true, index: true },
    cashierId: { type: String, index: true },
    cashierName: String,

    customerPhone: { type: String, index: true },
    customerName: String,

    returnItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    returnAmount: { type: Number, required: true },
    returnReason: String,

    status: { type: String, default: "CONFIRMED", index: true },
    generatedCreditNoteId: { type: String, index: true },
  },
  {
    timestamps: true,
    strict: false,
    // Distinct from the existing generic `returns` collection (admin-side
    // CRUD with no item-level logic) — this is the POS return+credit-note
    // workflow specifically, so it gets its own collection to avoid clashing.
    collection: "pos_return_transactions",
  }
);

module.exports = mongoose.model("PosReturn", PosReturnSchema, "pos_return_transactions");
