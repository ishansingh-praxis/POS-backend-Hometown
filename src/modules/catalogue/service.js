const Store = require("../stores/model");
const Category = require("../categories/model");
const Product = require("../products/model");
const Inventory = require("../inventories/model");
const Offer = require("../offers/model");
const Discount = require("../discounts/model");
const Coupon = require("../coupons/model");
const PriceHistory = require("../priceHistory/model");

const getCatalogueSummary = async () => {
  const [
    totalStores,
    totalCategories,
    totalProducts,
    totalInventoryRows,
    totalOffers,
    totalDiscounts,
    totalCoupons,
    lowStockCount,
    outOfStockCount
  ] = await Promise.all([
    Store.countDocuments({}),
    Category.countDocuments({}),
    Product.countDocuments({}),
    Inventory.countDocuments({}),
    Offer.countDocuments({}),
    Discount.countDocuments({}),
    Coupon.countDocuments({}),
    Inventory.countDocuments({ stockStatus: "LOW_STOCK" }),
    Inventory.countDocuments({ stockStatus: "OUT_OF_STOCK" })
  ]);

  return {
    totalStores,
    totalCategories,
    totalProducts,
    totalInventoryRows,
    totalOffers,
    totalDiscounts,
    totalCoupons,
    lowStockCount,
    outOfStockCount
  };
};

const getFullCatalogue = async () => {
  const [
    stores,
    categories,
    products,
    offers,
    discounts,
    coupons
  ] = await Promise.all([
    Store.find({}).sort({ storeCode: 1 }),
    Category.find({}).sort({ name: 1 }),
    Product.find({}).sort({ productName: 1 }).limit(500),
    Offer.find({}),
    Discount.find({}).limit(500),
    Coupon.find({})
  ]);

  return {
    stores,
    categories,
    products,
    offers,
    discounts,
    coupons
  };
};

const getStoreCatalogue = async (storeCode) => {
  const store = await Store.findOne({ storeCode });

  if (!store) {
    return null;
  }

  const inventory = await Inventory.find({ storeCode });

  const skus = inventory
    .map((item) => item.sku)
    .filter(Boolean);

  const products = await Product.find({
    sku: { $in: skus }
  });

  const offers = await Offer.find({
    $or: [
      { applicableStoreCodes: storeCode },
      { applicableStoreCodes: { $in: [storeCode] } },
      { applicableStoreCodes: { $exists: false } }
    ]
  });

  const discounts = await Discount.find({
    $or: [
      { applicableStoreCodes: storeCode },
      { applicableStoreCodes: { $in: [storeCode] } },
      { applicableStoreCodes: { $exists: false } }
    ]
  });

  return {
    store,
    products,
    inventory,
    offers,
    discounts
  };
};

const getProductCatalogue = async (sku) => {
  const product = await Product.findOne({ sku });

  if (!product) {
    return null;
  }

  const [
    inventory,
    discounts,
    offers,
    priceHistory
  ] = await Promise.all([
    Inventory.find({ sku }).sort({ storeCode: 1 }),

    Discount.find({
      $or: [
        { sku },
        { productId: product.productId },
        { mainCategory: product.mainCategory },
        { category: product.category },
        { subcategory: product.subcategory }
      ]
    }),

    Offer.find({
      $or: [
        { applicableMainCategory: product.mainCategory },
        { applicableSubcategory: product.subcategory }
      ]
    }),

    PriceHistory.find({ sku }).sort({ createdAt: -1 })
  ]);

  return {
    product,
    inventory,
    discounts,
    offers,
    priceHistory
  };
};

const searchCatalogue = async (query = {}) => {
  const q = query.q || "";

  const search = new RegExp(q, "i");

  const [products, stores, categories] = await Promise.all([
    Product.find({
      $or: [
        { productName: search },
        { sku: search },
        { barcode: search },
        { mainCategory: search },
        { category: search },
        { subcategory: search }
      ]
    }).limit(50),

    Store.find({
      $or: [
        { storeCode: search },
        { storeName: search },
        { city: search },
        { region: search }
      ]
    }).limit(20),

    Category.find({
      $or: [
        { name: search },
        { slug: search }
      ]
    }).limit(20)
  ]);

  return {
    products,
    stores,
    categories
  };
};

module.exports = {
  getCatalogueSummary,
  getFullCatalogue,
  getStoreCatalogue,
  getProductCatalogue,
  searchCatalogue
};
