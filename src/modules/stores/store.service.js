const Store = require("./store.model");
const User = require("../users/user.model");

const create = async (payload) => Store.create(payload);
const list = async (query = {}) => {
  const filter = {};
  if (query.region) filter.region = query.region;
  if (query.status) filter.status = query.status;
  return Store.find(filter).sort({ storeCode: 1 });
};
const getByStoreCode = async (storeCode) => Store.findOne({ storeCode });
const update = async (storeCode, payload) => Store.findOneAndUpdate({ storeCode }, payload, { new: true, upsert: false });
const remove = async (storeCode) => Store.findOneAndDelete({ storeCode });

const cashierSummary = async () => {
  return User.aggregate([
    { $match: { role: "CASHIER" } },
    { $group: { _id: "$storeCode", storeName: { $first: "$storeName" }, city: { $first: "$city" }, region: { $first: "$region" }, totalCashiers: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = { create, list, getByStoreCode, update, remove, cashierSummary };
