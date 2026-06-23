const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const start = async (req, res, next) => {
  try {
    const session = await service.start(req.body, req.user || {});
    return successResponse(res, session, "Cashier session started successfully", 201);
  } catch (error) {
    next(error);
  }
};

const current = async (req, res, next) => {
  try {
    const session = await service.getCurrent(req.query, req.user || {});
    if (!session) return errorResponse(res, "No open session found", 404);

    return successResponse(res, session, "Current session fetched successfully");
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const session = await service.getById(req.params.sessionId);
    if (!session) return errorResponse(res, "Session not found", 404);

    return successResponse(res, session, "Session fetched successfully");
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const session = await service.close(req.params.sessionId, req.body);
    return successResponse(res, session, "Cashier session closed successfully");
  } catch (error) {
    next(error);
  }
};

const closeCurrent = async (req, res, next) => {
  try {
    const session = await service.closeCurrent(req.body, req.user || {});
    return successResponse(res, session, "Cashier session closed successfully");
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await service.list(req.query, req.user);
    return successResponse(res, result.items, "Sessions fetched successfully", 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

const resolveException = async (req, res, next) => {
  try {
    const session = await service.resolveException(req.params.sessionId, req.body, req.user || {});
    return successResponse(res, session, "Exception resolved successfully");
  } catch (error) {
    next(error);
  }
};

const storeDayStatus = async (req, res, next) => {
  try {
    const storeCode = req.user?.storeCode || req.query.storeCode;
    const report = await service.canCloseStoreDay({ storeCode, businessDate: req.query.businessDate });
    return successResponse(res, report, "Store day status fetched successfully");
  } catch (error) {
    next(error);
  }
};

const closeStoreDay = async (req, res, next) => {
  try {
    const storeCode = req.user?.storeCode || req.body.storeCode;
    const report = await service.closeStoreDay({ storeCode, businessDate: req.body.businessDate }, req.user || {});
    return successResponse(res, report, "Store day closed successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  start,
  current,
  get,
  close,
  closeCurrent,
  list,
  resolveException,
  storeDayStatus,
  closeStoreDay,
};
