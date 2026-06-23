const Coupon = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.couponCode) filter.couponCode = query.couponCode.toUpperCase();
  if (query.status) filter.status = query.status;

  if (query.q) {
    const search = new RegExp(query.q, "i");

    filter.$or = [
      { couponCode: search },
      { couponName: search }
    ];
  }

  return filter;
};

const getCoupons = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const [data, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(filter)
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

const getCouponById = async (id) => {
  return Coupon.findById(id);
};

const getCouponByCode = async (couponCode) => {
  return Coupon.findOne({ couponCode: couponCode.toUpperCase() });
};

const validateCoupon = async ({ couponCode, billAmount }) => {
  const coupon = await Coupon.findOne({
    couponCode: couponCode.toUpperCase(),
    status: "ACTIVE"
  });

  if (!coupon) {
    const error = new Error("Invalid coupon");
    error.statusCode = 404;
    throw error;
  }

  if (Number(billAmount) < coupon.minimumBillAmount) {
    const error = new Error(
      `Minimum bill amount should be ${coupon.minimumBillAmount}`
    );
    error.statusCode = 400;
    throw error;
  }

  let discountAmount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (Number(billAmount) * coupon.discountValue) / 100;

    if (coupon.maximumDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  return {
    coupon,
    billAmount: Number(billAmount),
    discountAmount,
    payableAmount: Number(billAmount) - discountAmount
  };
};

const createCoupon = async (payload) => {
  return Coupon.create(payload);
};

const updateCoupon = async (id, payload) => {
  delete payload._id;

  return Coupon.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

const deleteCoupon = async (id) => {
  return Coupon.findByIdAndDelete(id);
};

module.exports = {
  getCoupons,
  getCouponById,
  getCouponByCode,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
