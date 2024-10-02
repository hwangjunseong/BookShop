const express = require("express");
const router = express.Router();
//전체 도서 조회
router.get("/", [], (req, res, next) => {
  res.json();
});
//개별 도서 조회
router.get("/:bookid", [], (req, res, next) => {
  res.json();
});

//카테고리별 도서 목록 조회
router.get("/", [], (req, res, next) => {
  const categoryid = req.query.categoryId;
  const isNew = req.query.New;
  res.json();
});

module.exports = router;
