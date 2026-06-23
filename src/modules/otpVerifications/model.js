const mongoose = require("mongoose");

const OtpVerificationSchema = new mongoose.Schema(
  {
    otpId: { type: String, required: true, unique: true, index: true },

    module: { type: String, required: true, index: true },
    customerPhone: { type: String, required: true, index: true },

    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["SENT", "VERIFIED", "EXPIRED"],
      default: "SENT",
      index: true,
    },

    expiresAt: { type: Date, required: true },
    verifiedAt: Date,
  },
  {
    timestamps: true,
    strict: false,
    collection: "otp_verifications",
  }
);

module.exports = mongoose.model("OtpVerification", OtpVerificationSchema, "otp_verifications");
