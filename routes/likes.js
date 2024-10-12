const express = require("express");
const router = express.Router();
const likeController = require("../controllers/likes");

//좋아요 추가
router.post("/:bookid", [], likeController.addLike);
//좋아요 취소
router.delete("/:bookid", [], likeController.deleteLike);

module.exports = router;
