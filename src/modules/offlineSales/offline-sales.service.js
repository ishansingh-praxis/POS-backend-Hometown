const Model = require("./offline-sales.model");

const buildFilter = (query = {}) => {
  const filter = {};
  ["status", "storeCode", "customerId", "orderId", "invoiceId", "sku", "role", "type", "module", "syncStatus", "paymentStatus", "orderStatus"].forEach((key) => {
    if (query[key]) filter[key] = query[key];
  });
  if (query.search) {
    const rx = new RegExp(query.search, "i");
    filter.$or = [{ name: rx }, { productName: rx }, { title: rx }, { email: rx }, { sku: rx }, { storeName: rx }, { customerId: rx }, { orderId: rx }];
  }
  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query);
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};
const getById = (id) => Model.findById(id);
const create = (payload) => Model.create(payload);
const bulkCreate = (records = []) => Model.insertMany(records, { ordered: false });
const update = (id, payload) => { delete payload._id; return Model.findByIdAndUpdate(id, payload, { new: true }); };
const remove = (id) => Model.findByIdAndDelete(id);
const patchStatus = (id, status) => Model.findByIdAndUpdate(id, { status }, { new: true });
module.exports = { list, getById, create, bulkCreate, update, remove, patchStatus };
