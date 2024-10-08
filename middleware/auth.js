const { accessVerify } = require("../util/jwt-util");

//헤더에 아래와 같이 들어옴
// {
//     "Authorizaiton":"Bearer access-token",
//   }
module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next(); // 아래코드를 실행하지않고 next미들웨어로 넘어감
  }
  const token = authHeader.split(" ")[1];
  let decodedToken = accessVerify(token);
  //검증에 실패하거나 토큰이 만료되었음
  if (!decodedToken.isAuth) {
    req.isAuth = false;
    return next(); // 아래코드를 실행하지않고 next미들웨어로 넘어감
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
