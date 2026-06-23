const PriceHistory = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.priceHistoryId) filter.priceHistoryId = query.priceHistoryId;
  if (query.productId) filter.productId = query.productId;
  if (query.sku) filter.sku = query.sku;
  if (query.source) filter.source = query.source;

  return filter;
};

const getPriceHistory = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const [data, total] = await Promise.all([
    PriceHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PriceHistory.countDocuments(filter)
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

const getPriceHistoryById = async (id) => {
  return PriceHistory.findById(id);
};

const getPriceHistoryBySku = async (sku) => {
  return PriceHistory.find({ sku }).sort({ createdAt: -1 });
};

const createPriceHistory = async (payload) => {
  return PriceHistory.create(payload);
};

module.exports = {
  getPriceHistory,
  getPriceHistoryById,
  getPriceHistoryBySku,
  createPriceHistory
};
