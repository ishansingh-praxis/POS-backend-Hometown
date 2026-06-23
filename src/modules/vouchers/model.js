const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema(
  {
    voucherId: { type: String, required: true, unique: true, index: true },
    voucherCode: { type: String, required: true, unique: true, index: true },

    customerPhone: { type: String, index: true },
    customerName: String,

    amount: { type: Number, required: true },
    availableAmount: { type: Number, required: true },
    redeemedAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },

    storeIssued: String,
    issuedBy: String,
    issuedAt: { type: Date, default: Date.now },
    expiryDate: Date,

    notes: String,
  },
  {
    timestamps: true,
    strict: false,
    collection: "vouchers",
  }
);

module.exports = mongoose.model("Voucher", VoucherSchema, "vouchers");
