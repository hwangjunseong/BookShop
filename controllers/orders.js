const { StatusCodes } = require("http-status-codes");
const conn = require("../util/mariadb");

//주문하기
const createOrder = async (req, res, next) => {
  const { items, delivery, totalQuantity, totalPrice, firstBookTitle } =
    req.body;
  const userId = req.userId;

  //items와 delivery는 json array
  //items에 cartitemid, bookid, quantity가 들어있는 json으로 들어있는 배열
  // => 여기서 cartitemid만 따로 들어있는 배열로 수정 items :[cartitemid, cartitemid ...]
  //이후 select해서 bookid와 qunatity 꺼냄
  //delivery에는 address, receiver, contact
  //나머지는 숫자
  //insert 순서 : delivery →orders → orderedbooks

  try {
    checkUserIdisUndefined(userId);
    await checkUser(userId);

    let sql, values, results;
    //items 가지고 장바구니에서 book_id과 quantity 조회
    sql = `SELECT book_id, quantity FROM cartitems WHERE id in (?)`;
    //이중배열
    let orderItems = await queryAsync(sql, [items]);
    // console.log(orderItems);
    if (orderItems.length === 0) {
      const error = new Error(
        "해당 cartitem에 담긴 book_id와 quantity가 없습니다"
      );
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      throw error;
    }

    sql = `INSERT INTO delivery (address, receiver, contact) VALUES (?, ?, ?)`;
    values = [delivery.address, delivery.receiver, delivery.contact];
    results = await queryAsync(sql, values);
    // console.log(results);
    if (results.affectedRows == 0) {
      const error = new Error("배달 정보 입력에 실패했습니다.");
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      throw error;
    }
    //results 객체가 insertId(PK 값)를 돌려줌
    const delivery_id = results.insertId;

    // 주문 정보 입력
    sql = `INSERT INTO orders (book_title, total_quantity, total_price, user_id, delivery_id) 
    VALUES (?, ?, ?, ?, ?)`;
    values = [firstBookTitle, totalQuantity, totalPrice, userId, delivery_id];
    results = await queryAsync(sql, values);
    // console.log(results);
    if (results.affectedRows == 0) {
      const error = new Error(" 주문 정보 입력에 실패했습니다.");
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      throw error;
    }
    //pk값
    const order_id = results.insertId;

    // 주문 상세 목록 입력
    sql = `INSERT INTO orderedbooks (order_id, book_id, quantity)
    VALUES ?`;
    values = [];
    orderItems.forEach((item) => {
      values.push([order_id, item.book_id, item.quantity]);
      // console.log(values);
    });
    //[ [ 2, 1, 2 ], [ 2, 2, 1 ] ]
    //이런식으로 들어가고 배열로 묶어야한다 => INSERT 문을 한번에 함

    results = await queryAsync(sql, [values]);
    // console.log(results);
    if (results.affectedRows == 0) {
      const error = new Error(" 주문 상세 목록 입력에 실패했습니다.");
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      throw error;
    }
    //이제 여기서 items에 있는 cartitemid로 장바구니를 비워줘야함
    sql = `DELETE FROM cartitems WHERE id in (?)`;
    results = await queryAsync(sql, [items]);

    if (results.affectedRows == 0) {
      const error = new Error(
        "카트 아이템에서 해당 cartitemid에 대해 삭제를 실패했습니다."
      );
      error.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      throw error;
    }
    res.status(StatusCodes.OK).json({
      message: "주문에 성공했습니다",
    });
  } catch (err) {
    handleServerError(err, next);
  }
};
//주문목록 조회
const getOrders = async (req, res, next) => {
  //delivery id 기준으로 join 걸어서 select
  const userId = req.userId;

  try {
    checkUserIdisUndefined(userId);
    await checkUser(userId);
    const sql = `SELECT orders.id, orders.created_at,  address, receiver, contact , orders.book_title, orders.total_quantity, orders.total_price
    FROM orders LEFT JOIN delivery
    ON orders.delivery_id  = delivery.id
    WHERE orders.user_id =?`;
    const values = [userId];
    results = await queryAsync(sql, values);
    // console.log(results);
    if (results.length === 0) {
      const error = new Error("카트에 담긴 아이템이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }
    res.status(StatusCodes.OK).json({
      message: "주문 목록 조회 성공",
      results,
    });
  } catch (err) {
    handleServerError(err, next);
  }
};
//주문 상품 상세 조회
const getOrderDetail = async (req, res, next) => {
  const { orderid } = req.params;
  const userId = req.userId;

  // console.log(orderid);
  //orderid 가지고 orderedbooks 테이블에서  SELECT해서 나온 book_id 가지고 books 테이블에 join 걸어서 가져옴
  //book_id, book_title, price, quantity 줌
  try {
    checkUserIdisUndefined(userId);
    await checkUser(userId);
    let sql = `SELECT orderedbooks.book_id, title, price, quantity
    FROM orderedbooks
    LEFT JOIN books ON orderedbooks.book_id = books.id
    LEFT JOIN orders ON orderedbooks.order_id = orders.id
    WHERE orderedbooks.order_id =? AND orders.user_id =?`;
    const values = [orderid, userId];
    const results = await queryAsync(sql, values);

    // console.log(results);
    if (results.length === 0) {
      const error = new Error("주문된 책들이 없습니다.");
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }
    res.status(StatusCodes.OK).json({
      message: "주문 목록 조회 성공",
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

const checkUserIdisUndefined = (user_id) => {
  if (!user_id) {
    const error = new Error("로그인이 필요합니다.");
    error.statusCode = StatusCodes.UNAUTHORIZED;
    throw error;
  }
};
const checkUser = async (user_id) => {
  let checkuserSql = `SELECT * FROM users WHERE id = ?`;
  const userResults = await queryAsync(checkuserSql, user_id);
  if (userResults.length == 0) {
    const error = new Error("해당 유저 정보가 없습니다.");
    error.statusCode = StatusCodes.BAD_REQUEST;
    throw error;
  }
};
const handleServerError = (err, next) => {
  if (!err.statusCode) {
    err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
  next(err);
};

module.exports = { createOrder, getOrders, getOrderDetail };
