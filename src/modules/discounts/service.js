const Discount = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.discountId) filter.discountId = query.discountId;
  if (query.discountScope) filter.discountScope = query.discountScope;
  if (query.sku) filter.sku = query.sku;
  if (query.productId) filter.productId = query.productId;
  if (query.mainCategory) filter.mainCategory = query.mainCategory;
  if (query.category) filter.category = query.category;
  if (query.subcategory) filter.subcategory = query.subcategory;
  if (query.status) filter.status = query.status;

  if (query.storeCode) {
    filter.applicableStoreCodes = query.storeCode;
  }

  if (query.requiresManagerApproval) {
    filter.requiresManagerApproval = query.requiresManagerApproval === "true";
  }

  if (query.q) {
    const search = new RegExp(query.q, "i");

    filter.$or = [
      { discountId: search },
      { discountName: search },
      { sku: search },
      { productId: search },
      { mainCategory: search },
      { category: search },
      { subcategory: search }
    ];
  }

  return filter;
};

const getDiscounts = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const [data, total] = await Promise.all([
    Discount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Discount.countDocuments(filter)
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

const getDiscountById = async (id) => {
  return Discount.findById(id);
};

const getDiscountByDiscountId = async (discountId) => {
  return Discount.findOne({ discountId });
};

const createDiscount = async (payload) => {
  return Discount.create(payload);
};

const updateDiscount = async (id, payload) => {
  delete payload._id;

  return Discount.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

const deleteDiscount = async (id) => {
  return Discount.findByIdAndDelete(id);
};

module.exports = {
  getDiscounts,
  getDiscountById,
  getDiscountByDiscountId,
  createDiscount,
  updateDiscount,
  deleteDiscount
};
