const Store = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.city) filter.city = query.city;
  if (query.state) filter.state = query.state;
  if (query.region) filter.region = query.region;
  if (query.zone) filter.zone = query.zone;
  if (query.status) filter.status = query.status;

  if (query.q) {
    const search = new RegExp(query.q, "i");

    filter.$or = [
      { storeCode: search },
      { storeName: search },
      { city: search },
      { state: search },
      { region: search },
      { address: search }
    ];
  }

  return filter;
};

const getStores = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const [data, total] = await Promise.all([
    Store.find(filter).sort({ storeCode: 1 }).skip(skip).limit(limit),
    Store.countDocuments(filter)
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

const getStoreById = async (id) => {
  return Store.findById(id);
};

const getStoreByCode = async (storeCode) => {
  return Store.findOne({ storeCode });
};

const createStore = async (payload) => {
  return Store.create(payload);
};

const updateStore = async (id, payload) => {
  delete payload._id;

  return Store.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

const updateStoreByCode = async (storeCode, payload) => {
  delete payload._id;

  return Store.findOneAndUpdate(
    { storeCode },
    { $set: payload },
    { new: true }
  );
};

const deleteStore = async (id) => {
  return Store.findByIdAndDelete(id);
};

module.exports = {
  getStores,
  getStoreById,
  getStoreByCode,
  createStore,
  updateStore,
  updateStoreByCode,
  deleteStore
};
