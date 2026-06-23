const mongoose = require("mongoose");

const HeldBillSchema = new mongoose.Schema(
  {
    holdId: { type: String, required: true, unique: true, index: true },

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    cashierId: { type: String, required: true, index: true },
    cashierName: String,

    customerPhone: { type: String, index: true },
    customer: mongoose.Schema.Types.Mixed,

    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    itemCount: { type: Number, default: 0 },

    // Everything else the POS screen needs to fully restore the bill on
    // recall (bill discount %, delivery/installation charges, scheduled
    // delivery, etc.) — kept opaque here since only pos.tsx interprets it.
    posState: { type: mongoose.Schema.Types.Mixed, default: {} },

    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["HELD", "RECALLED", "VOIDED"],
      default: "HELD",
      index: true,
    },

    heldAt: { type: Date, default: Date.now },
    recalledAt: Date,
    voidedAt: Date,
  },
  {
    timestamps: true,
    strict: false,
    collection: "held_bills",
  }
);

HeldBillSchema.index({ storeCode: 1, status: 1 });

module.exports = mongoose.model("HeldBill", HeldBillSchema, "held_bills");
