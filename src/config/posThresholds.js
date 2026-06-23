// Automated session-verification thresholds (see exception rules in posSessions/service.js).
module.exports = {
  cashDifferenceAllowed: 100,
  highCashDifference: 500,
  maxManualDiscountPercent: 10,
  highRefundAmount: 5000,
  highInvoiceCancelAmount: 10000,
  failedPaymentAllowed: 0,
  negativeStockAllowed: false,
};
