const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const app = express();

app.listen(process.env.PORT);
// JSON 형태의 요청 body를 파싱하기 위해 express.json() 미들웨어를 사용
app.use(express.json());
const userRouter = require("./routes/users");
const bookRouter = require("./routes/books");
const likesRouter = require("./routes/likes");
const cartRouter = require("./routes/carts");
const orderRouter = require("./routes/orders");

app.use("/users", userRouter);
app.use("/books", bookRouter);
app.use("/likes", likesRouter);
app.use("/carts", cartRouter);
app.use("/orders", orderRouter);
