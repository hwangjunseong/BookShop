const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders");
const isAuth = require("../middleware/auth");
//주문하기
router.post("/", isAuth, [], orderController.createOrder);
//주문목록 조회
router.get("/", isAuth, [], orderController.getOrders);

//주문 상품 상세 조회
router.get("/:orderid", isAuth, [], orderController.getOrderDetail);

module.exports = router;
