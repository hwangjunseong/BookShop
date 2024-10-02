const express = require("express");
const router = express.Router();
//좋아요 추가
router.post("/:bookid", [], (req, res, next) => {});
//좋아요 취소
router.delete("/:bookid", [], (req, res, next) => {});

module.exports = router;
