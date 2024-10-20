const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

//(카테고리 별, 신간 여부) 전체 도서 목록 조회
const getBooks = async (req, res, next) => {
  const currentPage = +req.query.page >= 1 ? +req.query.page : 1; //int
  const category_id = +req.query.category_id >= 0 ? +req.query.category_id : -1; //int
  const new_book = req.query.new_book === "true" ? true : false; //boolean
  //category_id는 0부터 시작하고 new_book은 false이거나 true임
  const perPage = +req.query.limit > 0 ? +req.query.limit : 1;
  const offset = (currentPage - 1) * perPage;
  // console.log("offset", offset);
  // console.log("perPage", perPage);
  try {
    let sql = `SELECT sql_calc_found_rows *,
    (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes
    FROM books LEFT JOIN category ON books.category_id = category.category_id `;

    const values = [];

    if (category_id >= 0 && new_book) {
      sql += `where books.category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW() `;
      values.push(category_id);
      // console.log(`0`);
    } else if (category_id >= 0 && !new_book) {
      sql += `where books.category_id = ? `;
      values.push(category_id);
      // console.log(`1`);
    } else if (category_id === -1 && new_book) {
      sql += `WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW() `;
      // console.log(`2`);
    } else {
      console.log(`3`);
    }
    sql += `LIMIT ? OFFSET ?`;
    values.push(perPage, offset);
    const results = await queryAsync(sql, values);
    console.log(results);
    if (results.length === 0) {
      const error = new Error("해당 페이지에 대한 책들이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }
    //totalCounts계산 위에서 개수가 0인거는 이미 체크해서 아래에서는 또할필요없다
    sql = `SELECT found_rows()`;
    const totalCountsResults = await queryAsyncNoParams(sql);
    // console.log(totalCountsResults);
    let pagination = {
      totalCounts: +totalCountsResults[0]["found_rows()"],
      currentPage: currentPage,
    };
    if (category_id >= 0) {
      res.status(StatusCodes.OK).json({
        message: new_book
          ? "카테고리별 전체 신간 도서 조회"
          : "카테고리별 전체 도서 조회",
        books: results,
        pagination,
      });
    } else {
      res.status(StatusCodes.OK).json({
        message: new_book ? "전체 신간 도서 조회" : "전체 도서 조회",
        books: results,
        pagination,
      });
    }
  } catch (err) {
    handleServerError(err, next);
  }
};

const getBookDetail = async (req, res, next) => {
  //로그인 상태가 아니면 liked(내가 해당 책에 대해 좋아요를 눌렀는지 여부) 제외하고 보내줌
  //로그인 상태라면 liked 추가해서 보내줌
  const { bookId } = req.params;
  const user_id = req.userId;
  const liked_book_id = bookId;
  try {
    let sql,
      values = [];
    sql = `
    SELECT * , 
    (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes`;
    if (user_id) {
      sql += `  ,(SELECT EXISTS (SELECT * FROM likes WHERE user_id= ? AND liked_book_id=?)) AS liked `;
      values.push(user_id, liked_book_id);
    }

    sql += `
    FROM books 
    LEFT JOIN category ON books.category_id = category.category_id
    WHERE books.id = ?;
    `;
    values.push(bookId);

    const results = await queryAsync(sql, values);
    if (results.length == 0) {
      const error = new Error("해당 책 id를 가진 책이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }

    res.status(StatusCodes.OK).json({
      message: "개별 상세 도서 조회",
      book: results[0], // category_id를 제외한 책 정보 반환
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
module.exports = { getBooks, getBookDetail };
