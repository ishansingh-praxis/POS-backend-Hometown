const Voucher = require("./model");
const auditLogService = require("../auditLogs/service");

const generateVoucherId = () => `VOU-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const generateVoucherCode = () =>
  `HTV${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const isExpired = (voucher) => voucher.expiryDate && new Date(voucher.expiryDate) < new Date();

const issueVoucher = async (payload = {}, user = {}) => {
  const amount = Number(payload.amount || 0);

  if (amount <= 0) {
    const error = new Error("Voucher amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const voucher = await Voucher.create({
    voucherId: generateVoucherId(),
    voucherCode: (payload.voucherCode || generateVoucherCode()).toUpperCase(),
    customerPhone: payload.customerPhone || "",
    customerName: payload.customerName || "",
    amount,
    availableAmount: amount,
    status: "ACTIVE",
    storeIssued: user.storeCode || payload.storeCode || "",
    issuedBy: user.name || user.email || payload.issuedBy || "",
    expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
    notes: payload.notes || "",
  });

  return voucher;
};

const listVouchers = async (query = {}, user = {}) => {
  const filter = {};

  if (query.customerPhone) filter.customerPhone = query.customerPhone;
  if (query.status) filter.status = query.status;
  if (user.role !== "ADMIN" && user.storeCode) filter.storeIssued = user.storeCode;

  return Voucher.find(filter).sort({ createdAt: -1 }).limit(200);
};

const validateVoucher = async ({ voucherCode, customerPhone }) => {
  if (!voucherCode) {
    const error = new Error("Voucher code is required");
    error.statusCode = 400;
    throw error;
  }

  const voucher = await Voucher.findOne({ voucherCode: String(voucherCode).toUpperCase() });

  if (!voucher) {
    const error = new Error("Voucher not found");
    error.statusCode = 404;
    throw error;
  }

  if (voucher.customerPhone && customerPhone && voucher.customerPhone !== customerPhone) {
    const error = new Error("This voucher is not registered to this customer's mobile number");
    error.statusCode = 400;
    throw error;
  }

  if (isExpired(voucher)) {
    if (voucher.status !== "EXPIRED") {
      voucher.status = "EXPIRED";
      await voucher.save();
    }
    const error = new Error("Voucher has expired");
    error.statusCode = 400;
    throw error;
  }

  if (voucher.status !== "ACTIVE") {
    const error = new Error(`Voucher is already ${voucher.status}`);
    error.statusCode = 400;
    throw error;
  }

  if (Number(voucher.availableAmount || 0) <= 0) {
    const error = new Error("Voucher has no balance remaining");
    error.statusCode = 400;
    throw error;
  }

  return voucher;
};

const redeemVoucher = async ({ voucherCode, customerPhone, amount }, user = {}) => {
  const voucher = await validateVoucher({ voucherCode, customerPhone });
  const redeemAmount = Math.min(Number(amount || 0), Number(voucher.availableAmount || 0));

  if (redeemAmount <= 0) {
    const error = new Error("Redeem amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  voucher.availableAmount = round2(Number(voucher.availableAmount) - redeemAmount);
  voucher.redeemedAmount = round2(Number(voucher.redeemedAmount || 0) + redeemAmount);
  if (voucher.availableAmount <= 0) voucher.status = "USED";
  await voucher.save();

  await auditLogService.create({
    action: "VOUCHER_APPLIED",
    module: "VOUCHERS",
    storeCode: user.storeCode,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    customerPhone: voucher.customerPhone || customerPhone,
    amount: redeemAmount,
    meta: { voucherCode: voucher.voucherCode, remainingBalance: voucher.availableAmount },
    message: `Voucher ${voucher.voucherCode} redeemed for ${redeemAmount}`,
  });

  return voucher;
};

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

module.exports = {
  issueVoucher,
  listVouchers,
  validateVoucher,
  redeemVoucher,
};
