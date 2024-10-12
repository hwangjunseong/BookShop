const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

//장바구니 담기
const postCart = async (req, res, next) => {
  //body로 도서 id, 도서 수량, user id 옴
  const { book_id, quantity, user_id } = req.body;

  try {
    //존재하는 도서 id인지, user id인지 체크
    await checkUser(user_id, next);
    await checkBook(book_id, next);
    //cartitems 테이블에 해당 user_id와 book_id에 대해 quantity가 존재할 경우 해당 quantity만큼 올려준다
    let checksql = `SELECT quantity FROM cartitems 
    WHERE user_id = ? AND book_id = ?`;
    const checkvalues = [user_id, book_id];
    const existingItem = await queryAsync(checksql, checkvalues);
    // console.log(existingItem);
    let sql, values;
    if (existingItem.length > 0) {
      sql = `
        UPDATE cartitems SET quantity = quantity + ?
        WHERE user_id = ? AND book_id = ?
        `;
      values = [quantity, user_id, book_id];
    } else {
      sql = `
        INSERT INTO cartitems (book_id, quantity, user_id)
        VALUES (?,?,?)
        `;
      values = [book_id, quantity, user_id];
    }

    const results = await queryAsync(sql, values);
    // console.log(results);
    if (results.affectedRows == 0) {
      const error = new Error("장바구니에 담기를 실패했습니다.");
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      return next(error);
    }

    res.status(StatusCodes.OK).json({
      message: "장바구니에 담기 성공했습니다",
    });
  } catch (err) {
    handleServerError(err, next);
  }
};

//장바구니 아이템 목록 조회. 선택한 장바구니에서 주문 예상 상품 목록 조회
const getCartItems = async (req, res, next) => {
  const { user_id, selected } = req.body;
  //selected는 cartitemId가 배열로 들어옴
  try {
    await checkUser(user_id, next);
    let sql = `
        SELECT cartitems.id, book_id, title, quantity, price
        FROM cartitems
        LEFT JOIN books ON books.id = cartitems.book_id
        WHERE user_id = ?
        `;

    const values = [user_id];
    if (selected.length > 0) {
      sql += ` AND cartitems.id IN (?)`;
      values.push(selected);
      //   console.log(values);
    }
    const results = await queryAsync(sql, values);
    // console.log(results);

    if (results.length == 0) {
      const error = new Error("해당 user가 장바구니에 책을 담지 않았습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      return next(error);
    }

    res.status(StatusCodes.OK).json({
      message: "장바구니 아이템 목록 조회 성공",
      results,
    });
  } catch (err) {
    handleServerError(err, next);
  }
};

//장바구니 도서 삭제
const removeCartItems = async (req, res, next) => {
  const { cartitemId } = req.params;
  const { user_id } = req.body;

  try {
    //해당 cartitemId가 있는지 user_id가 있는지 체크
    await checkUser(user_id, next);
    await checkCartItem(cartitemId, next);

    let sql = `DELETE FROM cartitems WHERE id = ? AND user_id = ?`;
    const values = [cartitemId, user_id];
    const results = await queryAsync(sql, values);

    if (results.affectedRows == 0) {
      const error = new Error(
        "카트 아이템에서 해당 cartitemid에 대해 삭제를 실패했습니다."
      );
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      return next(error);
    }

    res.status(StatusCodes.OK).json({
      message: "카트아이템에서 삭제 성공",
      results,
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
const checkUser = async (user_id, next) => {
  let checkuserSql = `SELECT * FROM users WHERE id = ?`;
  const userResults = await queryAsync(checkuserSql, user_id);
  if (userResults.length == 0) {
    const error = new Error("해당 유저 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    return next(error);
  }
};
const checkBook = async (book_id, next) => {
  let checkBookSql = `SELECT * FROM books WHERE id = ?`;
  const bookResults = await queryAsync(checkBookSql, book_id);
  if (bookResults.length == 0) {
    const error = new Error("해당 책에 대한 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    return next(error);
  }
};
const checkCartItem = async (cartitems_id, next) => {
  let checkcartitemSql = `SELECT * FROM cartitems WHERE id = ?`;
  const cartitemResults = await queryAsync(checkcartitemSql, cartitems_id);
  //   console.log(cartitemResults);
  if (cartitemResults.length == 0) {
    const error = new Error("해당 카트 아이템 아이디 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    return next(error);
  }
};
module.exports = { postCart, getCartItems, removeCartItems };
