require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const connectDB = require("../../config/db");
const DsrSalesFact = require("./dsrSalesFact.model");

const FILE_PATH =
  process.argv[2] ||
  path.join(
    __dirname,
    "../../../data/dsr/Article_wise_HT_Jun_DSR_2026_BASE_data.tsv.txt"
  );

const SOURCE_FILE = "Article-wise HT Jun DSR 2026";

const moneyFields = new Set([
  "Val",
  "Net Sale w/o tax",
  "Tax Val",
  "Gross Val",
  "COGS",
  "Discount",
  "Margin Val",
]);

const clean = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const toNumber = (value) => {
  const text = clean(value).replace(/,/g, "");
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
};

const toMoney = (value) => {
  const n = toNumber(value);
  return Math.round(n * 100000 * 100) / 100;
};

const toDate = (value) => {
  const text = clean(value);
  if (!text) return { date: null, str: "" };

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return {
      date: new Date(`${text}T00:00:00.000Z`),
      str: text,
    };
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const str = parsed.toISOString().slice(0, 10);
    return {
      date: new Date(`${str}T00:00:00.000Z`),
      str,
    };
  }

  return { date: null, str: text };
};

const normalizeDocType = (value) => {
  const text = clean(value);
  const upper = text.toUpperCase();

  if (upper.includes("OTC")) return "OTC";
  if (upper.includes("BOOK")) return "SO_BOOKING";
  if (upper.includes("CANCEL")) return "SO_CANCEL";
  if (upper.includes("RETURN")) return "RETURN";
  if (upper.includes("YF2")) return "YF2";
  if (upper.includes("FF2")) return "FF2";
  if (upper.includes("YRN2")) return "YRN2";
  if (upper.includes("ZSC")) return "ZSC";

  return text || "UNKNOWN";
};

const normalizeRow = (row) => {
  const dateInfo = toDate(row["Date"]);
  const article = clean(row["Article"]);
  const customerId = clean(row["Customer Id"]);

  return {
    sourceFile: SOURCE_FILE,
    storeCode: clean(row["Site Code"]),
    storeName: clean(row["Name"]),
    concept: clean(row["Concept"]),
    city: clean(row["City"]),
    zone: clean(row["Zone"]),
    storeType: clean(row["Type"]),
    salesDoc: clean(row["Sales Doc"]),
    businessDate: dateInfo.date,
    businessDateStr: dateInfo.str,
    day: clean(row["Day"]),
    finWeek: clean(row["Fin Week"]),
    mc: clean(row["MC"]),
    category: clean(row["Desp"]),
    article,
    sku: article,
    articleDescription: clean(row["Article Des"]),
    qty: toNumber(row["Qty"]),
    val: toMoney(row["Val"]),
    grossValue: toMoney(row["Gross Val"]) || toMoney(row["Val"]),
    netSaleWithoutTax: toMoney(row["Net Sale w/o tax"]),
    taxValue: toMoney(row["Tax Val"]),
    cogs: toMoney(row["COGS"]),
    discount: toMoney(row["Discount"]),
    marginValue: toMoney(row["Margin Val"]),
    source: clean(row["SOURCE"]),
    docType: normalizeDocType(row["Doc Type"]),
    sourceType: clean(row["Source1"]),
    lob: clean(row["LOB"]),
    newLob: clean(row["New LOB"]),
    className: clean(row["Class"]),
    subClass: clean(row["Sub Class"]),
    brand: clean(row["Brand"]),
    mainParent: clean(row["Main Parent"]),
    customerName: clean(row["Customer Name"]),
    customerId,
    customerPhone: customerId,
    deliverySite: clean(row["Del Site"]),
    assortmentStatus: clean(row["Assortment Status"]),
    remark: clean(row["Remark"]),
    marketplace: clean(row["Mrkplc"]),
    liquidation: clean(row["Liquidation"]),
    externalItem: clean(row["EXT Item"]),
    raw: row,
  };
};

const run = async () => {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`DSR file not found: ${FILE_PATH}`);
  }

  await connectDB();

  const stream = fs.createReadStream(FILE_PATH, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let headers = [];
  let lineNo = 0;
  let batch = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const flush = async () => {
    if (!batch.length) return;

    const ops = batch.map((doc) => ({
      updateOne: {
        filter: {
          sourceFile: doc.sourceFile,
          salesDoc: doc.salesDoc,
          storeCode: doc.storeCode,
          sku: doc.sku,
          businessDateStr: doc.businessDateStr,
          qty: doc.qty,
          grossValue: doc.grossValue,
        },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const result = await DsrSalesFact.bulkWrite(ops, { ordered: false });
    inserted += result.upsertedCount || 0;
    updated += result.modifiedCount || 0;
    batch = [];
  };

  for await (const line of rl) {
    lineNo++;

    if (!line.trim()) continue;

    const cols = line.split("\t").map(clean);

    if (!headers.length) {
      headers = cols;
      continue;
    }

    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });

    const doc = normalizeRow(row);

    if (
      !doc.salesDoc ||
      !doc.sku ||
      !doc.storeCode ||
      !doc.businessDateStr
    ) {
      skipped++;
      continue;
    }

    batch.push(doc);

    if (batch.length >= 1000) {
      await flush();
      console.log(`Processed ${lineNo} lines...`);
    }
  }

  await flush();

  const total = await DsrSalesFact.countDocuments({
    sourceFile: SOURCE_FILE,
  });

  console.log("DSR import completed");
  console.log({
    inserted,
    updated,
    skipped,
    totalInCollection: total,
  });

  process.exit(0);
};

run().catch((error) => {
  console.error("DSR import failed:", error);
  process.exit(1);
});
