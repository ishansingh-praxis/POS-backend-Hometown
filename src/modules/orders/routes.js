const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", controller.getOrders);
router.get("/summary", controller.getOrderSummary);
router.get("/order-id/:orderId", controller.getOrderByOrderId);
router.get("/store/:storeCode", controller.getOrdersByStore);
router.get("/store/:storeCode/summary", controller.getStoreOrderSummary);
router.get("/:id", controller.getOrderById);

router.post("/", controller.createOrder);

router.put("/:id", controller.updateOrder);
router.put("/order-id/:orderId", controller.updateOrderByOrderId);

router.patch("/order-id/:orderId/cancel", controller.cancelOrder);

router.delete("/:id", controller.deleteOrder);

module.exports = router;
