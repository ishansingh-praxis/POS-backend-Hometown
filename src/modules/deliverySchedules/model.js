const mongoose = require("mongoose");

const DeliveryScheduleSchema = new mongoose.Schema(
  {
    deliveryScheduleId: { type: String, required: true, unique: true, index: true },
    // Either a sales order booking (Set 6) or a regular OTC checkout (orderId/invoiceId)
    // can carry a delivery schedule — only one of the two pairs will be set.
    salesOrderId: { type: String, index: true },
    orderId: { type: String, index: true },
    invoiceId: { type: String, index: true },

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    customerPhone: { type: String, index: true },
    customerName: String,

    deliveryOption: { type: String, default: "HOME_DELIVERY" },
    deliveryDate: Date,
    deliverySiteCode: String,

    billingAddress: mongoose.Schema.Types.Mixed,
    shippingAddress: mongoose.Schema.Types.Mixed,

    status: {
      type: String,
      enum: ["PENDING", "SCHEDULED", "DISPATCHED", "DELIVERED"],
      default: "PENDING",
      index: true,
    },

    dispatchedAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
    strict: false,
    collection: "delivery_schedules",
  }
);

module.exports = mongoose.model("DeliverySchedule", DeliveryScheduleSchema, "delivery_schedules");
