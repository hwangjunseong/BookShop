const crypto = require("crypto"); //무작위값생성해주는거
const bcrypt = require("bcryptjs");
const {
  accessSign,
  accessVerify,
  refreshVerify,
  refreshSign,
} = require("../util/jwt-util");
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

    if (results.affectedRows == 0) {
      const error = new Error("회원가입이 실패했습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      throw error;
    }
    res.status(StatusCodes.CREATED).json({
      message: "회원가입이 성공적으로 완료되었습니다.",
      userId: results.insertId, // 생성된 사용자의 ID를 반환
    });
  } catch (err) {
    handleServerError(err, next);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  // console.log(email, password);
  //conn.query는 promise를 반환 x
  try {
    // db에 저장된 email과 pwd가 맞는지 확인
    let sql = `SELECT * FROM users Where email = ?`;
    const results = await queryAsync(sql, email);
    const loginUser = results[0];
    // console.log("loginUser", loginUser);
    if (!loginUser) {
      const error = new Error("이메일 또는 비밀번호가 잘못되었습니다.");
      error.statusCode = StatusCodes.UNAUTHORIZED;
      throw error;
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, loginUser.password);
    if (!isPasswordValid) {
      const error = new Error("이메일 또는 비밀번호가 잘못되었습니다.");
      error.statusCode = StatusCodes.UNAUTHORIZED;
      throw error;
    }
    // access token과 refresh token을 발급
    const accessToken = accessSign(loginUser.id);
    const refreshToken = refreshSign();
    // 발급한 refresh token을 redis에 key를 user의 id로 하여 db에 저장
    // console.log(loginUser, refreshToken);
    await redisClient.set(loginUser.id, refreshToken);
    // res.cookie(
    //   "token",
    //   { accessToken, refreshToken },
    //   { httpOnly: true, secure: true, sameSite: "Strict" }
    // );
    res
      .status(StatusCodes.OK)
      .json({ token: { accessToken, refreshToken }, message: "로그인 성공!" });
  } catch (err) {
    handleServerError(err, next);
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
      throw error;
    }
    res.status(StatusCodes.OK).json({
      message: "해당 이메일을 가진 사람이 있습니다",
      email: loginUser.email, //email 반환
    });
  } catch (err) {
    handleServerError(err, next);
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
      const error = new Error("비밀번호 변경에 실패했습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      throw error;
    }
    res.status(StatusCodes.OK).json({
      message: "비밀번호가 변경되었습니다",
      results,
    });
  } catch (err) {
    handleServerError(err, next);
  }
};

exports.refresh = async (req, res) => {
  // check access token and refresh token exist
  const authHeader = req.get("Authorization");
  const refreshHeader = req.get("Refresh");
  // console.log(`refresh token: ${refreshHeader}`);
  // console.log(`auth header: ${authHeader}`);
  if (!authHeader || !refreshHeader) {
    res.status(StatusCodes.BAD_REQUEST).send({
      isAuth: false,
      message:
        "entered data is incorrect, please enter an Access token and refresh token!",
    });
  }

  //case 3가지
  //access token이 만료되고, refresh token도 만료 된 경우 => 새로 로그인
  //access token이 만료되고, refresh token은 만료되지 않은 경우 => 새로운 access token을 발급
  //access token이 만료되지 않은경우 => refresh 안함

  const authToken = authHeader.split(" ")[1];

  const refreshToken = refreshHeader;

  // access token verify(검증) => expired 확인
  const authResult = accessVerify(authToken);
  // console.log("authResult", authResult);
  //jwt.decode함수는 verify를 하지않고, payload의 값을 가져오기 때문에 유저정보를 가져올 수 있음.
  // access token decoding => userId
  const decodedToken = jwt.decode(authToken);
  // console.log("decodedToken)", decodedToken);
  if (!decodedToken) {
    res.status(StatusCodes.UNAUTHORIZED).send({
      isAuth: false,
      message: "No authorized!",
    });
  }

  //access token의 decoding 된 값에서 유저의 id를 가져와 refresh token을 검증
  const refreshResult = await refreshVerify(refreshToken, decodedToken.userId);
  // console.log("refreshResult", refreshResult);
  if (
    authResult.isAuth === false &&
    authResult.message === "Token has expired"
  ) {
    // 1. accessToken expired && refreshToken expired => make user login
    if (refreshResult.isAuth === false) {
      res.status(StatusCodes.UNAUTHORIZED).send({
        isAuth: false,
        message: "No authorized!",
      });
    } else {
      // 2. accessToken expired && refreshToken valid => make new accessToken
      const newAccessToken = accessSign(decodedToken.userId);
      // console.log("newAccessToken", newAccessToken);

      res.status(StatusCodes.OK).send({
        isAuth: true,
        data: {
          accessToken: newAccessToken,
          refreshToken,
        },
      });
    }
  } else {
    // 3. accessToken valid => dont have to make new token
    res.status(StatusCodes.BAD_REQUEST).send({
      isAuth: false,
      message: "Acess token is not expired!",
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
const handleServerError = (err, next) => {
  if (!err.statusCode) {
    err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
  next(err);
};
