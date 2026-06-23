require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const PosUser = require("../modules/auth/user.model");

const filePath = path.join(__dirname, "../../data/login.json");

const normalizeId = (record) => {
  const copy = { ...record };
  if (
    copy._id &&
    copy._id.$oid &&
    mongoose.Types.ObjectId.isValid(copy._id.$oid)
  ) {
    copy._id = copy._id.$oid;
  } else {
    delete copy._id;
  }
  delete copy.__v;
  return copy;
};

const run = async () => {
  await connectDB();
  let users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  // support both array and grouped-object structures
  if (!Array.isArray(users)) {
    // pick only array values (skip metadata)
    users = Object.values(users).filter((v) => Array.isArray(v)).flat();
  }
  let inserted = 0;
  let updated = 0;
  for (const rawUser of users.map(normalizeId)) {
    const plainPassword = rawUser.password || "Password@123";
    const user = {
      ...rawUser,
      email: rawUser.email?.toLowerCase(),
      username: rawUser.username?.toLowerCase(),
      password: await bcrypt.hash(plainPassword, 10)
    };
    // provide a default dashboardType when missing
    const defaultDashboardType = user.role === 'ADMIN' ? 'ADMIN_DASHBOARD' : (user.role === 'MANAGER' ? 'MANAGER_DASHBOARD' : 'CASHIER_DASHBOARD');
    user.dashboardType = user.dashboardType || defaultDashboardType;
    const existing = await PosUser.findOne({
      $or: [
        { email: user.email },
        { employeeCode: user.employeeCode },
        { loginId: user.loginId }
      ]
    });
    if (existing) {
      delete user._id;
      await PosUser.updateOne(
        { _id: existing._id },
        { $set: user }
      );
      updated++;
    } else {
      await PosUser.create(user);
      inserted++;
    }
  }
  console.log(`POS logins seeded. Inserted: ${inserted}, Updated: ${updated}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
