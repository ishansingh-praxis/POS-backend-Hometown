const Category = require("./model");
const Inventory = require("../inventories/model");

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.level) filter.level = query.level;
  if (query.parentId) filter.parentId = query.parentId;
  if (query.parentSlug) filter.parentSlug = query.parentSlug;
  if (query.lob) filter.lob = new RegExp(query.lob, "i");
  if (query.status) filter.status = query.status;

  if (query.visibleOnPos === "true") filter.isVisibleOnPos = true;
  if (query.visibleOnWebsite === "true") filter.isVisibleOnWebsite = true;

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { name: rx },
      { slug: rx },
      { lob: rx },
      { mercCategory: rx },
      { parentName: rx },
    ];
  }

  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);

  const filter = buildFilter(query);

  const [items, total] = await Promise.all([
    Category.find(filter)
      .sort({ level: 1, sortOrder: 1, totalMapValue: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Category.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const getById = async (id) => {
  return Category.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { categoryId: id },
      { slug: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });
};

const generateFromInventory = async () => {
  await Category.deleteMany({ sourceSystem: "SAP_ATP" });

  const lobAgg = await Inventory.aggregate([
    { $match: { status: "ACTIVE" } },
    {
      $group: {
        _id: "$lob",
        productSkus: { $addToSet: "$sku" },
        inventoryRows: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        storeAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "Store"] }, "$atpQty", 0],
          },
        },
        rdcAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "RDC"] }, "$atpQty", 0],
          },
        },
        mdcAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "MDC"] }, "$atpQty", 0],
          },
        },
        totalMapValue: { $sum: "$mapValue" },
        totalMrpValue: { $sum: "$stockValueMrp" },
        lowStockCount: {
          $sum: {
            $cond: [
              { $in: ["$stockStatus", ["LOW_STOCK", "LIMITED_STOCK"]] },
              1,
              0,
            ],
          },
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "OUT_OF_STOCK"] }, 1, 0] },
        },
        brands: { $addToSet: "$brand" },
      },
    },
    { $sort: { totalMapValue: -1 } },
  ]);

  const lobDocs = [];

  for (let i = 0; i < lobAgg.length; i++) {
    const row = lobAgg[i];
    const name = row._id || "Uncategorized";
    const slug = slugify(name);

    lobDocs.push({
      categoryId: `LOB-${slug.toUpperCase()}`,
      name,
      slug,
      level: "LOB",
      lob: name,
      productCount: row.productSkus.length,
      inventoryRows: row.inventoryRows,
      totalStockQty: row.totalStockQty,
      totalAtpQty: row.totalAtpQty,
      storeAtpQty: row.storeAtpQty,
      rdcAtpQty: row.rdcAtpQty,
      mdcAtpQty: row.mdcAtpQty,
      totalMapValue: row.totalMapValue,
      totalMrpValue: row.totalMrpValue,
      lowStockCount: row.lowStockCount,
      outOfStockCount: row.outOfStockCount,
      brands: row.brands.filter(Boolean),
      sortOrder: i + 1,
      sourceSystem: "SAP_ATP",
      status: "ACTIVE",
    });
  }

  if (lobDocs.length) {
    await Category.insertMany(lobDocs);
  }

  const catAgg = await Inventory.aggregate([
    { $match: { status: "ACTIVE" } },
    {
      $group: {
        _id: {
          lob: "$lob",
          category: "$category",
        },
        productSkus: { $addToSet: "$sku" },
        inventoryRows: { $sum: 1 },
        totalStockQty: { $sum: "$stockQty" },
        totalAtpQty: { $sum: "$atpQty" },
        storeAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "Store"] }, "$atpQty", 0],
          },
        },
        rdcAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "RDC"] }, "$atpQty", 0],
          },
        },
        mdcAtpQty: {
          $sum: {
            $cond: [{ $eq: ["$locationType", "MDC"] }, "$atpQty", 0],
          },
        },
        totalMapValue: { $sum: "$mapValue" },
        totalMrpValue: { $sum: "$stockValueMrp" },
        lowStockCount: {
          $sum: {
            $cond: [
              { $in: ["$stockStatus", ["LOW_STOCK", "LIMITED_STOCK"]] },
              1,
              0,
            ],
          },
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ["$stockStatus", "OUT_OF_STOCK"] }, 1, 0] },
        },
        brands: { $addToSet: "$brand" },
      },
    },
    { $sort: { totalMapValue: -1 } },
  ]);

  const catDocs = [];

  for (let i = 0; i < catAgg.length; i++) {
    const row = catAgg[i];
    const lob = row._id.lob || "Uncategorized";
    const name = row._id.category || "Uncategorized";
    const lobSlug = slugify(lob);
    const catSlug = slugify(name);
    const slug = `${lobSlug}/${catSlug}`;

    catDocs.push({
      categoryId: `CAT-${lobSlug.toUpperCase()}-${catSlug.toUpperCase()}`,
      name,
      slug,
      level: "CATEGORY",
      parentId: `LOB-${lobSlug.toUpperCase()}`,
      parentName: lob,
      parentSlug: lobSlug,
      lob,
      mercCategory: name,
      productCount: row.productSkus.length,
      inventoryRows: row.inventoryRows,
      totalStockQty: row.totalStockQty,
      totalAtpQty: row.totalAtpQty,
      storeAtpQty: row.storeAtpQty,
      rdcAtpQty: row.rdcAtpQty,
      mdcAtpQty: row.mdcAtpQty,
      totalMapValue: row.totalMapValue,
      totalMrpValue: row.totalMrpValue,
      lowStockCount: row.lowStockCount,
      outOfStockCount: row.outOfStockCount,
      brands: row.brands.filter(Boolean),
      sortOrder: i + 1,
      sourceSystem: "SAP_ATP",
      status: "ACTIVE",
    });
  }

  if (catDocs.length) {
    await Category.insertMany(catDocs);
  }

  return {
    lobCategories: lobDocs.length,
    productCategories: catDocs.length,
    total: lobDocs.length + catDocs.length,
  };
};

const update = async (id, payload = {}) => {
  const cat = await getById(id);

  if (!cat) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return Category.findByIdAndUpdate(cat._id, { $set: payload }, { new: true });
};

module.exports = {
  list,
  getById,
  generateFromInventory,
  update,
};
