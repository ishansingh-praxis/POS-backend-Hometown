require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const CouponCode = require("../modules/couponCodes/model");
const CouponCampaign = require("../modules/couponCodes/campaign.model");
const CouponRedemptionLog = require("../modules/couponCodes/redemptionLog.model");
const CouponFailedAttempt = require("../modules/couponCodes/failedAttempt.model");

const dataDir = path.join(__dirname, "../../data");

const readJson = (fileName) => {
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`${fileName} not found. Skipping.`);
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const normalizeId = (record) => {
  const copy = { ...record };

  if (
    copy._id &&
    copy._id.$oid &&
    mongoose.Types.ObjectId.isValid(copy._id.$oid)
  ) {
    copy._id = copy._id.$oid;
  } else if (
    copy._id &&
    typeof copy._id === "string" &&
    mongoose.Types.ObjectId.isValid(copy._id)
  ) {
    copy._id = copy._id;
  } else {
    delete copy._id;
  }

  delete copy.__v;
  return copy;
};

const importCollection = async ({
  model,
  fileName,
  uniqueKey,
  label,
  skipSamples = false
}) => {
  const rows = readJson(fileName)
    .map(normalizeId)
    .filter((row) => {
      if (!skipSamples) return true;
      return row.status !== "SAMPLE_NOT_IMPORTED";
    });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row[uniqueKey]) {
      skipped++;
      continue;
    }

    const existing = await model.findOne({
      [uniqueKey]: row[uniqueKey]
    });

    if (existing) {
      const copy = { ...row };
      delete copy._id;

      await model.updateOne(
        { _id: existing._id },
        {
          $set: copy
        }
      );

      updated++;
    } else {
      await model.create(row);
      inserted++;
    }
  }

  console.log(`${label}: inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
};

const run = async () => {
  try {
    await connectDB();

    await importCollection({
      model: CouponCode,
      fileName: "coupon_codes.json",
      uniqueKey: "offerCode",
      label: "Coupon Codes"
    });

    await importCollection({
      model: CouponCampaign,
      fileName: "coupon_campaigns.json",
      uniqueKey: "campaignCode",
      label: "Coupon Campaigns"
    });

    await importCollection({
      model: CouponRedemptionLog,
      fileName: "coupon_redemption_logs.json",
      uniqueKey: "redemptionLogId",
      label: "Coupon Redemption Logs",
      skipSamples: true
    });

    await importCollection({
      model: CouponFailedAttempt,
      fileName: "coupon_failed_attempts.json",
      uniqueKey: "failedAttemptId",
      label: "Coupon Failed Attempts",
      skipSamples: true
    });

    console.log("Coupon import completed.");
    process.exit(0);
  } catch (error) {
    console.error("Coupon import failed:", error);
    process.exit(1);
  }
};

run();
