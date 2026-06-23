const mongoose = require("mongoose");

const InventoryMovementSchema = new mongoose.Schema(
  {
    movementId: { type: String, required: true, unique: true, index: true },

    movementType: {
      type: String,
      enum: [
        "SALE",
        "RETURN",
        "REFUND",
        "STOCK_ADJUSTMENT",
        "STOCK_IN",
        "STOCK_OUT",
        "ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "DAMAGE",
        "SCRAP",
        "RESERVATION",
        "RESERVATION_RELEASE",
      ],
      required: true,
      index: true,
    },

    storeCode: { type: String, required: true, index: true },
    storeName: String,

    sku: { type: String, required: true, index: true },
    productId: { type: String, index: true },
    productName: String,
    barcode: String,
    category: String,
    brand: String,

    quantity: { type: Number, required: true },

    beforeQty: { type: Number, default: 0 },
    afterQty: { type: Number, default: 0 },

    orderId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    paymentId: { type: String, index: true },

    cashierId: { type: String, index: true },
    cashierName: { type: String, index: true },

    sessionId: { type: String, index: true },
    posDeviceId: { type: String, index: true },

    reason: String,
    remarks: String,

    sourceSystem: {
      type: String,
      enum: ["POS", "SAP", "MANUAL"],
      default: "POS",
      index: true,
    },

    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "FAILED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "inventory_movements",
  }
);

InventoryMovementSchema.index({
  movementId: "text",
  sku: "text",
  productName: "text",
  orderId: "text",
  invoiceId: "text",
  cashierName: "text",
});

module.exports = mongoose.model(
  "InventoryMovement",
  InventoryMovementSchema,
  "inventory_movements"
);
