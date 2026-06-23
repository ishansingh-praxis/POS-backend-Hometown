const service = require("./service");
const { successResponse } = require("../../utils/response");

const getDashboard = async (req, res, next) => {
  try {
    const data = await service.getDashboard(req.query, req.user || {});
    return successResponse(res, data, "Admin dashboard fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getOverview = async (req, res, next) => {
  try {
    const data = await service.getOverview(req.query, req.user || {});
    return successResponse(res, data, "Admin overview fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getStorePerformance = async (req, res, next) => {
  try {
    const data = await service.getStorePerformance(req.query, req.user || {});
    return successResponse(res, data.stores, "Store performance fetched successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getOverview,
  getStorePerformance,
};
