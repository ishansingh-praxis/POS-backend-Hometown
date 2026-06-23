const service = require("./service");
const { successResponse } = require("../../utils/response");

exports.checkout = async (req, res, next) => {
  try {
    const data = await service.cashierCheckout(req.body, req.user || {});
    successResponse(res, data, "Cashier checkout completed successfully", 201);
  } catch (error) {
    next(error);
  }
};
