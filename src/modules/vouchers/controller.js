const service = require("./service");
const { successResponse } = require("../../utils/response");

const create = async (req, res, next) => {
  try {
    const voucher = await service.issueVoucher(req.body, req.user || {});
    return successResponse(res, voucher, "Voucher issued successfully", 201);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const items = await service.listVouchers(req.query, req.user || {});
    return successResponse(res, items, "Vouchers fetched successfully");
  } catch (error) {
    next(error);
  }
};

const validate = async (req, res, next) => {
  try {
    const voucher = await service.validateVoucher(req.body);
    return successResponse(res, voucher, "Voucher is valid");
  } catch (error) {
    next(error);
  }
};

const redeem = async (req, res, next) => {
  try {
    const voucher = await service.redeemVoucher(req.body, req.user || {});
    return successResponse(res, voucher, "Voucher redeemed successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  validate,
  redeem,
};
