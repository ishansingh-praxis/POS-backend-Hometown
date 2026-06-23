const mongoose = require("mongoose");
const CustomerAddressSchema = new mongoose.Schema(
  {
    customerId: { type: String, index: true },
    addressType: { type: String, index: true },
    addressLine1: { type: String, index: true },
    addressLine2: { type: String, index: true },
    city: { type: String, index: true },
    state: { type: String, index: true },
    pincode: { type: String, index: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);
module.exports = mongoose.model("CustomerAddress", CustomerAddressSchema);
