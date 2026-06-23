const service = require("./service");
const { successResponse } = require("../../utils/response");

const calculateCart = async (req, res, next) => {
  try {
    const result = service.calculateCart(
      req.body.items,
      req.body.billDiscountPercent,
      req.body.deliveryFee,
      req.body.installationFee
    );

    return successResponse(res, result, "Cart calculated successfully");
  } catch (error) {
    next(error);
  }
};

const createUpiQr = async (req, res, next) => {
  try {
    const result = await service.createUpiQr(req.body);
    return successResponse(res, result, "UPI QR generated successfully");
  } catch (error) {
    next(error);
  }
};

const createPosSale = async (req, res, next) => {
  try {
    const result = await service.createPosSale(req.body);
    return successResponse(res, result, "POS sale saved successfully", 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateCart,
  createUpiQr,
  createPosSale
};
