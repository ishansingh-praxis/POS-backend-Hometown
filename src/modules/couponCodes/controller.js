const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const getCouponCodes = async (req, res, next) => {
  try {
    const result = await service.getCouponCodes(req.query, req.user);

    return successResponse(
      res,
      result.data,
      "Coupon codes fetched successfully",
      200,
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

const getCouponByCode = async (req, res, next) => {
  try {
    const coupon = await service.getCouponByCode(req.params.offerCode);

    if (!coupon) {
      return errorResponse(res, "Coupon not found", 404);
    }

    return successResponse(res, coupon, "Coupon fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await service.getCampaigns(req.query, req.user);

    return successResponse(
      res,
      campaigns,
      "Coupon campaigns fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await service.getSummary(req.query, req.user);

    return successResponse(
      res,
      summary,
      "Coupon summary fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const validateCoupon = async (req, res, next) => {
  try {
    const result = await service.validateCoupon(req.body);

    return successResponse(
      res,
      result.validation,
      "Coupon validated successfully"
    );
  } catch (error) {
    next(error);
  }
};

const markAvailed = async (req, res, next) => {
  try {
    const result = await service.markAvailed({
      ...req.body,
      offerCode: req.params.offerCode || req.body.offerCode
    });

    return successResponse(
      res,
      result,
      "Coupon marked as availed successfully"
    );
  } catch (error) {
    next(error);
  }
};

const releaseCoupon = async (req, res, next) => {
  try {
    const coupon = await service.releaseCoupon(
      req.params.offerCode,
      req.body
    );

    return successResponse(res, coupon, "Coupon released successfully");
  } catch (error) {
    next(error);
  }
};

const getStoreWiseCouponUsage = async (req, res, next) => {
  try {
    const data = await service.getStoreWiseCouponUsage(req.query, req.user);

    return successResponse(
      res,
      data,
      "Store-wise coupon usage fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getCampaignPerformance = async (req, res, next) => {
  try {
    const data = await service.getCampaignPerformance(req.query, req.user);

    return successResponse(
      res,
      data,
      "Coupon campaign performance fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getFailedAttemptAnalytics = async (req, res, next) => {
  try {
    const data = await service.getFailedAttemptAnalytics(req.query, req.user);

    return successResponse(
      res,
      data,
      "Coupon failed-attempt analytics fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getCouponBurnRate = async (req, res, next) => {
  try {
    const data = await service.getCouponBurnRate(req.query, req.user);

    return successResponse(
      res,
      data,
      "Coupon burn-rate analytics fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getCouponInsightAlerts = async (req, res, next) => {
  try {
    const data = await service.getCouponInsightAlerts(req.query, req.user);

    return successResponse(
      res,
      data,
      "Coupon insight alerts fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getAdvancedAnalytics = async (req, res, next) => {
  try {
    const data = await service.getAdvancedAnalytics(req.query, req.user);

    return successResponse(
      res,
      data,
      "Advanced coupon analytics fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCouponCodes,
  getCouponByCode,
  getCampaigns,
  getSummary,
  validateCoupon,
  markAvailed,
  releaseCoupon,

  getStoreWiseCouponUsage,
  getCampaignPerformance,
  getFailedAttemptAnalytics,
  getCouponBurnRate,
  getCouponInsightAlerts,
  getAdvancedAnalytics
};
