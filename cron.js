require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const mysql = require("mysql2");
const ConnectionConfig = require("mysql2/lib/connection_config");

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
  Menu.DayOfWeek = ? AND
  Dishes.DishID = Menu.DishID
  `;
  connection.query(query, dayOfWeek, function (mainErr, mainResult) {
    if (mainErr) {
      console.error(mainErr);
    }
    if (mainResult[0] != undefined) {
      let row = [
        mainResult[0].Name,
        mainResult[0].Price,
        mainResult[0].EnergyValue,
        mainResult[1].Name,
        mainResult[1].Price,
        mainResult[1].EnergyValue,
        mainResult[2].Name,
        mainResult[2].Price,
        mainResult[2].EnergyValue,
        mainResult[3].Name,
        mainResult[3].Price,
        mainResult[3].EnergyValue,
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
    } else {
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
