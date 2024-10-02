const mysql = require("mysql2");
// Create the connection to database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "BookShop",
  password: "root",
  dateStrings: true, //뒤에 오는 .000Z없앰 =>vscode로 db에 있는거 불러올 때 string으로 부르는게 아니라 날 것의 상태로 불러왔었음
  //   timezone: "Asia/Seoul", //db에 있는 시간대 불러옴
});
module.exports = connection;
