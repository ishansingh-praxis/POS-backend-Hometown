const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, sparse: true },
  loginId: { type: String, unique: true, sparse: true },
  cashierId: { type: String, unique: true, sparse: true },
  posUserId: { type: String, unique: true, sparse: true },
  employeeCode: { type: String, index: true },
  username: { type: String, index: true },
  name: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  phone: String,
  contactNumber: String,
  role: { type: String, enum: ["ADMIN", "MANAGER", "CASHIER"], required: true, index: true },
  posRole: String,
  designation: String,
  department: String,
  storeCode: { type: String, index: true },
  storeName: String,
  city: String,
  region: String,
  location: String,
  siteId: String,
  assignedStore: mongoose.Schema.Types.Mixed,
  managerId: String,
  managerName: String,
  managerEmail: String,
  managerContactNumber: String,
  permissions: [String],
  passwordHash: String,
  loginEnabled: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  status: { type: String, default: "ACTIVE", index: true },
  lastLoginAt: Date
}, { timestamps: true, strict: false });

UserSchema.methods.comparePassword = function (password) { return bcrypt.compare(password, this.passwordHash || ""); };
UserSchema.statics.hashPassword = async function (password) { const salt = await bcrypt.genSalt(10); return bcrypt.hash(password, salt); };
module.exports = mongoose.model("User", UserSchema);
