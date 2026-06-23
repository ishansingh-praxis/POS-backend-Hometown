const jwt = require("jsonwebtoken");
const User = require("../modules/users/user.model");
const PosUser = require("../modules/auth/user.model");
const { errorResponse } = require("../utils/response");
const protect = async (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return errorResponse(res, "Authorization token missing", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "hometown_pos_secret_2026");

    let user = await PosUser.findById(decoded.id).select("-password");
    if (!user) {
      user = await User.findById(decoded.id).select("-passwordHash");
    }

    if (!user || !user.isActive) return errorResponse(res, "User inactive or not found", 401);

    req.user = user;
    next();
  } catch (e) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return errorResponse(res, "Unauthorized", 401);
  if (!roles.includes(req.user.role)) return errorResponse(res, "Forbidden", 403);
  next();
};
module.exports = { protect, allowRoles };
