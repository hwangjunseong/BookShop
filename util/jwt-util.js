const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const redisClient = require("./redis");
const JWT_PRIVATE_KEY = process.env.PRIVATE_KEY;
const { StatusCodes } = require("http-status-codes");

module.exports = {
  accessSign: (userId) => {
    // access token 발급
    const payload = {
      // access token에 들어갈 payload
      userId: userId,
    };

    return jwt.sign(payload, JWT_PRIVATE_KEY, {
      // JWT_PRIVATE_KEYt으로 sign하여 발급하고 return
      algorithm: "HS256", // 암호화 알고리즘
      expiresIn: "1m", // 유효기간
      // isUser: "junseong", //발행한 사람
    });
  },
  accessVerify: (token) => {
    // access token 검증
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_PRIVATE_KEY);
      return {
        isAuth: true,
        userId: decodedToken.userId,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return {
          isAuth: false,
          err: "TokenExpiredError", // Token expired
          message: "Token has expired",
          statusCode: StatusCodes.UNAUTHORIZED,
        };
      } else if (err instanceof jwt.JsonWebTokenError) {
        return {
          isAuth: false,
          err: "JsonWebTokenError", // Invalid token
          message: "Invalid token",
          statusCode: StatusCodes.BAD_REQUEST,
        };
      } else {
        return {
          isAuth: false,
          err: "UnknownError", // Generic error handling
          message: "An unknown error occurred",
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        };
      }
    }
  },
  refreshSign: () => {
    // refresh token 발급
    return jwt.sign({}, JWT_PRIVATE_KEY, {
      // refresh token은 payload 없이 발급
      algorithm: "HS256",
      expiresIn: "14d",
      // isUser: "junseong",
    });
  },
  refreshVerify: async (token, userId) => {
    // refresh token 검증
    // redisClient.get = util.promisify(client.get);
    //get 함수가 promise를 반환하거나 async로 정의된 함수라면 위에거를 사용할필요없음

    try {
      // Redis에서 userId에 해당하는 refresh token 가져오기
      const storedRefreshToken = await redisClient.get(String(userId));
      // console.log("Stored Refresh Token:", storedRefreshToken);

      // Redis에 저장된 토큰이 없거나 클라이언트의 토큰과 일치하지 않으면 false 반환
      if (!storedRefreshToken || token !== storedRefreshToken) {
        console.log(
          "Stored token과 클라이언트 token이 일치하지 않거나 저장된 토큰이 없습니다."
        );
        return { isAuth: false, message: "Invalid refresh token" };
      }

      // 토큰 검증 시도
      try {
        jwt.verify(token, JWT_PRIVATE_KEY); // 토큰 검증
        return { isAuth: true };
      } catch (err) {
        console.log("Refresh token 검증 실패:", err.message);
        return { isAuth: false, message: "Refresh token 검증 실패" };
      }
    } catch (err) {
      console.error("Redis 에러 발생:", err.message);
      return {
        isAuth: false,
        message: "서버 오류로 토큰을 확인할 수 없습니다.",
      };
    }
  },
};
