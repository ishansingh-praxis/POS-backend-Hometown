const mongoose = require("mongoose");
const BillingTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, index: true },
    cartId: { type: String, index: true },
    storeCode: { type: String, index: true },
    customerId: { type: String, index: true },
    status: { type: String, index: true },
    paymentMode: { type: String, index: true },
    paymentAmount: { type: Number, default: 0 },
    invoiceId: { type: String, index: true },
    orderId: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("BillingTicket", BillingTicketSchema);
