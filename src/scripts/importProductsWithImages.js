require("dotenv").config();

const fs = require("fs");
const path = require("path");
const connectDB = require("../config/db");
const Product = require("../modules/products/model");

const filePath =
  process.argv[2] ||
  path.join(__dirname, "../../data/pos_products_with_best_match_images.json");

const readJson = () => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const normalizeProduct = (row = {}) => {
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
    sku: String(row.sku || row.articleNo || "").trim(),
    articleNo: String(row.articleNo || row.sku || "").trim(),
    primaryImage: primary,
    thumbnailImage: thumbnail,
    images,
    imageStatus: row.imageStatus || (primary ? "CATEGORY_BEST_MATCH" : "NO_IMAGE"),
  };
};

const run = async () => {
  try {
    await connectDB();

    const rows = readJson();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const raw of rows) {
      const row = normalizeProduct(raw);

      if (!row.sku) {
        skipped++;
        continue;
      }

      const result = await Product.updateOne(
        { sku: row.sku },
        { $set: row },
        { upsert: true }
      );

      if (result.upsertedCount) inserted++;
      else updated++;
    }

    const noImage = await Product.countDocuments({
      $or: [
        { primaryImage: { $exists: false } },
        { primaryImage: "" },
        { primaryImage: null },
      ],
    });

    console.log("Products with images import completed");
    console.log({
      inserted,
      updated,
      skipped,
      total: rows.length,
      noImage,
    });

    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
};

run();
