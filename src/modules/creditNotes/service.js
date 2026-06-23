const { CreditNote, CreditNoteRedemption } = require("./model");
const OtpVerification = require("../otpVerifications/model");
const otpService = require("../otpVerifications/service");
const auditLogService = require("../auditLogs/service");

const OTP_MODULE = "CREDIT_NOTE_REDEMPTION";

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const round2 = (value) => Number(Number(value || 0).toFixed(2));

const issueCreditNote = async (payload = {}, user = {}) => {
  const creditAmount = Number(payload.creditAmount || 0);

  if (!payload.customerPhone) {
    const error = new Error("Customer phone is required to issue a credit note");
    error.statusCode = 400;
    throw error;
  }

  if (creditAmount <= 0) {
    const error = new Error("Credit amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const creditNote = await CreditNote.create({
    creditNoteId: generateId("CN"),
    customerPhone: payload.customerPhone,
    customerId: payload.customerId || "",
    customerName: payload.customerName || "",
    storeCode: user.storeCode || payload.storeCode,
    storeName: user.storeName || payload.storeName,
    originalInvoiceId: payload.originalInvoiceId || "",
    returnId: payload.returnId || "",
    creditAmount,
    availableAmount: creditAmount,
    status: "ACTIVE",
    issuedBy: user.name || user.email || "",
    expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
  });

  await auditLogService.create({
    action: "CREDIT_NOTE_ISSUED",
    module: "CREDIT_NOTES",
    storeCode: creditNote.storeCode,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    customerPhone: creditNote.customerPhone,
    amount: creditAmount,
    meta: { creditNoteId: creditNote.creditNoteId, returnId: creditNote.returnId },
    message: `Credit note ${creditNote.creditNoteId} issued for ${creditAmount}`,
  });

  return creditNote;
};

const listCreditNotes = async (query = {}, user = {}) => {
  const filter = {};
  if (query.customerPhone) filter.customerPhone = query.customerPhone;
  if (query.status) filter.status = query.status;
  if (user.role !== "ADMIN" && user.storeCode) filter.storeCode = user.storeCode;
  else if (query.storeCode) filter.storeCode = query.storeCode;

  return CreditNote.find(filter).sort({ createdAt: -1 }).limit(200);
};

const getCreditNotesByPhone = async (phone) =>
  CreditNote.find({ customerPhone: phone, status: { $in: ["ACTIVE", "PARTIALLY_REDEEMED"] } }).sort({ createdAt: -1 });

const getCreditNoteById = async (creditNoteId) => CreditNote.findOne({ creditNoteId });

const sendRedemptionOtp = async ({ customerPhone, creditNoteId }, user = {}) => {
  const creditNote = await CreditNote.findOne({ creditNoteId });
  if (!creditNote) {
    const error = new Error("Credit note not found");
    error.statusCode = 404;
    throw error;
  }
  if (creditNote.customerPhone !== customerPhone) {
    const error = new Error("This credit note is not registered to this customer's mobile number");
    error.statusCode = 400;
    throw error;
  }

  return otpService.sendOtp({ module: OTP_MODULE, customerPhone, user });
};

const verifyRedemptionOtp = async ({ customerPhone, otpId, otp }, user = {}) =>
  otpService.verifyOtp({ module: OTP_MODULE, customerPhone, otpId, otp, user });

const redeemCreditNote = async ({ creditNoteId, customerPhone, amount, otpId, invoiceId, orderId }, user = {}) => {
  const creditNote = await CreditNote.findOne({ creditNoteId });

  if (!creditNote) {
    const error = new Error("Credit note not found");
    error.statusCode = 404;
    throw error;
  }

  if (creditNote.customerPhone !== customerPhone) {
    const error = new Error("This credit note is not registered to this customer's mobile number");
    error.statusCode = 400;
    throw error;
  }

  if (!["ACTIVE", "PARTIALLY_REDEEMED"].includes(creditNote.status)) {
    const error = new Error(`Credit note is already ${creditNote.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Re-verify the OTP server-side rather than trusting the client's claim —
  // it must be a VERIFIED record for this exact phone + module, and gets
  // consumed (flipped to EXPIRED) here so it can't be replayed for a second redemption.
  const otpRecord = await OtpVerification.findOne({ otpId, customerPhone, module: OTP_MODULE });
  if (!otpRecord || otpRecord.status !== "VERIFIED") {
    const error = new Error("OTP not verified for this redemption — verify OTP first");
    error.statusCode = 400;
    throw error;
  }
  otpRecord.status = "EXPIRED";
  await otpRecord.save();

  const redeemAmount = Math.min(Number(amount || 0), Number(creditNote.availableAmount || 0));
  if (redeemAmount <= 0) {
    const error = new Error("Redeem amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  creditNote.availableAmount = round2(Number(creditNote.availableAmount) - redeemAmount);
  creditNote.redeemedAmount = round2(Number(creditNote.redeemedAmount || 0) + redeemAmount);
  creditNote.status = creditNote.availableAmount <= 0 ? "REDEEMED" : "PARTIALLY_REDEEMED";
  await creditNote.save();

  const redemption = await CreditNoteRedemption.create({
    redemptionId: generateId("CNR"),
    creditNoteId,
    invoiceId: invoiceId || "",
    orderId: orderId || "",
    customerPhone,
    storeCode: creditNote.storeCode,
    redeemedAmount: redeemAmount,
    otpVerified: true,
    otpVerificationId: otpRecord.otpId,
    status: "SUCCESS",
  });

  await auditLogService.create({
    action: "CREDIT_NOTE_REDEEMED",
    module: "CREDIT_NOTES",
    storeCode: creditNote.storeCode,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    customerPhone,
    invoiceId,
    orderId,
    amount: redeemAmount,
    meta: { creditNoteId, remainingBalance: creditNote.availableAmount },
    message: `Credit note ${creditNoteId} redeemed for ${redeemAmount}`,
  });

  return { creditNote, redemption };
};

module.exports = {
  issueCreditNote,
  listCreditNotes,
  getCreditNotesByPhone,
  getCreditNoteById,
  sendRedemptionOtp,
  verifyRedemptionOtp,
  redeemCreditNote,
};
