const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

const getInvoices = async (req, res, next) => {
  try {
    const result = await service.getInvoices(req.query, req.user);
    return successResponse(res, result.data, "Invoices fetched successfully", 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await service.getInvoiceById(req.params.id, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getInvoiceByInvoiceId = async (req, res, next) => {
  try {
    const invoice = await service.getInvoiceByInvoiceId(req.params.invoiceId, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getInvoiceByOrderId = async (req, res, next) => {
  try {
    const invoice = await service.getInvoiceByOrderId(req.params.orderId, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getInvoicesByStore = async (req, res, next) => {
  try {
    const result = await service.getInvoicesByStore(req.params.storeCode, req.query, req.user);
    return successResponse(res, result.data, "Store invoices fetched successfully", 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getInvoiceSummary = async (req, res, next) => {
  try {
    const summary = await service.getInvoiceSummary(req.query, req.user);
    return successResponse(res, summary, "Invoice summary fetched successfully");
  } catch (error) {
    next(error);
  }
};

const getStoreInvoiceSummary = async (req, res, next) => {
  try {
    const summary = await service.getStoreInvoiceSummary(req.params.storeCode, req.user);
    return successResponse(res, summary, "Store invoice summary fetched successfully");
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const invoice = await service.createInvoice(req.body);
    return successResponse(res, invoice, "Invoice created successfully", 201);
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await service.updateInvoice(req.params.id, req.body, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice updated successfully");
  } catch (error) {
    next(error);
  }
};

const updateInvoiceByInvoiceId = async (req, res, next) => {
  try {
    const invoice = await service.updateInvoiceByInvoiceId(req.params.invoiceId, req.body, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice updated successfully");
  } catch (error) {
    next(error);
  }
};

const cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await service.cancelInvoice(req.params.invoiceId, req.body, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice cancelled successfully");
  } catch (error) {
    next(error);
  }
};

const markPrinted = async (req, res, next) => {
  try {
    const invoice = await service.markPrinted(req.params.invoiceId, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, invoice, "Invoice marked as printed");
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await service.deleteInvoice(req.params.id, req.user);
    if (!invoice) return errorResponse(res, "Invoice not found", 404);
    return successResponse(res, null, "Invoice deleted successfully");
  } catch (error) {
    next(error);
  }
};

const generateInvoiceQr = async (req, res, next) => {
  try {
    const result = await service.generateInvoiceQr(req.params.invoiceId, req.user);
    return successResponse(res, result, "Invoice QR generated successfully");
  } catch (error) {
    next(error);
  }
};

const sendInvoiceEmail = async (req, res, next) => {
  try {
    const result = await service.sendInvoiceEmail(req.params.invoiceId, req.body, req.user);
    return successResponse(res, result, "Invoice email sent successfully");
  } catch (error) {
    next(error);
  }
};

const createCreditNote = async (req, res, next) => {
  try {
    const result = await service.createCreditNote(req.params.invoiceId, req.body, req.user);
    return successResponse(res, result, "Credit note created successfully", 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceByInvoiceId,
  getInvoiceByOrderId,
  getInvoicesByStore,
  getInvoiceSummary,
  getStoreInvoiceSummary,
  createInvoice,
  updateInvoice,
  updateInvoiceByInvoiceId,
  cancelInvoice,
  markPrinted,
  deleteInvoice,

  generateInvoiceQr,
  sendInvoiceEmail,
  createCreditNote
};
