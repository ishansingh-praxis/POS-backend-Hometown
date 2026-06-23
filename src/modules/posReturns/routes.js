const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.post("/fetch-invoice", controller.fetchInvoice);
router.post("/confirm", controller.confirm);
router.get("/", controller.list);
router.get("/:returnId", controller.get);

module.exports = router;
