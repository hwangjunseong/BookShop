const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/auth");
//주문하기
router.post("/", isAuth, [], (req, res, next) => {
  const items = req.body.items; //json array
  const delivery = req.body.delivery; //책을 주문한 사용자에 대한 정보
  const totalPrice = req.body.totalPrice; //총 금액
});
//주문목록 조회
router.get("/", isAuth, [], (req, res, next) => {
  res.json();
});

//주문 상품 상세 조회
router.get("/:orderid", isAuth, [], (req, res, next) => {
  res.json();
});

module.exports = router;
