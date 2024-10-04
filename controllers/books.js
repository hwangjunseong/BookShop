const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

const getBooks = async (req, res, next) => {
  const currentPage = req.query.page || 1; //undefined이면 default page 1
  const { category_id } = req.query;
  const perPage = 8;
  const offset = (currentPage - 1) * perPage;

  try {
    if (category_id) {
      //books 테이블과 category 테이블을 내부 조인 , 좋아요 수는 아직 안함
      let sql = `SELECT books.id, books.title, books.img, books.summary, books.author, books.price, books.pub_date ,category.name FROM books JOIN category ON books.category_id = category.id where category_id = ?ORDER BY books.pub_date DESC LIMIT ? OFFSET ? `;
      let values = [category_id, perPage, offset];

      const results = await queryAsync(sql, values);

      if (results.length == 0) {
        const error = new Error("해당 페이지에 대한 책들이 없습니다.");
        error.statusCode = StatusCodes.NOT_FOUND;
        return next(error);
      }
      //   console.log(results);

      res.status(StatusCodes.OK).json({
        message: "카테고리별 전체 도서 조회",
        books: results, //해당 페이지에 대한 책들 반환
      });
    } else {
      //MariaDB에서는 LIMIT 및 OFFSET을 사용할 때는 = 기호 없이 값을 제공해야 함
      //아니면 템플릿 리터럴 ${} 사용
      let sql = `SELECT * FROM books ORDER BY books.pub_date DESC LIMIT ? OFFSET ?`;
      let values = [perPage, offset];

      const results = await queryAsync(sql, values);
      if (results.length == 0) {
        const error = new Error("해당 페이지에 대한 책들이 없습니다.");
        error.statusCode = StatusCodes.NOT_FOUND;
        return next(error);
      }
      // console.log(results);

      res.status(StatusCodes.OK).json({
        message: "전체 도서 조회",
        books: results, //해당 페이지에 대한 책들 반환
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

  try {
    let sql = `SELECT * FROM books where id=? `;
    let values = [bookId];

    const results = await queryAsync(sql, values);
    if (results.length == 0) {
      const error = new Error("해당 책 id를 가진 책이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      return next(error);
    }
    // console.log(results);

    res.status(StatusCodes.OK).json({
      message: "개별 상세 도서 조회",
      book: results[0], //해당 책 id에 대한 정보 반환
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
