const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");
exports.getCategories = async (req, res, next) => {
  //카테고리 전체 목록 리스트
  try {
    let sql = `SELECT * FROM category `;
    const results = await queryAsyncNoParams(sql);
    if (results.length == 0) {
      const error = new Error("카테고리 테이블에 정보가 없습니다");
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }
    // console.log(results);

    res.status(StatusCodes.OK).json({
      message: "카테고리 전체 목록 리스트",
      category: results,
    });
  } catch (err) {
    handleServerError(err, next);
  }
};
const queryAsyncNoParams = (sql) => {
  return new Promise((resolve, reject) => {
    conn.query(sql, (err, results) => {
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
