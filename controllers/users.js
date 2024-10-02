const crypto = require("crypto"); //무작위값생성해주는거
const bcrypt = require("bcryptjs");
const jwt = require("./utils/jwt-util");
const redisClient = require("./utils/redis");

// const { validationResult } = require("express-validator");

exports.signup = async (req, res, next) => {
  //이미 미들웨어에서 이메일에 대한 유효성 검사해서 여기서는 따로 안해도됨
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    let sql = `INSERT INTO users ( email, password) VALUES (?, ?)`;
    let values = [email, hashedPassword];
    conn.query(sql, values, function (err, results) {
      if (err) {
        return res.status(400).end();
      }
      res.status(201).json({
        message: "회원가입이 성공적으로 완료되었습니다.",
        userId: results.insertId, // 생성된 사용자의 ID를 반환
      });
    });
  } catch (err) {
    if (!err.statusCode) {
      //에러가 없다면
      err.statusCode = 500;
    }

    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  //db에 저장된 email과 pwd가 맞는지 확인
  let sql = `SELECT * FROM users Where email = ?`;
  conn.query(sql, email, function (err, results) {
    //db에 해당 이메일 가진사람 있는지 확인
    let loginUser = results[0];
    //email 또는 비밀번호가 잘못되었는지 통으로 알려줌
    if (loginUser || bcrypt.compare(password, loginUser.password)) {
      //토큰생성
      const accessToken = jwt.sign(user);
      const refreshToken = jwt.refresh();
      // 발급한 refresh token을 redis에 key를 user의 id로 하여 저장합니다.
      redisClient.set(user.id, refreshToken);

      res.status(200).send({
        // client에게 토큰 모두를 반환합니다.
        ok: true,
        data: {
          accessToken,
          refreshToken,
        },
      });
    } else {
      const error = new Error("email 또는 비밀번호가 틀렸습니다");
      //401은 인증되지않았다는거임, 403은 인가 x
      error.statusCode = 401;
      throw error;
    }
  });
};

exports.resetreq = (req, res, next) => {
  //body로 email 들어옴
};

exports.resetpwd = (req, res, next) => {
  //새로운 비밀번호 생성
};
