const mongoose = require("mongoose");
const NotificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, index: true },
    title: { type: String, index: true },
    message: { type: String, index: true },
    type: { type: String, index: true },
    storeCode: { type: String, index: true },
    userId: { type: String, index: true },
    status: { type: String, index: true },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("Notification", NotificationSchema);
