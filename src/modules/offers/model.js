const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    offerId: {
      type: String,
      index: true
    },
    offerName: {
      type: String,
      index: true
    },
    offerType: {
      type: String,
      index: true
    },
    discountValueType: String,
    discountValue: Number,
    applicableMainCategory: {
      type: String,
      index: true
    },
    applicableSubcategory: {
      type: String,
      index: true
    },
    minimumBillAmount: Number,
    maximumDiscountAmount: Number,
    startDate: String,
    endDate: String,
    applicableStoreCodes: [String],
    channel: [String],
    status: {
      type: String,
      default: "ACTIVE",
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "offers"
  }
);

module.exports = mongoose.model("Offer", OfferSchema, "offers");
