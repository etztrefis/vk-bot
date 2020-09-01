require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const mysql = require("mysql2");

const bot = new VkBot({
  token: process.env.TOKEN,
  group_id: process.env.GROUP_ID,
  secret: process.env.SECRET,
  confirmation: process.env.CONFIRMATION,
});

console.log("Cron Started.");

const connection = mysql.createPool({
  connectionLimit: 15,
  host: process.env.SERVERNAME,
  user: process.env.USERNAME,
  database: process.env.DBNAME,
  password: process.env.PASSWORD,
});

let now = new Date();
let dayOfWeek = now.getDay() + 1;
let year = now.getFullYear();
let month = now.getMonth();
let mday = now.getDate() + 1;

let hardDays = [1, 2, 3, 4, 5, 6, 7, 8, 9];
if (hardDays.includes(mday)) {
  mday = "0" + mday;
}
if (hardDays.includes(month)) {
  month = "0" + month;
}

let query =
  "SELECT F.Name AS First, M.FirstPrice, S.Name AS Second, M.SecondPrice, T.Name AS Salad, M.SaladPrice, L.Name AS Liquid, M.LiquidPrice FROM Menu M LEFT OUTER JOIN Dishes F ON F.DishID = M.First LEFT OUTER JOIN Dishes S ON S.DishID = M.Second LEFT OUTER JOIN Dishes T ON T.DishID = M.Salad LEFT OUTER JOIN Dishes L ON L.DishID = M.Liquid WHERE M.DayOfWeek = ?";
connection.query(query, dayOfWeek, function (err, result) {
  if (err) {
    console.log(err.message);
  }
  if (result !== 0) {
    let row = [
      result[0].First,
      result[0].FirstPrice,
      result[0].Second,
      result[0].SecondPrice,
      result[0].Salad,
      result[0].SaladPrice,
      result[0].Liquid,
      result[0].LiquidPrice,
    ];
    for (let i = 0; i < row.length; i++) {
      if (row[i] === null) {
        row[i] = "  -  ";
      }
    }
    let message = `📅 Меню на: ${mday}.${month}.${year}\r\n\r\n
                    1. ${row[0]} ${row[1]} руб. 
                    2. ${row[2]} ${row[3]} руб. 
                    3. ${row[4]} ${row[5]} руб. 
                    4. ${row[6]} ${row[7]} руб. \r\n`;

    connection.query("SELECT UID FROM Users", function (UIDerror, usersResult) {
      if (UIDerror) {
        console.log(UIDerror.message);
      }
      for (let i = 0; i < usersResult.length; i++) {
        bot.sendMessage(usersResult[i].UID, message);
      }
    });
  }
});
