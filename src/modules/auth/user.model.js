const mongoose = require("mongoose");
const PosUserSchema = new mongoose.Schema(
  {
    loginId: {
      type: String,
      index: true
    },
    employeeCode: {
      type: String,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    username: {
      type: String,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "CASHIER"],
      required: true,
      index: true
    },
    dashboardType: {
      type: String,
      enum: ["ADMIN_DASHBOARD", "MANAGER_DASHBOARD", "CASHIER_DASHBOARD"],
      required: true
    },
    storeCode: {
      type: String,
      index: true
    },
    storeName: String,
    city: String,
    state: String,
    region: String,
    zone: String,
    permissions: {
      type: [String],
      default: []
    },
    landingRoute: {
      type: String,
      default: "/pos"
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: "pos_logins"
  }
);
module.exports = mongoose.model("PosUser", PosUserSchema, "pos_logins");
