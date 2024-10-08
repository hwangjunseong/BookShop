const express = require("express");
const router = express.Router();
const conn = require("../util/mariadb");
const { check, body, validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const userController = require("../controllers/users");

//validate에 오는 req, res, next express 가 넣어주는거
const validate = (req, res, next) => {
  const err = validationResult(req);
  if (err.isEmpty()) {
    return next();
  } else {
    const error = new Error("Validation failed, entered data is incorrect");
    error.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    error.data = err.array();
    return next(error);
  }
};

//회원가입
router.post(
  "/signup",
  [
    check("email")
      .notEmpty()
      .isEmail()
      .withMessage("이메일 확인 필요")
      .custom((value, { req }) => {
        //db에서 동일한 이메일 가진거 있는지 확인 value에는 이메일 들어감
        let sql = `SELECT * FROM users Where email = ?`;
        return new Promise((resolve, reject) => {
          conn.query(sql, value, function (err, results) {
            if (err) {
              return reject(new Error("DB error"));
            }
            //db에 해당 이메일 가진사람 있는지 확인
            let loginUser = results[0];
            if (loginUser) {
              //promise를 거부 => 인증이 실패
              return reject(
                new Error("Email exists already, please pick up another")
              );
            }
            resolve();
          });
        });
      })
      .normalizeEmail(), //대문자제거 ,이메일 형식 표준화

    body("password")
      .notEmpty()
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim()
      .withMessage("비밀번호 확인 필요"),
    validate,
  ],
  userController.signup
);
//로그인
router.post(
  "/login",
  [
    check("email")
      .notEmpty()
      .isEmail()
      .withMessage("이메일 확인 필요")
      .normalizeEmail(), //대문자제거 ,이메일 형식 표준화
    body("password")
      .notEmpty()
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim()
      .withMessage("비밀번호 확인 필요"),
    validate,
  ],
  userController.login
);

//비밀번호 초기화 요청
router.post("/reset", [], userController.pwdResetReq);

//비밀번호 초기화
router.put("/reset", [], userController.pwdReset);

//refresh 요청 => 헤더에 다음과 같이 들어옴
// {
//   "Authorizaiton":"Bearer access-token",
//   "Refresh":"refresh-token"
// }
router.get("/refresh", userController.refresh);
module.exports = router;
