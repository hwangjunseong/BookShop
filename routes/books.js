const express = require("express");
const router = express.Router();
const bookController = require("../controllers/books");
const isAuth = require("../middleware/auth");

//전체 도서 조회 , 카테고리별 도서 목록 조회
router.get("/", [], bookController.getBooks);
//개별 도서 조회
router.get("/:bookId", isAuth, [], bookController.getBookDetail);

module.exports = router;
