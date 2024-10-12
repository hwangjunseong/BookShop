const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

//(카테고리 별, 신간 여부) 전체 도서 목록 조회
const getBooks = async (req, res, next) => {
  const currentPage = +req.query.page >= 1 ? +req.query.page : 1; //int
  const category_id = +req.query.category_id >= 0 ? +req.query.category_id : -1; //int
  const new_book = req.query.new_book === "true" ? true : false; //boolean
  //category_id는 0부터 시작하고 new_book은 false이거나 true임
  // console.log(typeof currentPage, typeof category_id, typeof new_book);
  // console.log(currentPage, category_id, new_book);
  const perPage = +req.query.limit > 0 ? +req.query.limt : 1;

  const offset = (currentPage - 1) * perPage;
  try {
    let sql = `SELECT books.id, books.title, books.img, books.summary, books.author, books.price, books.pub_date ,category.category_name ,
    (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes
    FROM books JOIN category ON books.category_id = category.id `;

    const values = [];

    if (category_id >= 0 && new_book) {
      sql += `where category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW() `;
      values.push(category_id);
      console.log(`0`);
    } else if (category_id >= 0 && !new_book) {
      sql += `where category_id = ? `;
      values.push(category_id);
      console.log(`1`);
    } else if (category_id === -1 && new_book) {
      sql += `WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW() `;
      console.log(`2`);
    } else {
      console.log(`3`);
    }
    sql += `LIMIT ? OFFSET ?`;
    values.push(perPage, offset);
    const results = await queryAsync(sql, values);

    if (results.length === 0) {
      const error = new Error("해당 페이지에 대한 책들이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      return next(error);
    }
    if (category_id >= 0) {
      res.status(StatusCodes.OK).json({
        message: new_book
          ? "카테고리별 전체 신간 도서 조회"
          : "카테고리별 전체 도서 조회",
        books: results,
      });
    } else {
      res.status(StatusCodes.OK).json({
        message: new_book ? "전체 신간 도서 조회" : "전체 도서 조회",
        books: results,
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    next(err);
  }
};

const getBookDetail = async (req, res, next) => {
  const { bookId } = req.params;
  const { user_id } = req.body; //아직 jwt 안받아서 body 값으로 줌
  const liked_book_id = bookId;
  try {
    let sql = `
    SELECT * , 
    (SELECT count(*) FROM likes WHERE liked_book_id=books.id) AS likes,
    (SELECT EXISTS (SELECT * FROM likes WHERE user_id= ? AND liked_book_id=?)) AS liked 
    FROM books 
    LEFT JOIN category ON books.category_id = category.category_id
    WHERE books.id = ?;
    `;
    const values = [user_id, liked_book_id, bookId];

    const results = await queryAsync(sql, values);
    if (results.length == 0) {
      const error = new Error("해당 책 id를 가진 책이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      return next(error);
    }

    delete results[0].category_id; // category_id 필드를 삭제
    // console.log(results);

    res.status(StatusCodes.OK).json({
      message: "개별 상세 도서 조회",
      book: results[0], // category_id를 제외한 책 정보 반환
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
    next(err);
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

module.exports = { getBooks, getBookDetail };
