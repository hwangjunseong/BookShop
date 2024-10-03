// authJWT.js
const { verify } = require("../util/jwt-util");

//헤더에 아래와 같이 들어옴
// {
//     "Authorizaiton":"Bearer access-token",
//     "Refresh":"refresh-token"
//   }
module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next(); // 아래코드를 실행하지않고 next미들웨어로 넘어감
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = verify(token, process.env.PRIVATE_KEY);
  } catch (err) {
    req.isAuth = false;
    return next(); // 아래코드를 실행하지않고 next미들웨어로 넘어감
  }
  //decodedToken가 undefined라면 실패하지는 않았지만 토큰을 확인할수없는거
  if (!decodedToken) {
    req.isAuth = false;
    return next(); // 아래코드를 실행하지않고 next미들웨어로 넘어감
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;

  next();
};
