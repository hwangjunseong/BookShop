const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

//좋아요 추가
const addLike = async (req, res, next) => {
  const { user_id } = req.body;
  const liked_book_id = req.params.bookid;

  try {
    // 해당 유저 id에 대해 liked_book_id가 각각 users 테이블과 books 테이블에 존재하는지 확인
    await checkUserAndBook(user_id, liked_book_id, next);
    //문제점 => 해당 유저 id에 대해 liked_book_id가 이미 있다면 추가해주면 안됨
    let selectSql = `SELECT * FROM likes WHERE user_id = ? AND liked_book_id = ? `;
    let sql = `INSERT INTO likes (user_id, liked_book_id) VALUES (?, ?) `;
    let values = [user_id, liked_book_id];
    const selectResults = await queryAsync(selectSql, values);

    if (selectResults.length > 0) {
      const error = new Error(
        "해당 유저는 해당 책에 이미 좋아요를 눌렀습니다."
      );
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }
    const insertResults = await queryAsync(sql, values);
    if (insertResults.affectedRows == 0) {
      const error = new Error("좋아요 추가 실패했습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }

    res.status(StatusCodes.OK).json({
      message: "좋아요 추가 성공했습니다.",
      insertResults,
    });
  } catch (err) {
    handleServerError(err, next);
  }
};

//좋아요 삭제
const deleteLike = async (req, res, next) => {
  const { user_id } = req.body;
  const liked_book_id = req.params.bookid;

  try {
    // 해당 유저 id에 대해 liked_book_id가 각각 users 테이블과 books 테이블에 존재하는지 확인
    await checkUserAndBook(user_id, liked_book_id, next);
    //문제점 => 해당 유저 id에 대해 liked_book_id가 없다면 삭제 해주면 안됨
    let selectSql = `SELECT * FROM likes WHERE user_id = ? AND liked_book_id = ? `;
    let sql = `DELETE FROM likes WHERE user_id =? AND liked_book_id = ?`;
    let values = [user_id, liked_book_id];
    const selectResults = await queryAsync(selectSql, values);

    if (selectResults.length == 0) {
      const error = new Error(
        "해당 유저는 해당 책에 대해 좋아요를 누르지 않았습니다."
      );
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }
    const insertResults = await queryAsync(sql, values);
    if (insertResults.affectedRows == 0) {
      const error = new Error("좋아요 삭제 실패했습니다.");
      error.statusCode = StatusCodes.BAD_REQUEST;
      return next(error);
    }

    res.status(StatusCodes.OK).json({
      message: "좋아요 삭제 성공했습니다.",
      insertResults,
    });
  } catch (err) {
    handleServerError(err, next);
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

const checkUserAndBook = async (user_id, liked_book_id, next) => {
  let checkuserSql = `SELECT * FROM users WHERE id = ?`;
  const userResults = await queryAsync(checkuserSql, user_id);
  if (userResults.length == 0) {
    const error = new Error("해당 유저 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    return next(error);
  }
  let checkBookSql = `SELECT * FROM books WHERE id = ?`;
  const bookResults = await queryAsync(checkBookSql, liked_book_id);
  if (bookResults.length == 0) {
    const error = new Error("해당 책에 대한 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    return next(error);
  }
};
module.exports = { addLike, deleteLike };
