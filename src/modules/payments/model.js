const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, index: true },

    // live POS fields
    orderId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    storeCode: { type: String, index: true },
    storeName: String,
    customerPhone: { type: String, index: true },

    paymentMethod: {
      type: String,
      enum: ["UPI", "CARD", "CASH", "SAP_UNKNOWN", "MIXED", "EMI", "CREDIT_NOTE"],
      index: true,
    },

    paymentMode: { type: String, index: true },
    amount: { type: Number, default: 0, index: true },

    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "SUCCESS",
        "FAILED",
        "REFUNDED",
        "SAP_POSTED",
        "REFUNDED_OR_REVERSED",
        "ZERO_OR_UNKNOWN",
      ],
      default: "SUCCESS",
      index: true,
    },

    upiTransactionId: String,
    cardLast4: String,
    cardType: String,
    bankName: String,
    cardHolderName: String,
    cardApprovalCode: String,
    cashNotes: { type: mongoose.Schema.Types.Mixed, default: {} },

    transactionReference: String,
    paidAt: Date,

    // SAP fields
    sourceSystem: { type: String, default: "POS", index: true },
    isHistoricalPayment: { type: Boolean, default: false },
    sapBillingDocument: { type: String, index: true },
    sapSalesDocument: { type: String, index: true },
    orderReference: String,
    billingType: { type: String, index: true },
    transactionType: { type: String, index: true },
    paymentDate: { type: String, index: true },
    storeOrPlant: { type: String, index: true },
    locationType: { type: String, index: true },
    customerCode: { type: String, index: true },
    customerName: { type: String, index: true },
    customerCity: { type: String, index: true },
    billToCode: { type: String, index: true },
    lineCount: { type: Number, default: 0 },
    remarks: String,
  },
  {
    timestamps: true,
    strict: false,
    collection: "payments",
  }
);

PaymentSchema.index({
  paymentId: "text",
  orderId: "text",
  invoiceId: "text",
  sapBillingDocument: "text",
  sapSalesDocument: "text",
  customerName: "text",
  customerCode: "text",
  customerPhone: "text",
  storeName: "text",
  storeOrPlant: "text",
});

module.exports = mongoose.model("Payment", PaymentSchema, "payments");
