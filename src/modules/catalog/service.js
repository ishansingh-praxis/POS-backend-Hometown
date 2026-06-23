const Inventory = require("../inventories/model");
const Category = require("../categories/model");

const buildCatalogFilter = (query = {}, user = null) => {
  const filter = {
    status: "ACTIVE",
  };

  if (query.storeCode) filter.storeCode = String(query.storeCode);
  if (query.siteCode) filter.siteCode = String(query.siteCode);
  if (query.locationType) filter.locationType = query.locationType;
  if (query.lob) filter.lob = new RegExp(query.lob, "i");
  if (query.category) filter.category = new RegExp(query.category, "i");
  if (query.brand) filter.brand = new RegExp(query.brand, "i");
  if (query.stockStatus) filter.stockStatus = query.stockStatus;

  if (query.posOnly === "true" || query.channel === "POS") {
    filter.locationType = "Store";
    filter.isPosEnabled = true;
    filter.atpQty = { $gt: 0 };
  }

  if (query.websiteOnly === "true" || query.channel === "WEBSITE") {
    filter.atpQty = { $gt: 0 };
  }

  if (query.minPrice || query.maxPrice) {
    filter.map = {};
    if (query.minPrice) filter.map.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.map.$lte = Number(query.maxPrice);
  }

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { productName: rx },
      { articleDescription: rx },
      { sku: rx },
      { articleNo: rx },
      { brand: rx },
      { category: rx },
      { lob: rx },
    ];
  }

  if (user?.role === "CASHIER") {
    filter.storeCode = user.storeCode;
    filter.locationType = "Store";
    filter.isPosEnabled = true;
  }

  if (user?.role === "MANAGER") {
    filter.storeCode = user.storeCode;
  }

  return filter;
};

const listCatalog = async (query = {}, user = null) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);

  const filter = buildCatalogFilter(query, user);

  const sort = {};
  if (query.sortBy === "priceLow") sort.map = 1;
  else if (query.sortBy === "priceHigh") sort.map = -1;
  else if (query.sortBy === "stock") sort.atpQty = -1;
  else if (query.sortBy === "value") sort.mapValue = -1;
  else sort.productName = 1;

  // Inventory carries stock/price per store; product images (and the richer
  // product description) live on the products collection, keyed by sku.
  const [rows, total] = await Promise.all([
    Inventory.aggregate([
      { $match: filter },
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "sku",
          foreignField: "sku",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          primaryImage: { $ifNull: ["$product.primaryImage", "$primaryImage"] },
          thumbnailImage: { $ifNull: ["$product.thumbnailImage", "$thumbnailImage"] },
          productImages: { $ifNull: ["$product.images", "$images"] },
          imageStatus: { $ifNull: ["$product.imageStatus", "$imageStatus"] },
          imageMatchType: { $ifNull: ["$product.imageMatchType", "$imageMatchType"] },
          imageMatchConfidence: { $ifNull: ["$product.imageMatchConfidence", "$imageMatchConfidence"] },
          websiteCompare: "$product.websiteCompare",
          productDescription: { $ifNull: ["$product.description", "$articleDescription"] },
        },
      },
    ]),
    Inventory.countDocuments(filter),
  ]);

  const catalogItems = rows.map((x) => {
    const mrp = Number(x.mrp || 0);
    const sellingPrice = Number(x.map || x.mrp || 0);
    const primaryImage = x.primaryImage || x.thumbnailImage || (x.productImages || [])[0] || "";
    const images = Array.isArray(x.productImages) && x.productImages.length
      ? x.productImages
      : primaryImage
      ? [primaryImage]
      : [];

    return {
      catalogId: `CATALOG-${x.storeCode}-${x.sku}`,
      inventoryId: x.inventoryId,

      productId: x.productId,
      sku: x.sku,
      articleNo: x.articleNo,

      productName: x.productName,
      articleDescription: x.articleDescription,
      description: x.productDescription,

      brand: x.brand,
      category: x.category,
      mercCategory: x.mercCategory,
      lob: x.lob,

      siteCode: x.siteCode,
      siteName: x.siteName,
      storeCode: x.storeCode,
      storeName: x.storeName,
      locationType: x.locationType,

      mrp,
      map: Number(x.map || 0),
      sellingPrice,
      discountAmount: Math.max(mrp - sellingPrice, 0),
      discountPercent: mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,

      stockQty: x.stockQty,
      atpQty: x.atpQty,
      availableQty: x.availableQty,
      stockStatus: x.stockStatus,

      isSellable:
        x.locationType === "Store" &&
        x.isPosEnabled === true &&
        Number(x.atpQty || 0) > 0,

      // Never blank: primaryImage falls back through thumbnail -> first images[] entry.
      image: primaryImage,
      primaryImage,
      thumbnailImage: x.thumbnailImage || primaryImage,
      images,

      imageStatus: x.imageStatus || "NO_IMAGE",
      imageMatchType: x.imageMatchType || "",
      imageMatchConfidence: x.imageMatchConfidence || "",
      websiteCompare: x.websiteCompare || {},

      sourceSystem: x.sourceSystem,
    };
  });

  return {
    items: catalogItems,
    total,
    page,
    limit,
  };
};

const getCatalogItem = async (id, query = {}, user = null) => {
  const filter = buildCatalogFilter(query, user);

  filter.$or = [
    { inventoryId: id },
    { sku: id },
    { articleNo: id },
    { productId: id },
  ];

  return Inventory.findOne(filter);
};

const catalogFilters = async (query = {}, user = null) => {
  const filter = buildCatalogFilter(query, user);

  const [lobs, categories, brands, price] = await Promise.all([
    Inventory.distinct("lob", filter),
    Inventory.distinct("category", filter),
    Inventory.distinct("brand", filter),
    Inventory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$map" },
          maxPrice: { $max: "$map" },
          minMrp: { $min: "$mrp" },
          maxMrp: { $max: "$mrp" },
        },
      },
    ]),
  ]);

  return {
    lobs: lobs.filter(Boolean).sort(),
    categories: categories.filter(Boolean).sort(),
    brands: brands.filter(Boolean).sort(),
    price: price[0] || {
      minPrice: 0,
      maxPrice: 0,
      minMrp: 0,
      maxMrp: 0,
    },
  };
};

const homeCatalog = async (query = {}, user = null) => {
  const baseQuery = {
    ...query,
    posOnly: query.posOnly || "true",
  };

  const [topCategories, featured, lowStock, living, bedroom, dining] =
    await Promise.all([
      Category.find({ level: "CATEGORY", status: "ACTIVE" })
        .sort({ totalMapValue: -1 })
        .limit(12),

      listCatalog({ ...baseQuery, sortBy: "value", limit: 20 }, user),

      listCatalog(
        {
          ...baseQuery,
          stockStatus: "LIMITED_STOCK",
          sortBy: "stock",
          limit: 20,
        },
        user
      ),

      listCatalog({ ...baseQuery, lob: "LIVING", limit: 20 }, user),
      listCatalog({ ...baseQuery, lob: "BEDROOM", limit: 20 }, user),
      listCatalog({ ...baseQuery, lob: "DINING", limit: 20 }, user),
    ]);

  return {
    topCategories,
    featured: featured.items,
    lowStockDeals: lowStock.items,
    living: living.items,
    bedroom: bedroom.items,
    dining: dining.items,
  };
};

module.exports = {
  listCatalog,
  getCatalogItem,
  catalogFilters,
  homeCatalog,
};
