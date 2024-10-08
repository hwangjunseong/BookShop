const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const redisClient = require("./redis");
const JWT_PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  accesssSign: (user) => {
    // access token 발급
    const payload = {
      // access token에 들어갈 payload
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, JWT_PRIVATE_KEY, {
      // JWT_PRIVATE_KEYt으로 sign하여 발급하고 return
      algorithm: "HS256", // 암호화 알고리즘
      expiresIn: "1h", // 유효기간
      isUser: "junseong", //발행한 사람
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
        email: decodedToken.email,
      };
    } catch (err) {
      return {
        isAuth: false,
        message: err.message,
      };
    }
  },
  refreshSign: () => {
    // refresh token 발급
    return jwt.sign({}, JWT_PRIVATE_KEY, {
      // refresh token은 payload 없이 발급
      algorithm: "HS256",
      expiresIn: "14d",
      isUser: "junseong",
    });
  },
  refreshVerify: async (token, userId) => {
    // refresh token 검증
    /* redis 모듈은 기본적으로 promise를 반환하지 않으므로,
       promisify를 이용하여 promise를 반환하게 해줍니다.*/
    const getAsync = promisify(redisClient.get).bind(redisClient);

    try {
      const refreshToken = await getAsync(userId); // 서버에 저장된 refresh token 가져오기
      if (token === refreshToken) {
        try {
          jwt.verify(token, JWT_PRIVATE_KEY);
          return true;
        } catch (err) {
          return false;
        }
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  },
};
