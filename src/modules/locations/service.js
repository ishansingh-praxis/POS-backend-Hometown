const Location = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.siteCode) filter.siteCode = String(query.siteCode);
  if (query.storeCode) filter.storeCode = String(query.storeCode);
  if (query.locationType) filter.locationType = query.locationType;
  if (query.city) filter.city = new RegExp(query.city, "i");
  if (query.region) filter.region = new RegExp(query.region, "i");
  if (query.isPosEnabled) filter.isPosEnabled = query.isPosEnabled === "true";
  if (query.status) filter.status = query.status;

  if (query.search || query.q) {
    const rx = new RegExp(query.search || query.q, "i");
    filter.$or = [
      { siteCode: rx },
      { siteName: rx },
      { storeName: rx },
      { city: rx },
      { region: rx },
    ];
  }

  return filter;
};

const list = async (query = {}) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 500);
  const filter = buildFilter(query);

  const [items, total] = await Promise.all([
    Location.find(filter).sort({ siteName: 1 }).skip((page - 1) * limit).limit(limit),
    Location.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

const getById = async (id) => {
  return Location.findOne({
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      { locationId: id },
      { siteCode: id },
      { storeCode: id },
    ].filter((x) => Object.values(x)[0] !== undefined),
  });
};

const bulkUpsert = async (records = []) => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of records) {
    if (!row.siteCode) {
      skipped++;
      continue;
    }

    const result = await Location.updateOne(
      { siteCode: String(row.siteCode) },
      { $set: row },
      { upsert: true }
    );

    if (result.upsertedCount) inserted++;
    else updated++;
  }

  return { inserted, updated, skipped, total: records.length };
};

module.exports = {
  list,
  getById,
  bulkUpsert,
};
