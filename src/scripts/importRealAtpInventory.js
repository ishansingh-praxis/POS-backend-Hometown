require("dotenv").config();

const fs = require("fs");
const path = require("path");
const connectDB = require("../config/db");

const Inventory = require("../modules/inventories/model");
const Product = require("../modules/products/model");
const Location = require("../modules/locations/model");
const categoryService = require("../modules/categories/service");

const dataDir = path.join(__dirname, "../../data");

const readJson = (fileName) => {
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`${fileName} not found in data folder`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const importRows = async ({ model, fileName, keys, label }) => {
  const rows = readJson(fileName);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const filter = {};

    for (const key of keys) {
      if (!row[key]) {
        skipped++;
        continue;
      }

      filter[key] = String(row[key]);
    }

    if (!Object.keys(filter).length) {
      skipped++;
      continue;
    }

    const result = await model.updateOne(
      filter,
      { $set: row },
      { upsert: true }
    );

    if (result.upsertedCount) inserted++;
    else updated++;
  }

  console.log(`${label}: inserted=${inserted}, updated=${updated}, skipped=${skipped}, total=${rows.length}`);
};

const run = async () => {
  try {
    await connectDB();

    await importRows({
      model: Product,
      fileName: "products.json",
      keys: ["sku"],
      label: "Products",
    });

    await importRows({
      model: Inventory,
      fileName: "inventories.json",
      keys: ["siteCode", "sku"],
      label: "Inventories",
    });

    await importRows({
      model: Location,
      fileName: "locations.json",
      keys: ["siteCode"],
      label: "Locations",
    });

    const categoryResult = await categoryService.generateFromInventory();
    console.log("Categories generated:", categoryResult);

    console.log("Real ATP inventory import completed.");
    process.exit(0);
  } catch (error) {
    console.error("Real ATP inventory import failed:", error);
    process.exit(1);
  }
};

run();
