const express = require("express");
const router = express.Router();
const likeController = require("../controllers/likes");
const isAuth = require("../middleware/auth");

//좋아요 추가
router.post("/:bookid", isAuth, [], likeController.addLike);
//좋아요 취소
router.delete("/:bookid", isAuth, [], likeController.deleteLike);

module.exports = router;
