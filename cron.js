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
try {
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

  let query = `SELECT 
  Dishes.Name, Dishes.Price, Dishes.EnergyValue
FROM
  eaterymain.Menu,
  eaterymain.Dishes
WHERE
  Menu.DayOfWeek = 3 AND
  Dishes.DishID = Menu.DishID
  `;
  connection.query(query, dayOfWeek, function (mainErr, mainResult) {
    if (mainErr) {
      console.err(mainErr);
    }
    if (mainResult !== 0) {
      let row = [
        result[0].Name,
        result[0].Price,
        result[0].EnergyValue,
        result[1].Name,
        result[1].Price,
        result[1].EnergyValue,
        result[2].Name,
        result[2].Price,
        result[2].EnergyValue,
        result[3].Name,
        result[3].Price,
        result[3].EnergyValue,
      ];
      for (let i = 0; i < row.length; i++) {
        if (row[i] === null) {
          row[i] = "  -  ";
        }
      }
      let message = `📅 Меню на: ${mday}.${month}.${year}\r\n\r\n
  1. ${row[0]} ${row[1]} руб. | Энерг. ценность: ${row[2]} ккал.
  2. ${row[3]} ${row[4]} руб. | Энерг. ценность: ${row[5]} ккал. 
  3. ${row[6]} ${row[7]} руб. | Энерг. ценность: ${row[8]} ккал. 
  4. ${row[9]} ${row[10]} руб. | Энерг. ценность: ${row[11]} ккал. \r\n`;

      connection.query("SELECT UID FROM Users", function (
        UIDerror,
        usersResult
      ) {
        if (UIDerror) {
          console.error(UIDerror);
        }
        for (let i = 0; i < usersResult.length; i++) {
          bot.sendMessage(usersResult[i].UID, message);
        }
      });
    }
  });
} catch (e) {
  console.error(e);
  connection.query("SELECT UID FROM Users", function (
    catchUIDerror,
    catchUsersResult
  ) {
    if (catchUIDerror) {
      console.error(catchUIDerror);
    }
    for (let i = 0; i < catchUsersResult.length; i++) {
      bot.sendMessage(
        catchUsersResult[i].UID,
        "Записей о меню на завтрашний день в базе не найдено. 🚫"
      );
    }
  });
}
