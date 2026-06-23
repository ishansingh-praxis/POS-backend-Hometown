const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const issue = async (req, res, next) => {
  try {
    const creditNote = await service.issueCreditNote(req.body, req.user || {});
    return successResponse(res, creditNote, "Credit note issued successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await service.listCreditNotes(req.query, req.user || {});
    return successResponse(res, items, "Credit notes fetched successfully");
  } catch (error) {
    next(error);
  }
};

const byCustomer = async (req, res, next) => {
  try {
    const items = await service.getCreditNotesByPhone(req.params.phone);
    return successResponse(res, items, "Credit notes fetched successfully");
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const creditNote = await service.getCreditNoteById(req.params.creditNoteId);
    if (!creditNote) return errorResponse(res, "Credit note not found", 404);

    return successResponse(res, creditNote, "Credit note fetched successfully");
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const result = await service.sendRedemptionOtp(req.body, req.user || {});
    return successResponse(res, result, "OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const result = await service.verifyRedemptionOtp(req.body, req.user || {});
    return successResponse(res, result, "OTP verified successfully");
  } catch (error) {
    next(error);
  }
};

const redeem = async (req, res, next) => {
  try {
    const result = await service.redeemCreditNote(req.body, req.user || {});
    return successResponse(res, result, "Credit note redeemed successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issue,
  list,
  byCustomer,
  get,
  sendOtp,
  verifyOtp,
  redeem,
};
