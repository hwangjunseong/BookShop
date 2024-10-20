const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/auth");
const cartController = require("../controllers/cart");

//장바구니 담기
router.post("/", isAuth, [], cartController.postCart);
//장바구니 조회 , 선택한 장바구니에서 주문 예상 상품 목록 조회
router.get("/", isAuth, [], cartController.getCartItems);

//장바구니 도서 삭제
router.delete("/:cartitemid", isAuth, [], cartController.removeCartItems);

module.exports = router;
