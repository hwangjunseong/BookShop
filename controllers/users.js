const crypto = require("crypto"); //무작위값생성해주는거
const bcrypt = require("bcryptjs");
const { sign, verify, refreshVerify, refresh } = require("../util/jwt-util");
const redisClient = require("../util/redis");
const { promisify } = require("util");
const conn = require("../util/mariadb");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

// const { validationResult } = require("express-validator");

exports.signup = async (req, res, next) => {
  //이미 미들웨어에서 이메일에 대한 유효성 검사해서 여기서는 따로 안해도됨
  const { email, password } = req.body;
  //try catch는 동기 코드, 비동기 코드는 then catch
  //await을 사용하는 이유는 비동기 함수의 결과를 동기적으로 기다리기 위해서임.
  //본래 try-catch 문은 동기적 에러 처리를 위해 설계되었기 때문에, 비동기 작업에서 발생하는 에러는 직접적으로 잡아낼 수 없음
  try {
    //crypto 사용해도됨 => 근데 db에 랜덤바이트로 생성된 값이랑 해쉬된 비밀번호를 저장한뒤
    //나중에 로그인할 때 db에 저장된 salt와 body로 들어온 paswword가지고
    //hashedPassword 만드는데 이걸 db에 저장된 hashedPassword와 비교함

    // const salt = crypto.randomBytes(32).toString("base64");
    // const hashedPassword = crypto
    //   .pbkdf2Sync(password, salt, 10000, 32, "SHA256")
    //   .toString("base64"); //해시함수를 반복하는 횟수 : 10000 , 암호화된 글자수 :32
    const hashedPassword = await bcrypt.hash(password, 12);
    let sql = `INSERT INTO users ( email, password) VALUES (?,  ?)`;
    let values = [email, hashedPassword];
    //conn.query는 비동기적으로 작동하는 콜백 기반 함수, promise를 반환하지 않음
    // conn.query를 Promise로 변환
    // const query = promisify(conn.query).bind(conn);
    //만약 Promise가 실패하면 await 키워드로 인해서 에러가 catch 블록으로 전달
    // const results = await query(sql, values);
    const results = await queryAsync(sql, values);

    res.status(StatusCodes.CREATED).json({
      message: "회원가입이 성공적으로 완료되었습니다.",
      userId: results.insertId, // 생성된 사용자의 ID를 반환
    });
  } catch (err) {
    if (!err.statusCode) {
      //에러가 없다면
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }

    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  //conn.query는 promise를 반환 x
  try {
    // db에 저장된 email과 pwd가 맞는지 확인
    let sql = `SELECT * FROM users Where email = ?`;
    const results = await queryAsync(sql, email);
    const loginUser = results[0];
    if (!loginUser) {
      const error = new Error("이메일 또는 비밀번호가 잘못되었습니다.");
      error.statusCode = StatusCodes.UNAUTHORIZED;
      return next(error);
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, loginUser.password);
    if (!isPasswordValid) {
      const error = new Error("이메일 또는 비밀번호가 잘못되었습니다.");
      error.statusCode = StatusCodes.UNAUTHORIZED;
      return next(error);
    }
    // access token과 refresh token을 발급합니다.
    const accessToken = sign(loginUser);
    const refreshToken = refresh();
    // Redis에 refresh token 저장
    redisClient.set(loginUser.id, refreshToken);
    res.cookie(
      "token",
      { accessToken, refreshToken },
      { httpOnly: true, secure: true, sameSite: "Strict" }
    );
    res.status(StatusCodes.OK).json({ message: "로그인 성공!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    next(err);
  }
};

exports.pwdResetReq = async (req, res, next) => {
  //body로 email 들어옴
  const { email } = req.body;
  try {
    let sql = `SELECT * FROM users Where email = ?`;
    const results = await queryAsync(sql, email);
    const loginUser = results[0];
    if (!loginUser) {
      const error = new Error("해당 이메일을 가진 사람이 없습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }
    res.status(StatusCodes.OK).json({
      message: "해당 이메일을 가진 사람이 있습니다",
      email: loginUser.email, //email 반환
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    next(err);
  }
};

exports.pwdReset = async (req, res, next) => {
  //새로운 비밀번호 생성, body로 이번페이지에서 입력했던 이메일과 비밀번호 받고 암호화해서 넣기
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    let sql = `UPDATE  users SET password=? Where email=?`;
    let values = [hashedPassword, email];

    const results = await queryAsync(sql, values);
    // console.log(results);
    if (results.affectedRows == 0) {
      const error = new Error("해당 이메일을 가진 사람이 없습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }
    res.status(StatusCodes.OK).json({
      message: "비밀번호가 변경되었습니다",
      results: results,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    next(err);
  }
};

exports.refresh = async (req, res) => {
  // check access token and refresh token exist
  if (req.headers.authorization && req.headers.refresh) {
    const authToken = req.headers.authorization.split("Bearer ")[1];
    const refreshToken = req.headers.refresh;

    // access token verify
    const authResult = verify(authToken);

    // access token decoding
    const decoded = jwt.decode(authToken);

    if (decoded === null) {
      res.status(401).send({
        ok: false,
        message: "No authorized!",
      });
    }

    // refreshToken verify
    let user = null;
    try {
      user = await client.users.findFirst({
        where: {
          id: decoded.id,
        },
      });
    } catch (err) {
      res.status(401).send({
        ok: false,
        message: err.message,
      });
    }

    const refreshResult = refreshVerify(refreshToken, user.username);

    if (authResult.ok === false && authResult.message === "jwt expired") {
      // 1. accessToken expired && refreshToken expired => make user login
      if (refreshResult.ok === false) {
        res.status(401).send({
          ok: false,
          message: "No authorized!",
        });
      } else {
        // 2. accessToken expired && refreshToken valid => make new accessToken
        const newAccessToken = sign(user);

        res.status(200).send({
          ok: true,
          data: {
            accessToken: newAccessToken,
            refreshToken,
          },
        });
      }
    } else {
      // 3. accessToken valid => dont have to make new token
      res.status(400).send({
        ok: false,
        message: "Acess token is not expired!",
      });
    }
  } else {
    res.status(400).send({
      ok: false,
      message: "Access token and refresh token are need for refresh!",
    });
  }
};

const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};
