const Model = require("./customers.model");
const Payment = require("../payments/model");

const normalizeCustomerPayload = (payload = {}) => {
  const customerName = payload.customerName || payload.name || "";
  const customerPhone = payload.customerPhone || payload.phone || payload.mobile || "";

  return {
    ...payload,

    name: payload.name || customerName,
    customerName,

    phone: payload.phone || customerPhone,
    mobile: payload.mobile || customerPhone,
    customerPhone,

    city: payload.city || payload.primaryCity || payload.primaryAddress?.city || "",
    primaryCity: payload.primaryCity || payload.city || payload.primaryAddress?.city || "",

    totalSpend:
      payload.totalSpend ??
      payload.totalSpent ??
      payload.totalHistoricalSalesValue ??
      0,

    totalSpent:
      payload.totalSpent ??
      payload.totalSpend ??
      payload.totalHistoricalSalesValue ??
      0,

    visits: payload.visits ?? payload.invoiceCount ?? payload.orderCount ?? 0,
    orders: payload.orders ?? payload.orderCount ?? 0,

    status: payload.status || "ACTIVE",
    sourceSystem: payload.sourceSystem || "SAP",
  };
};

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.customerType) filter.customerType = query.customerType;
  if (query.type) filter.customerType = query.type;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.sapCustomerCode) filter.sapCustomerCode = query.sapCustomerCode;
  if (query.city) filter.primaryCity = new RegExp(query.city, "i");

  if (query.phone) {
    const rx = new RegExp(query.phone, "i");
    filter.$or = [{ phone: rx }, { mobile: rx }, { customerPhone: rx }, { sapCustomerCode: rx }];
  }

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { name: rx },
      { customerName: rx },
      { phone: rx },
      { mobile: rx },
      { customerPhone: rx },
      { email: rx },
      { gstin: rx },
      { gstNumber: rx },
      { sapCustomerCode: rx },
      { primaryCity: rx },
    ];
  }

  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query);

  const sort = {};
  if (query.sortBy === "sales") sort.totalHistoricalSalesValue = -1;
  else if (query.sortBy === "invoices") sort.invoiceCount = -1;
  else sort.createdAt = -1;

  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const summary = async (query = {}) => {
  const filter = buildFilter(query);

  const [result] = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        b2cCustomers: {
          $sum: { $cond: [{ $eq: ["$customerType", "B2C"] }, 1, 0] },
        },
        b2bCustomers: {
          $sum: { $cond: [{ $eq: ["$customerType", "B2B"] }, 1, 0] },
        },
        totalSales: { $sum: "$totalHistoricalSalesValue" },
        totalInvoices: { $sum: "$invoiceCount" },
        avgCustomerValue: { $avg: "$totalHistoricalSalesValue" },
      },
    },
  ]);

  const topCities = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$primaryCity",
        customers: { $sum: 1 },
        sales: { $sum: "$totalHistoricalSalesValue" },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 20 },
  ]);

  const topCustomers = await Model.find(filter)
    .sort({ totalHistoricalSalesValue: -1 })
    .limit(20);

  return {
    totalCustomers: result?.totalCustomers || 0,
    b2cCustomers: result?.b2cCustomers || 0,
    b2bCustomers: result?.b2bCustomers || 0,
    totalSales: Math.round(result?.totalSales || 0),
    totalInvoices: result?.totalInvoices || 0,
    avgCustomerValue: Math.round(result?.avgCustomerValue || 0),
    topCities,
    topCustomers,
  };
};

const getById = async (id) => {
  return Model.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { customerId: id },
      { sapCustomerCode: id },
      { customerPhone: id },
      { phone: id },
      { mobile: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });
};

const profile = async (id) => {
  const customer = await getById(id);

  if (!customer) return null;

  const code = customer.sapCustomerCode || customer.customerPhone || customer.phone || customer.mobile;

  const payments = await Payment.find({
    $or: [
      { customerCode: code },
      { customerPhone: code },
      { customerName: customer.customerName },
      { customerName: customer.name },
    ],
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(100);

  const paymentSummary = await Payment.aggregate([
    {
      $match: {
        $or: [
          { customerCode: code },
          { customerPhone: code },
          { customerName: customer.customerName },
          { customerName: customer.name },
        ],
      },
    },
    {
      $group: {
        _id: "$transactionType",
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { amount: -1 } },
  ]);

  return {
    customer,
    payments,
    paymentSummary,
  };
};

const create = (payload) => Model.create(normalizeCustomerPayload(payload));

const bulkCreate = async (records = []) => {
  const docs = records.map(normalizeCustomerPayload);

  return Model.insertMany(docs, {
    ordered: false,
  });
};

const update = (id, payload) => {
  delete payload._id;
  return Model.findByIdAndUpdate(id, normalizeCustomerPayload(payload), { new: true });
};

const remove = (id) => Model.findByIdAndDelete(id);

const patchStatus = (id, status) =>
  Model.findByIdAndUpdate(id, { status }, { new: true });

module.exports = {
  list,
  summary,
  profile,
  getById,
  create,
  bulkCreate,
  update,
  remove,
  patchStatus,
};
