const { accessVerify } = require("../util/jwt-util");

//헤더에 아래와 같이 들어옴
// {
//     "Authorizaiton":"Bearer access-token",
//   }
module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error(" Not authenticated");
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(" ")[1];
  let decodedToken = accessVerify(token); //bear whatever

  //검증에 실패하거나 토큰이 만료되었음
  if (!decodedToken.isAuth) {
    // 토큰 만료 에러인 경우 , 잘못된 토큰인 경우 , 그 외 다른 오류 처리
    const error = new Error(`${decodedToken.err}: ${decodedToken.message}.`);
    error.statusCode = decodedToken.statusCode;
    return next(error);
  }
  req.userId = decodedToken.userId;
  next();
};
