require("dotenv").config();
const connectDB = require("../config/db");
const Product = require("../modules/products/model");
const Store = require("../modules/stores/model");
const Inventory = require("../modules/inventories/model");

const hash = (s) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const buildRow = (product, store) => {
  const h = hash(`${store.storeCode}-${product.sku}`);
  const outOfStock = h % 10 === 0; // ~10% out of stock
  const availableQty = outOfStock ? 0 : 2 + (h % 24); // 2-25
  const minimumStockLevel = 3;
  const maximumStockLevel = 25;

  let stockStatus = "IN_STOCK";
  if (availableQty <= 0) stockStatus = "OUT_OF_STOCK";
  else if (availableQty <= minimumStockLevel) stockStatus = "LOW_STOCK";

  return {
    inventoryId: `INV-${store.storeCode}-${product.sku}`,
    storeCode: store.storeCode,
    storeName: store.storeName,
    city: store.city,
    state: store.state,
    region: store.region,
    zone: store.zone,
    productId: product.productId,
    sku: product.sku,
    barcode: product.barcode,
    productName: product.productName,
    mainCategory: product.mainCategory,
    category: product.category,
    subcategory: product.subcategory,
    availableQty,
    reservedQty: 0,
    displayQty: outOfStock ? 0 : 1,
    damagedQty: 0,
    soldQty: h % 8,
    inTransitQty: 0,
    warehouseQty: h % 10,
    minimumStockLevel,
    maximumStockLevel,
    stockStatus,
    lastStockInDate: new Date().toISOString().slice(0, 10),
    lastUpdated: new Date()
  };
};

(async () => {
  await connectDB();

  const products = await Product.find({}).lean();
  const stores = await Store.find({}).lean();

  console.log(`Products: ${products.length}, Stores: ${stores.length}`);

  const rows = [];
  for (const store of stores) {
    for (const product of products) {
      rows.push(buildRow(product, store));
    }
  }

  await Inventory.deleteMany({});
  await Inventory.insertMany(rows, { ordered: false });

  console.log(`Inventory rows inserted: ${rows.length}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
