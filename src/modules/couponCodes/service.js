const CouponCode = require("./model");
const CouponCampaign = require("./campaign.model");
const CouponRedemptionLog = require("./redemptionLog.model");
const CouponFailedAttempt = require("./failedAttempt.model");

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
};

// Non-admin users are always scoped to their own store, regardless of any
// storeCode the client tries to pass; admins browse whatever store they ask for.
const resolveScopedStoreCode = (query = {}, user = null) => {
  if (user && user.role !== "ADMIN" && user.storeCode) return user.storeCode;
  return query.storeCode || null;
};

const buildCouponFilter = (query = {}, user = null) => {
  const filter = {};
  const andConditions = [];

  if (query.offerCode) filter.offerCode = String(query.offerCode).toUpperCase();
  if (query.campaignCode) filter.campaignCode = query.campaignCode;
  if (query.campaignType) filter.campaignType = query.campaignType;
  if (query.status) filter.status = query.status;

  if (query.availed !== undefined) {
    filter.availed = query.availed === "true" || query.availed === true;
  }

  // CouponCode documents default storeCode to "ALL" for network-wide bank
  // offers, so a store-scoped view must match the store OR "ALL" — a plain
  // equality filter silently hides every network-wide offer.
  const scopedStoreCode = resolveScopedStoreCode(query, user);
  if (scopedStoreCode) {
    andConditions.push({ $or: [{ storeCode: scopedStoreCode }, { storeCode: "ALL" }] });
  }

  if (query.q) {
    const search = new RegExp(query.q, "i");
    andConditions.push({
      $or: [
        { offerCode: search },
        { campaignCode: search },
        { campaignName: search },
        { storeCode: search },
        { storeName: search },
        { availedByCustomerPhone: search },
        { availedOrderId: search },
        { availedInvoiceId: search }
      ]
    });
  }

  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }

  return filter;
};

const calculateDiscount = (coupon, billAmount) => {
  const amount = Number(billAmount || 0);

  if (coupon.discountType === "FLAT") {
    return Math.min(
      Number(coupon.discountValue || 0),
      Number(coupon.maximumDiscountAmount || coupon.discountValue || 0),
      amount
    );
  }

  const percentDiscount = Math.round(
    (amount * Number(coupon.discountValue || 0)) / 100
  );

  const cap = Number(coupon.maximumDiscountAmount || percentDiscount);

  return Math.min(percentDiscount, cap, amount);
};

const logFailedAttempt = async ({
  offerCode,
  storeCode,
  storeName,
  customerPhone,
  billAmount,
  paymentMode,
  bankName,
  cashierId,
  cashierName,
  reason
}) => {
  return CouponFailedAttempt.create({
    failedAttemptId: generateId("CFA"),
    offerCode,
    storeCode,
    storeName,
    customerPhone,
    billAmount,
    paymentMode,
    bankName,
    cashierId,
    cashierName,
    reason,
    status: "FAILED"
  });
};

const validateCoupon = async (payload = {}) => {
  const {
    offerCode,
    storeCode,
    storeName,
    customerPhone,
    billAmount,
    paymentMode,
    bankName,
    cardType,
    cashierId,
    cashierName
  } = payload;

  const code = String(offerCode || "").trim().toUpperCase();

  if (!code) {
    throw new Error("Coupon code is required");
  }

  const coupon = await CouponCode.findOne({ offerCode: code });

  const fail = async (reason, statusCode = 400) => {
    await logFailedAttempt({
      offerCode: code,
      storeCode,
      storeName,
      customerPhone,
      billAmount,
      paymentMode,
      bankName,
      cashierId,
      cashierName,
      reason
    });

    const error = new Error(reason);
    error.statusCode = statusCode;
    throw error;
  };

  if (!coupon) {
    await fail("Invalid coupon code", 404);
  }

  if (coupon.availed || coupon.status === "USED") {
    await fail("Coupon already used");
  }

  if (coupon.status !== "ACTIVE") {
    await fail("Coupon is not active");
  }

  const now = new Date();

  if (coupon.validFrom && now < coupon.validFrom) {
    await fail("Coupon is not valid yet");
  }

  if (coupon.validTo && now > coupon.validTo) {
    await fail("Coupon expired");
  }

  if (coupon.storeCode !== "ALL" && coupon.storeCode !== String(storeCode)) {
    await fail("Coupon is not valid for this store");
  }

  if (Number(billAmount || 0) < Number(coupon.minimumBillAmount || 0)) {
    await fail(
      `Minimum bill amount required is ${coupon.minimumBillAmount}`
    );
  }

  const eligibility = coupon.paymentEligibility || {};
  const allowedModes = eligibility.allowedPaymentModes || [];
  const allowedBanks = eligibility.allowedBanks || [];
  const allowedCardTypes = eligibility.allowedCardTypes || [];

  if (
    allowedModes.length &&
    paymentMode &&
    !allowedModes.includes(paymentMode)
  ) {
    await fail("Coupon is not valid for this payment mode");
  }

  if (
    allowedBanks.length &&
    bankName &&
    !allowedBanks.map(String).includes(String(bankName))
  ) {
    await fail("Coupon is not valid for this bank");
  }

  if (
    allowedCardTypes.length &&
    cardType &&
    !allowedCardTypes.includes(cardType)
  ) {
    await fail("Coupon is not valid for this card type");
  }

  const discountAmount = calculateDiscount(coupon, billAmount);
  const finalPayableAmount = Math.max(
    0,
    Number(billAmount || 0) - discountAmount
  );

  return {
    coupon,
    validation: {
      offerCode: coupon.offerCode,
      campaignCode: coupon.campaignCode,
      campaignName: coupon.campaignName,
      campaignType: coupon.campaignType,
      storeCode: coupon.storeCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumBillAmount: coupon.minimumBillAmount,
      maximumDiscountAmount: coupon.maximumDiscountAmount,
      billAmount: Number(billAmount || 0),
      discountAmount,
      finalPayableAmount,
      valid: true
    }
  };
};

const markAvailed = async (payload = {}) => {
  const {
    offerCode,
    storeCode,
    storeName,
    customerId,
    customerName,
    customerPhone,
    orderId,
    invoiceId,
    billAmount,
    discountAmount,
    finalPayableAmount,
    paymentMode,
    bankName,
    cardType,
    cashierId,
    cashierName
  } = payload;

  const code = String(offerCode || "").trim().toUpperCase();

  const coupon = await CouponCode.findOne({ offerCode: code });

  if (!coupon) {
    const error = new Error("Coupon not found");
    error.statusCode = 404;
    throw error;
  }

  if (coupon.availed) {
    const error = new Error("Coupon already availed");
    error.statusCode = 400;
    throw error;
  }

  const update = {
    availed: true,
    status: "USED",
    availedAt: new Date(),
    availedByCustomerId: customerId,
    availedByCustomerName: customerName,
    availedByCustomerPhone: customerPhone,
    availedStoreCode: storeCode,
    availedStoreName: storeName,
    availedOrderId: orderId,
    availedInvoiceId: invoiceId,
    appliedDiscountAmount: Number(discountAmount || 0),
    billAmountAtRedemption: Number(billAmount || 0),
    finalPayableAmount: Number(finalPayableAmount || 0)
  };

  const updatedCoupon = await CouponCode.findOneAndUpdate(
    {
      offerCode: code,
      availed: false
    },
    {
      $set: update
    },
    {
      new: true
    }
  );

  if (!updatedCoupon) {
    const error = new Error("Coupon could not be marked availed");
    error.statusCode = 409;
    throw error;
  }

  const redemptionLog = await CouponRedemptionLog.create({
    redemptionLogId: generateId("CRL"),
    offerCode: code,
    campaignCode: coupon.campaignCode,
    storeCode,
    storeName,
    customerId,
    customerName,
    customerPhone,
    orderId,
    invoiceId,
    billAmount,
    discountAmount,
    finalPayableAmount,
    paymentMode,
    bankName,
    cardType,
    cashierId,
    cashierName,
    status: "SUCCESS",
    remarks: "Coupon redeemed successfully"
  });

  await refreshCampaignCounts(coupon.campaignCode);

  return {
    coupon: updatedCoupon,
    redemptionLog
  };
};

const releaseCoupon = async (offerCode, payload = {}) => {
  const code = String(offerCode || "").trim().toUpperCase();

  const coupon = await CouponCode.findOneAndUpdate(
    { offerCode: code },
    {
      $set: {
        availed: false,
        status: "ACTIVE",
        availedAt: null,
        availedByCustomerId: null,
        availedByCustomerName: null,
        availedByCustomerPhone: null,
        availedStoreCode: null,
        availedStoreName: null,
        availedOrderId: null,
        availedInvoiceId: null,
        appliedDiscountAmount: 0,
        billAmountAtRedemption: 0,
        finalPayableAmount: 0,
        releaseReason: payload.reason || "Coupon released manually",
        releasedAt: new Date(),
        releasedBy: payload.releasedBy || "ADMIN"
      }
    },
    { new: true }
  );

  if (!coupon) {
    const error = new Error("Coupon not found");
    error.statusCode = 404;
    throw error;
  }

  await refreshCampaignCounts(coupon.campaignCode);

  return coupon;
};

const refreshCampaignCounts = async (campaignCode) => {
  if (!campaignCode) return null;

  const [totalCodes, usedCodes] = await Promise.all([
    CouponCode.countDocuments({ campaignCode }),
    CouponCode.countDocuments({ campaignCode, availed: true })
  ]);

  const unusedCodes = totalCodes - usedCodes;
  const utilizationPercent = totalCodes
    ? Number(((usedCodes / totalCodes) * 100).toFixed(2))
    : 0;

  return CouponCampaign.findOneAndUpdate(
    { campaignCode },
    {
      $set: {
        totalCodes,
        usedCodes,
        unusedCodes,
        utilizationPercent
      }
    },
    {
      new: true
    }
  );
};

const getCouponCodes = async (query = {}, user = null) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 50, 1000);
  const skip = (page - 1) * limit;

  const filter = buildCouponFilter(query, user);

  const [data, total] = await Promise.all([
    CouponCode.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CouponCode.countDocuments(filter)
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

const getCouponByCode = async (offerCode) => {
  return CouponCode.findOne({
    offerCode: String(offerCode).toUpperCase()
  });
};

const getCampaigns = async (query = {}, user = null) => {
  const filter = {};

  if (query.campaignCode) filter.campaignCode = query.campaignCode;
  if (query.campaignType) filter.campaignType = query.campaignType;
  if (query.status) filter.status = query.status;

  // CouponCampaign documents default storeCode to "ALL" for network-wide bank
  // offers, so a store-scoped view must match the store OR "ALL".
  const scopedStoreCode = resolveScopedStoreCode(query, user);
  if (scopedStoreCode) {
    filter.$or = [{ storeCode: scopedStoreCode }, { storeCode: "ALL" }];
  }

  return CouponCampaign.find(filter).sort({ campaignCode: 1 });
};

const getSummary = async (query = {}, user = null) => {
  const filter = buildCouponFilter(query, user);

  // Coupon-code level filters (offerCode/campaignCode/etc.) don't necessarily
  // apply to the redemption-log / failed-attempt collections, which only key
  // off storeCode — so build a narrower filter for those from storeCode alone.
  // These collections record the real store a transaction happened at (no
  // "ALL" sentinel), so exact-match scoping is correct here.
  const logFilter = applyCouponStoreScope({ status: "SUCCESS" }, query, user);
  const failedFilter = applyCouponStoreScope({}, query, user);

  // Campaigns also default storeCode to "ALL" for network-wide offers.
  const campaignMatch = {};
  const summaryScopedStoreCode = resolveScopedStoreCode(query, user);
  if (summaryScopedStoreCode) {
    campaignMatch.$or = [{ storeCode: summaryScopedStoreCode }, { storeCode: "ALL" }];
  }

  const [
    totalCoupons,
    usedCoupons,
    unusedCoupons,
    activeCoupons,
    failedAttempts,
    successfulRedemptions,
    discountAgg,
    campaignBreakup,
    storeBreakup
  ] = await Promise.all([
    CouponCode.countDocuments(filter),
    CouponCode.countDocuments({ ...filter, availed: true }),
    CouponCode.countDocuments({ ...filter, availed: false }),
    CouponCode.countDocuments({ ...filter, status: "ACTIVE" }),
    CouponFailedAttempt.countDocuments(failedFilter),
    CouponRedemptionLog.countDocuments(logFilter),

    CouponRedemptionLog.aggregate([
      { $match: logFilter },
      {
        $group: {
          _id: null,
          totalBillAmount: { $sum: "$billAmount" },
          totalDiscountAmount: { $sum: "$discountAmount" },
          totalFinalPayableAmount: { $sum: "$finalPayableAmount" },
          avgDiscountAmount: { $avg: "$discountAmount" }
        }
      }
    ]),

    CouponCode.aggregate([
      { $match: campaignMatch },
      {
        $group: {
          _id: "$campaignCode",
          campaignName: { $first: "$campaignName" },
          total: { $sum: 1 },
          used: {
            $sum: {
              $cond: ["$availed", 1, 0]
            }
          },
          unused: {
            $sum: {
              $cond: ["$availed", 0, 1]
            }
          }
        }
      },
      {
        $sort: {
          total: -1
        }
      }
    ]),

    CouponRedemptionLog.aggregate([
      { $match: logFilter },
      {
        $group: {
          _id: "$storeCode",
          storeName: { $first: "$storeName" },
          redemptions: { $sum: 1 },
          sales: { $sum: "$billAmount" },
          discount: { $sum: "$discountAmount" },
          payable: { $sum: "$finalPayableAmount" }
        }
      },
      { $sort: { redemptions: -1 } }
    ])
  ]);

  const discount = discountAgg[0] || {};

  return {
    totalCoupons,
    usedCoupons,
    unusedCoupons,
    activeCoupons,
    utilizationPercent: totalCoupons
      ? Number(((usedCoupons / totalCoupons) * 100).toFixed(2))
      : 0,
    failedAttempts,
    successfulRedemptions,
    totalBillAmount: Math.round(discount.totalBillAmount || 0),
    totalDiscountAmount: Math.round(discount.totalDiscountAmount || 0),
    totalFinalPayableAmount: Math.round(discount.totalFinalPayableAmount || 0),
    avgDiscountAmount: Math.round(discount.avgDiscountAmount || 0),
    campaignBreakup,
    storeBreakup
  };
};

const buildAnalyticsDateFilter = (query = {}) => {
  const filter = {};

  if (query.fromDate || query.toDate) {
    filter.createdAt = {};

    if (query.fromDate) {
      filter.createdAt.$gte = new Date(query.fromDate);
    }

    if (query.toDate) {
      filter.createdAt.$lte = new Date(query.toDate);
    }
  }

  return filter;
};

// Redemption logs / failed attempts record the real store a transaction
// happened at — no "ALL" sentinel, so exact-match scoping is correct here.
// A non-admin user's own store always wins over any client-supplied storeCode.
const applyCouponStoreScope = (filter = {}, query = {}, user = null) => {
  const storeCode = resolveScopedStoreCode(query, user);
  if (storeCode) filter.storeCode = storeCode;

  return filter;
};

const getStoreWiseCouponUsage = async (query = {}, user = null) => {
  const filter = applyCouponStoreScope(buildAnalyticsDateFilter(query), query, user);

  return CouponRedemptionLog.aggregate([
    {
      $match: {
        ...filter,
        status: "SUCCESS"
      }
    },
    {
      $group: {
        _id: "$storeCode",
        storeName: {
          $first: "$storeName"
        },
        totalRedemptions: {
          $sum: 1
        },
        totalBillAmount: {
          $sum: "$billAmount"
        },
        totalDiscountAmount: {
          $sum: "$discountAmount"
        },
        totalFinalPayableAmount: {
          $sum: "$finalPayableAmount"
        },
        avgDiscountAmount: {
          $avg: "$discountAmount"
        },
        uniqueCustomers: {
          $addToSet: "$customerPhone"
        },
        campaigns: {
          $addToSet: "$campaignCode"
        }
      }
    },
    {
      $addFields: {
        uniqueCustomerCount: {
          $size: "$uniqueCustomers"
        },
        campaignCount: {
          $size: "$campaigns"
        },
        discountPercentOfSales: {
          $cond: [
            {
              $gt: ["$totalBillAmount", 0]
            },
            {
              $multiply: [
                {
                  $divide: ["$totalDiscountAmount", "$totalBillAmount"]
                },
                100
              ]
            },
            0
          ]
        }
      }
    },
    {
      $project: {
        uniqueCustomers: 0,
        campaigns: 0
      }
    },
    {
      $sort: {
        totalFinalPayableAmount: -1
      }
    }
  ]);
};

const getCampaignPerformance = async (query = {}, user = null) => {
  const couponFilter = {};

  if (query.campaignCode) {
    couponFilter.campaignCode = query.campaignCode;
  }

  // CouponCampaign documents default storeCode to "ALL" for network-wide
  // offers, so a store-scoped view must match the store OR "ALL".
  const performanceScopedStoreCode = resolveScopedStoreCode(query, user);
  if (performanceScopedStoreCode) {
    couponFilter.$or = [
      { storeCode: performanceScopedStoreCode },
      { storeCode: "ALL" }
    ];
  }

  const campaigns = await CouponCampaign.find(couponFilter).sort({
    campaignCode: 1
  });

  const redemptionFilter = buildAnalyticsDateFilter(query);

  if (query.campaignCode) {
    redemptionFilter.campaignCode = query.campaignCode;
  }

  applyCouponStoreScope(redemptionFilter, query, user);

  const redemptionAgg = await CouponRedemptionLog.aggregate([
    {
      $match: {
        ...redemptionFilter,
        status: "SUCCESS"
      }
    },
    {
      $group: {
        _id: "$campaignCode",
        redemptions: {
          $sum: 1
        },
        totalBillAmount: {
          $sum: "$billAmount"
        },
        totalDiscountAmount: {
          $sum: "$discountAmount"
        },
        totalFinalPayableAmount: {
          $sum: "$finalPayableAmount"
        },
        avgDiscountAmount: {
          $avg: "$discountAmount"
        },
        uniqueCustomers: {
          $addToSet: "$customerPhone"
        },
        storesUsed: {
          $addToSet: "$storeCode"
        }
      }
    },
    {
      $addFields: {
        uniqueCustomerCount: {
          $size: "$uniqueCustomers"
        },
        storesUsedCount: {
          $size: "$storesUsed"
        }
      }
    }
  ]);

  const redemptionMap = new Map(
    redemptionAgg.map((row) => [row._id, row])
  );

  return campaigns.map((campaign) => {
    const perf = redemptionMap.get(campaign.campaignCode) || {};

    const totalCodes = Number(campaign.totalCodes || 0);
    const usedCodes = Number(campaign.usedCodes || 0);
    const unusedCodes = Number(campaign.unusedCodes || 0);

    return {
      campaignCode: campaign.campaignCode,
      campaignName: campaign.campaignName,
      campaignType: campaign.campaignType,
      bankName: campaign.bankName,
      storeCode: campaign.storeCode,
      storeName: campaign.storeName,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      minimumBillAmount: campaign.minimumBillAmount,
      maximumDiscountAmount: campaign.maximumDiscountAmount,
      status: campaign.status,
      totalCodes,
      usedCodes,
      unusedCodes,
      utilizationPercent: totalCodes
        ? Number(((usedCodes / totalCodes) * 100).toFixed(2))
        : 0,
      redemptions: perf.redemptions || 0,
      totalBillAmount: Math.round(perf.totalBillAmount || 0),
      totalDiscountAmount: Math.round(perf.totalDiscountAmount || 0),
      totalFinalPayableAmount: Math.round(perf.totalFinalPayableAmount || 0),
      avgDiscountAmount: Math.round(perf.avgDiscountAmount || 0),
      uniqueCustomerCount: perf.uniqueCustomerCount || 0,
      storesUsedCount: perf.storesUsedCount || 0,
      discountToSalesPercent: perf.totalBillAmount
        ? Number(
            (
              (Number(perf.totalDiscountAmount || 0) /
                Number(perf.totalBillAmount || 1)) *
              100
            ).toFixed(2)
          )
        : 0
    };
  });
};

const getFailedAttemptAnalytics = async (query = {}, user = null) => {
  const filter = applyCouponStoreScope(buildAnalyticsDateFilter(query), query, user);

  const [reasonBreakup, storeBreakup, customerBreakup, cashierBreakup, latest] =
    await Promise.all([
      CouponFailedAttempt.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: "$reason",
            attempts: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            attempts: -1
          }
        }
      ]),

      CouponFailedAttempt.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: "$storeCode",
            storeName: {
              $first: "$storeName"
            },
            attempts: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            attempts: -1
          }
        }
      ]),

      CouponFailedAttempt.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: "$customerPhone",
            attempts: {
              $sum: 1
            },
            lastReason: {
              $last: "$reason"
            },
            lastOfferCode: {
              $last: "$offerCode"
            }
          }
        },
        {
          $match: {
            attempts: {
              $gte: 3
            }
          }
        },
        {
          $sort: {
            attempts: -1
          }
        },
        {
          $limit: 20
        }
      ]),

      CouponFailedAttempt.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: "$cashierId",
            cashierName: {
              $first: "$cashierName"
            },
            storeCode: {
              $first: "$storeCode"
            },
            attempts: {
              $sum: 1
            }
          }
        },
        {
          $match: {
            attempts: {
              $gte: 5
            }
          }
        },
        {
          $sort: {
            attempts: -1
          }
        },
        {
          $limit: 20
        }
      ]),

      CouponFailedAttempt.find(filter).sort({ createdAt: -1 }).limit(25)
    ]);

  return {
    reasonBreakup,
    storeBreakup,
    suspiciousCustomers: customerBreakup,
    suspiciousCashiers: cashierBreakup,
    latestAttempts: latest
  };
};

const getCouponBurnRate = async (query = {}, user = null) => {
  const days = Math.min(Number(query.days) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const filter = {
    createdAt: {
      $gte: since
    },
    status: "SUCCESS"
  };

  if (query.campaignCode) {
    filter.campaignCode = query.campaignCode;
  }

  applyCouponStoreScope(filter, query, user);

  const dailyUsage = await CouponRedemptionLog.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt"
          },
          month: {
            $month: "$createdAt"
          },
          day: {
            $dayOfMonth: "$createdAt"
          },
          campaignCode: "$campaignCode"
        },
        redemptions: {
          $sum: 1
        },
        discountAmount: {
          $sum: "$discountAmount"
        },
        sales: {
          $sum: "$finalPayableAmount"
        }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1
      }
    }
  ]);

  const campaignTotals = await CouponCampaign.find(
    query.campaignCode ? { campaignCode: query.campaignCode } : {}
  );

  const campaignMap = new Map(
    campaignTotals.map((campaign) => [campaign.campaignCode, campaign])
  );

  const campaignUsage = {};

  dailyUsage.forEach((row) => {
    const code = row._id.campaignCode;

    if (!campaignUsage[code]) {
      campaignUsage[code] = {
        campaignCode: code,
        totalRedemptionsInPeriod: 0,
        totalDiscountInPeriod: 0,
        totalSalesInPeriod: 0
      };
    }

    campaignUsage[code].totalRedemptionsInPeriod += row.redemptions;
    campaignUsage[code].totalDiscountInPeriod += row.discountAmount;
    campaignUsage[code].totalSalesInPeriod += row.sales;
  });

  const burnRateByCampaign = Object.values(campaignUsage).map((usage) => {
    const campaign = campaignMap.get(usage.campaignCode);
    const avgDailyUse = usage.totalRedemptionsInPeriod / days;
    const remaining = Number(campaign?.unusedCodes || 0);

    return {
      ...usage,
      days,
      avgDailyUse: Number(avgDailyUse.toFixed(2)),
      remainingCoupons: remaining,
      estimatedDaysToFinish:
        avgDailyUse > 0 ? Math.round(remaining / avgDailyUse) : null
    };
  });

  return {
    days,
    dailyUsage,
    burnRateByCampaign
  };
};

const getCouponInsightAlerts = async (query = {}, user = null) => {
  const failedAnalytics = await getFailedAttemptAnalytics(query, user);
  const campaignPerformance = await getCampaignPerformance(query, user);
  const storeUsage = await getStoreWiseCouponUsage(query, user);

  const alerts = [];

  failedAnalytics.suspiciousCustomers.forEach((customer) => {
    alerts.push({
      alertType: "CUSTOMER_COUPON_MISUSE",
      severity: customer.attempts >= 10 ? "HIGH" : "MEDIUM",
      title: "Repeated invalid coupon attempts",
      description: `Customer ${customer._id} has ${customer.attempts} failed coupon attempts.`,
      customerPhone: customer._id,
      attempts: customer.attempts,
      recommendation: "Review customer coupon attempts before allowing manual discount."
    });
  });

  failedAnalytics.suspiciousCashiers.forEach((cashier) => {
    alerts.push({
      alertType: "CASHIER_COUPON_MISUSE",
      severity: cashier.attempts >= 15 ? "HIGH" : "MEDIUM",
      title: "Cashier has repeated invalid coupon attempts",
      description: `${cashier.cashierName || cashier._id} has ${cashier.attempts} failed attempts.`,
      cashierId: cashier._id,
      cashierName: cashier.cashierName,
      storeCode: cashier.storeCode,
      attempts: cashier.attempts,
      recommendation: "Check whether coupon entry errors are training-related or misuse-related."
    });
  });

  campaignPerformance.forEach((campaign) => {
    if (campaign.utilizationPercent > 80) {
      alerts.push({
        alertType: "CAMPAIGN_BURN_HIGH",
        severity: "MEDIUM",
        title: "Campaign coupon stock is running low",
        description: `${campaign.campaignName} has ${campaign.utilizationPercent}% utilization.`,
        campaignCode: campaign.campaignCode,
        recommendation: "Prepare more coupon codes or plan campaign closure."
      });
    }

    if (campaign.discountToSalesPercent > 20) {
      alerts.push({
        alertType: "HIGH_DISCOUNT_IMPACT",
        severity: "HIGH",
        title: "Coupon discount impact is high",
        description: `${campaign.campaignName} discount is ${campaign.discountToSalesPercent}% of coupon sales.`,
        campaignCode: campaign.campaignCode,
        recommendation: "Review campaign profitability and discount cap."
      });
    }
  });

  storeUsage.forEach((store) => {
    if (store.discountPercentOfSales > 20) {
      alerts.push({
        alertType: "STORE_HIGH_DISCOUNT_SHARE",
        severity: "HIGH",
        title: "Store has high coupon discount share",
        description: `${store.storeName || store._id} coupon discount is ${Number(store.discountPercentOfSales || 0).toFixed(2)}% of coupon sales.`,
        storeCode: store._id,
        recommendation: "Manager should review coupon approval and payment-mode compliance."
      });
    }
  });

  return {
    totalAlerts: alerts.length,
    highSeverity: alerts.filter((alert) => alert.severity === "HIGH").length,
    mediumSeverity: alerts.filter((alert) => alert.severity === "MEDIUM").length,
    alerts
  };
};

const getAdvancedAnalytics = async (query = {}, user = null) => {
  const [
    summary,
    storeWiseUsage,
    campaignPerformance,
    failedAttemptAnalytics,
    burnRate,
    alerts
  ] = await Promise.all([
    getSummary(query, user),
    getStoreWiseCouponUsage(query, user),
    getCampaignPerformance(query, user),
    getFailedAttemptAnalytics(query, user),
    getCouponBurnRate(query, user),
    getCouponInsightAlerts(query, user)
  ]);

  return {
    summary,
    storeWiseUsage,
    campaignPerformance,
    failedAttemptAnalytics,
    burnRate,
    alerts
  };
};

module.exports = {
  validateCoupon,
  markAvailed,
  releaseCoupon,
  getCouponCodes,
  getCouponByCode,
  getCampaigns,
  getSummary,
  refreshCampaignCounts,

  getStoreWiseCouponUsage,
  getCampaignPerformance,
  getFailedAttemptAnalytics,
  getCouponBurnRate,
  getCouponInsightAlerts,
  getAdvancedAnalytics
};
