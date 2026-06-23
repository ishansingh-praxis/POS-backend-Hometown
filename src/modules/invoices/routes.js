const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.getInvoices);
router.get("/summary", controller.getInvoiceSummary);

router.get("/invoice-id/:invoiceId", controller.getInvoiceByInvoiceId);
router.get("/invoice-id/:invoiceId/qr", controller.generateInvoiceQr);
router.post("/invoice-id/:invoiceId/email", controller.sendInvoiceEmail);
router.post("/invoice-id/:invoiceId/credit-note", controller.createCreditNote);
router.get("/order-id/:orderId", controller.getInvoiceByOrderId);

router.get("/store/:storeCode", controller.getInvoicesByStore);
router.get("/store/:storeCode/summary", controller.getStoreInvoiceSummary);

router.get("/:id", controller.getInvoiceById);

router.post("/", controller.createInvoice);

router.put("/:id", controller.updateInvoice);
router.put("/invoice-id/:invoiceId", controller.updateInvoiceByInvoiceId);

router.patch("/invoice-id/:invoiceId/cancel", controller.cancelInvoice);
router.patch("/invoice-id/:invoiceId/print", controller.markPrinted);

router.delete("/:id", controller.deleteInvoice);

module.exports = router;
