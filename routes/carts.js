const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/auth");

//장바구니 담기
router.post("/", isAuth, [], (req, res, next) => {});
//장바구니 조회
router.get("/", isAuth, [], (req, res, next) => {});

//장바구니 도서 삭제
router.delete("/:bookid", isAuth, [], (req, res, next) => {});

//장바구니에서 선택한 주문 예상 상품 목록 조회
router.get("/", isAuth, [], (req, res, next) => {});

module.exports = router;
