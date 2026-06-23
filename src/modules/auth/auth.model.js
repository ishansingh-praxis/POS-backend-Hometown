const mongoose = require("mongoose");
const LoginLogSchema = new mongoose.Schema({ userId:String, email:String, username:String, role:String, loginType:String, success:Boolean, message:String, ip:String, userAgent:String }, {timestamps:true});
module.exports = mongoose.model("LoginLog", LoginLogSchema);
