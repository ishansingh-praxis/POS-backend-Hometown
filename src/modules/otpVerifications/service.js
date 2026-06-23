const crypto = require("crypto");
const OtpVerification = require("./model");
const auditLogService = require("../auditLogs/service");

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

const generateOtpId = () => `OTP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

// DEV-MODE: no SMS provider is wired up yet, so the OTP is generated and stored
// the same way a real flow would, but returned in the API response (and logged)
// instead of being sent as a text. Swapping in a real provider later only means
// replacing the "return otp in response" step below with an actual SMS send.
const sendOtp = async ({ module: otpModule, customerPhone, user = {} }) => {
  if (!customerPhone) {
    const error = new Error("Customer phone number is required");
    error.statusCode = 400;
    throw error;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));

  const record = await OtpVerification.create({
    otpId: generateOtpId(),
    module: otpModule,
    customerPhone,
    otpHash: hashOtp(otp),
    status: "SENT",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  console.log(`[DEV OTP] ${otpModule} OTP for ${customerPhone}: ${otp} (expires in 5 min)`);

  await auditLogService.create({
    action: "OTP_SENT",
    module: otpModule,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    customerPhone,
    meta: { otpId: record.otpId },
    message: `OTP sent for ${otpModule} verification`,
  });

  return {
    otpId: record.otpId,
    expiresAt: record.expiresAt,
    // Dev-mode only — a real SMS integration would NOT return this to the client.
    devOtp: otp,
  };
};

const verifyOtp = async ({ otpId, customerPhone, otp, module: otpModule, user = {} }) => {
  const filter = otpId ? { otpId } : { customerPhone, module: otpModule, status: "SENT" };
  const record = await OtpVerification.findOne(filter).sort({ createdAt: -1 });

  if (!record) {
    const error = new Error("No OTP request found — send a new OTP");
    error.statusCode = 404;
    throw error;
  }

  if (record.status === "VERIFIED") {
    const error = new Error("This OTP has already been used");
    error.statusCode = 400;
    throw error;
  }

  if (new Date(record.expiresAt) < new Date()) {
    record.status = "EXPIRED";
    await record.save();
    const error = new Error("OTP has expired — send a new one");
    error.statusCode = 400;
    throw error;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.status = "EXPIRED";
    await record.save();
    const error = new Error("Too many incorrect attempts — send a new OTP");
    error.statusCode = 400;
    throw error;
  }

  if (hashOtp(otp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    const error = new Error("Incorrect OTP");
    error.statusCode = 400;
    throw error;
  }

  record.status = "VERIFIED";
  record.verifiedAt = new Date();
  await record.save();

  await auditLogService.create({
    action: "OTP_VERIFIED",
    module: record.module,
    cashierId: user.email || user.employeeCode,
    cashierName: user.name,
    customerPhone: record.customerPhone,
    meta: { otpId: record.otpId },
    message: `OTP verified for ${record.module}`,
  });

  return { verified: true, otpId: record.otpId };
};

module.exports = {
  sendOtp,
  verifyOtp,
};
