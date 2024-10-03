module.exports = (error, req, res, next) => {
  //console.log(error);
  //error statuscode가 undefine인 경우 500으로 설정
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
};
