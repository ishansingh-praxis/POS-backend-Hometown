const mongoose = require("mongoose");
const SupportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, index: true },
    subject: { type: String, index: true },
    description: { type: String, index: true },
    storeCode: { type: String, index: true },
    createdBy: { type: String, index: true },
    status: { type: String, index: true },
    priority: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
