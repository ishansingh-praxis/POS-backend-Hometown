const Product = require("./model");
const Inventory = require("../inventories/model");
const Discount = require("../discounts/model");
const Offer = require("../offers/model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.productId) filter.productId = query.productId;
  if (query.sku) filter.sku = query.sku;
  if (query.barcode) filter.barcode = query.barcode;
  if (query.mainCategory) filter.mainCategory = query.mainCategory;
  if (query.category) filter.category = query.category;
  if (query.subcategory) filter.subcategory = query.subcategory;
  if (query.productType) filter.productType = query.productType;
  if (query.brand) filter.brand = query.brand;
  if (query.color) filter.color = query.color;
  if (query.status) filter.status = query.status;

  if (query.minPrice || query.maxPrice) {
    filter.sellingPrice = {};

    if (query.minPrice) filter.sellingPrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.sellingPrice.$lte = Number(query.maxPrice);
  }

  if (query.q) {
    const search = new RegExp(query.q, "i");

    filter.$or = [
      { productName: search },
      { sku: search },
      { barcode: search },
      { brand: search },
      { mainCategory: search },
      { category: search },
      { subcategory: search },
      { productType: search },
      { material: search },
      { color: search }
    ];
  }

  return filter;
};

const getProducts = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 300, 1000);
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const sort = {};

  if (query.sortBy === "priceLowHigh") {
    sort.sellingPrice = 1;
  } else if (query.sortBy === "priceHighLow") {
    sort.sellingPrice = -1;
  } else if (query.sortBy === "name") {
    sort.productName = 1;
  } else {
    sort.createdAt = -1;
  }

  const [data, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter)
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

const getProductById = async (id) => {
  return Product.findById(id);
};

const getProductBySku = async (sku) => {
  return Product.findOne({ sku });
};

const getProductByBarcode = async (barcode) => {
  return Product.findOne({ barcode });
};

const getProductDetailBySku = async (sku) => {
  const product = await Product.findOne({ sku });

  if (!product) {
    return null;
  }

  const [inventory, discounts, offers] = await Promise.all([
    Inventory.find({ sku }).sort({ storeCode: 1 }),
    Discount.find({ sku, status: "ACTIVE" }),
    Offer.find({
      status: "ACTIVE",
      $or: [
        { applicableMainCategory: product.mainCategory },
        { applicableSubcategory: product.subcategory }
      ]
    })
  ]);

  return {
    product,
    inventory,
    discounts,
    offers
  };
};

const createProduct = async (payload) => {
  return Product.create(payload);
};

const updateProduct = async (id, payload) => {
  delete payload._id;

  return Product.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

const updateProductBySku = async (sku, payload) => {
  delete payload._id;

  return Product.findOneAndUpdate(
    { sku },
    { $set: payload },
    { new: true }
  );
};

const deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};

// --- SAP ATP-aware querying (used by the new controller.js / routes.js) ---

// Guarantees a product never reaches the UI with a blank image — falls back
// through primaryImage -> thumbnailImage -> first images[] entry.
const normalizeProductImage = (row = {}) => {
  const primary =
    row.primaryImage ||
    row.thumbnailImage ||
    (Array.isArray(row.images) ? row.images[0] : "") ||
    "";

  const thumbnail =
    row.thumbnailImage ||
    row.primaryImage ||
    (Array.isArray(row.images) ? row.images[0] : "") ||
    "";

  const images = Array.isArray(row.images)
    ? row.images.filter(Boolean)
    : primary
    ? [primary]
    : [];

  return {
    ...row,
    primaryImage: primary,
    thumbnailImage: thumbnail,
    images,
    imageStatus: row.imageStatus || (primary ? "CATEGORY_BEST_MATCH" : "NO_IMAGE"),
  };
};

const buildAtpFilter = (query = {}) => {
  const filter = {};

  if (query.sku) filter.sku = String(query.sku);
  if (query.articleNo) filter.articleNo = String(query.articleNo);
  if (query.productId) filter.productId = String(query.productId);
  if (query.category) filter.category = new RegExp(query.category, "i");
  if (query.lob) filter.lob = new RegExp(query.lob, "i");
  if (query.brand) filter.brand = new RegExp(query.brand, "i");
  if (query.imageStatus) filter.imageStatus = query.imageStatus;
  if (query.status) filter.status = query.status;
  if (query.availableInStores) filter.availableInStores = query.availableInStores === "true";
  if (query.availableInNetwork) filter.availableInNetwork = query.availableInNetwork === "true";

  if (query.hasImage === "true") {
    filter.primaryImage = { $exists: true, $ne: "" };
  }

  const andConditions = [];

  if (query.hasImage === "false") {
    andConditions.push({
      $or: [
        { primaryImage: { $exists: false } },
        { primaryImage: "" },
        { primaryImage: null },
      ],
    });
  }

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    andConditions.push({
      $or: [
        { productName: rx },
        { articleDescription: rx },
        { sku: rx },
        { articleNo: rx },
        { productId: rx },
        { category: rx },
        { brand: rx },
        { lob: rx },
      ],
    });
  }

  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }

  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildAtpFilter(query);

  const sort = {};
  if (query.sortBy === "stock") sort["inventorySummary.totalAtpQty"] = -1;
  else if (query.sortBy === "value") sort["inventorySummary.totalMapValue"] = -1;
  else if (query.sortBy === "imageStatus") sort.imageStatus = 1;
  else sort.productName = 1;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const getById = async (id) => {
  return Product.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { productId: id },
      { sku: id },
      { articleNo: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });
};

const bulkUpsert = async (records = []) => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of records) {
    const row = normalizeProductImage(item);

    if (!row.sku) {
      skipped++;
      continue;
    }

    const result = await Product.updateOne(
      { sku: String(row.sku) },
      { $set: row },
      { upsert: true }
    );

    if (result.upsertedCount) inserted++;
    else updated++;
  }

  return { inserted, updated, skipped, total: records.length };
};

const imageSummary = async () => {
  const [summary] = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        withPrimaryImage: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$primaryImage", ""] }, { $ne: ["$primaryImage", null] }] },
              1,
              0,
            ],
          },
        },
        websiteMatched: {
          $sum: { $cond: [{ $eq: ["$imageStatus", "WEBSITE_IMAGE_MATCHED"] }, 1, 0] },
        },
        categoryBestMatch: {
          $sum: { $cond: [{ $eq: ["$imageStatus", "CATEGORY_BEST_MATCH"] }, 1, 0] },
        },
        noImage: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$primaryImage", ""] }, { $eq: ["$primaryImage", null] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    summary || {
      totalProducts: 0,
      withPrimaryImage: 0,
      websiteMatched: 0,
      categoryBestMatch: 0,
      noImage: 0,
    }
  );
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySku,
  getProductByBarcode,
  getProductDetailBySku,
  createProduct,
  updateProduct,
  updateProductBySku,
  deleteProduct,
  list,
  getById,
  bulkUpsert,
  imageSummary,
};
