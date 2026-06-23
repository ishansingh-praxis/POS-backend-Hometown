const mongoose = require("mongoose");

const CreditNoteSchema = new mongoose.Schema(
  {
    creditNoteId: { type: String, required: true, unique: true, index: true },

    customerPhone: { type: String, required: true, index: true },
    customerId: { type: String, index: true },
    customerName: String,

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    originalInvoiceId: { type: String, index: true },
    returnId: { type: String, index: true },

    creditAmount: { type: Number, required: true },
    availableAmount: { type: Number, required: true },
    redeemedAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["ACTIVE", "PARTIALLY_REDEEMED", "REDEEMED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },

    issuedAt: { type: Date, default: Date.now },
    issuedBy: String,
    expiryDate: Date,
  },
  {
    timestamps: true,
    strict: false,
    collection: "credit_notes",
  }
);

const CreditNoteRedemptionSchema = new mongoose.Schema(
  {
    redemptionId: { type: String, required: true, unique: true, index: true },
    creditNoteId: { type: String, required: true, index: true },

    invoiceId: { type: String, index: true },
    orderId: { type: String, index: true },

    customerPhone: { type: String, index: true },
    storeCode: { type: String, index: true },

    redeemedAmount: { type: Number, required: true },

    otpVerified: { type: Boolean, default: false },
    otpVerificationId: String,

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "credit_note_redemptions",
  }
);

module.exports = {
  CreditNote: mongoose.model("CreditNote", CreditNoteSchema, "credit_notes"),
  CreditNoteRedemption: mongoose.model(
    "CreditNoteRedemption",
    CreditNoteRedemptionSchema,
    "credit_note_redemptions"
  ),
};
