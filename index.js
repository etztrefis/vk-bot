require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const Scene = require('node-vk-bot-api/lib/scene');
const Stage = require('node-vk-bot-api/lib/stage');
const Session = require('node-vk-bot-api/lib/session');
const fs = require("fs");
const mysql = require("mysql2");

const bot = new VkBot({
  token: process.env.TOKEN,
  group_id: process.env.GROUP_ID,
  secret: process.env.SECRET,
  confirmation: process.env.CONFIRMATION,
});

const connection = mysql.createPool({
  connectionLimit: 10,
  host: process.env.SERVERNAME,
  user: process.env.USERNAME,
  database: process.env.DBNAME,
  password: process.env.PASSWORD,
});

bot.startPolling(() => {
  console.log("Bot started.");
});

let now = new Date();
let year = now.getFullYear();
let month = now.getMonth();
let mday = now.getDate() + 1;
let mainOrder = "";
let finalOrder = [4];
let totalPrice = [];
let orderMax = [];
let orderInfo = [];

const scene = new Scene('order',
  (ctx) => {
    ctx.scene.next()
    ctx.reply('Напишите номера блюд из меню через запятую на: ' + mday + "." + month + "." + year + ' Например => "2,3,1". Будьте внимательны к дате. ')
  },
  (ctx) => {
    mainOrder = ctx.message.body;
    mainOrder = mainOrder.replace(/\s+/g, '');
    finalOrder = mainOrder.split(/,\s*/);
    finalOrder.sort((a, b) => a - b);
    orderMax = finalOrder.slice();
    for (let i = 0; i < finalOrder.length; i++) {
      if (!isNaN(finalOrder[i])) { }
      else {
        ctx.reply("Неверный ввод заказа. Возможно допущены строковые символы.");
        ctx.scene.leave();
        break;
      }
    }
    let now = new Date();
    let dayOfWeek = now.getDay() + 1;
    let query = "SELECT F.CourseID as First, M.FirstPrice, S.CourseID as Second, M.SecondPrice, T.CourseID as Salad, M.SaladPrice, L.CourseID as Liquid, M.LiquidPrice FROM Menu M LEFT OUTER JOIN Courses F ON F.CourseID = M.First LEFT OUTER JOIN Courses S ON S.CourseID = M.Second LEFT OUTER JOIN Courses T ON T.CourseID = M.Salad LEFT OUTER JOIN Courses L ON L.CourseID = M.Liquid WHERE M.DayOfWeek = ?";
    connection.query(query, dayOfWeek, function (err, result) {
      if (err) { console.log(err.message) }
      if (result !== 0) {
        let row = [result[0].First, result[0].FirstPrice, result[0].Second, result[0].SecondPrice, result[0].Salad, result[0].SaladPrice, result[0].Liquid, result[0].LiquidPrice];
        for (let i = 0; i < row.length; i++) {
          if (row[i] === null) { row[i] = 0; }
        }
        if (orderMax.indexOf(orderMax[0]) != -1) { orderMax[0] = row[0]; }
        else if (orderMax.indexOf(orderMax[0]) == -1) { orderMax[0] = 'null' }
        if (orderMax.indexOf(orderMax[1]) != -1) { orderMax[1] = row[2]; }
        else if (orderMax.indexOf(orderMax[1]) == -1) { orderMax[1] = 'null' }
        if (orderMax.indexOf(orderMax[2]) != -1) { orderMax[2] = row[4]; }
        else if (orderMax.indexOf(orderMax[2]) == -1) { orderMax[2] = 'null' }
        if (orderMax.indexOf(orderMax[3]) != -1) { orderMax[3] = row[6]; }
        else if (orderMax.indexOf(orderMax[3]) == -1) { orderMax[3] = 'null' }
      }
    });
    try {
      ctx.reply("Вы уверены? (Да или нет)");
      ctx.scene.next();
    } catch (err) { }
  },
  (ctx) => {
    let yesOrNo = ctx.message.body;
    if (yesOrNo === "Да" || yesOrNo === "да") {
      connection.query("SELECT SUM(Price) as Sum FROM Courses WHERE CourseID IN(?,?,?,?)", orderMax, function (err0, result) {
        if (err0) console.log(err0);
        totalPrice = result;
      });
      var date;
      date = new Date();
      date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' +
        ('00' + date.getUTCHours()).slice(-2) + ':' +
        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        ('00' + date.getUTCSeconds()).slice(-2);

      let add = [
        date,
        ctx.message.user_id,
        orderMax[0],
        orderMax[1],
        orderMax[2],
        orderMax[3],
        100,
      ];

      for (let i = 0; i < add.length; i++) {
        if (add[i] == 'null') {
          add[i] = 0;
        }
      }
      console.log(add);
      connection.query("INSERT INTO Orders(Date, UserID, First, Second, Third, Fourth, TotalPrice) VALUES (?,?,?,?,?,?,?)", add, function (err) {
        if (err) console.log(err);
        for (let i = 0; i < orderMax.length; i++) {
          connection.query("UPDATE Products SET Amount = Amount-100 WHERE ProductID=?", orderMax[i], function (err1) {
            if (err1) console.log(err1);
          });
        }
        ctx.reply("Ваш заказ: " + finalOrder + " добавлен в систему. Стоимость: " + totalPrice[0].Sum + " рублей. \r\n Будьте внимательны! Вы можете удалить или изменить свой заказ до 05:00 " + mday + "." + month + "." + year + ".");
        ctx.scene.leave();
      });
    }
    else if (yesOrNo === "Нет" || yesOrNo === "нет") { ctx.reply("Заказ отменен."); ctx.scene.leave(); }
    else { ctx.reply("Принимаются только значения да или нет."); }
  },
);
const session = new Session();
const stage = new Stage(scene);

bot.use(session.middleware());
bot.use(stage.middleware());
//ДОБАВИТЬ ПРОВЕРКИ

bot.command('!заказ', (ctx) => {
  let id = ctx.message.user_id;
  connection.query("SELECT * FROM Users WHERE ID = ?", id, function (err, results) {
    if (err) { console.log(err.message); }
    if (results.length != 0) {
      connection.query("SELECT * FROM Orders WHERE UserID = ?", id, function (err, result) {
        if (err) { console.log(err.message); }
        if (result.length == 0) {
          ctx.scene.enter('order')
        }
        else {
          ctx.reply("Вы уже имеете заказ. Если хотите создать новый - сначала удалите старый или измените его.");
        }
      });
    }
    else { ctx.reply("Вы не можете использовать эту команду, так как вас нету в базе предприятия."); }
  });
});

bot.event("message_new", (ctx) => {
  //WRITNIG LOGS IN LOGS.TXT FILE
  let now = new Date();
  let info =
    now +
    " message:" +
    ctx.message.body +
    " id:" +
    ctx.message.user_id +
    "\r\n";
  fs.appendFile("logs.txt", info, function (error) {
    if (error) throw error;
  });

  //CHECK TO COMMAND
  switch (ctx.message.body) {
    case "!меню":
    case "!Меню":
      let id = ctx.message.user_id;
      connection.query("SELECT * FROM Users WHERE ID = ?", id,
        function (err, results) {
          if (err) { console.log(err.message); }
          if (results.length != 0) {
            let now = new Date();
            let dayOfWeek = now.getDay() + 1;
            let year = now.getFullYear();
            let month = now.getMonth();
            let mday = now.getDate() + 1;

            let query = "SELECT F.Name as First, M.FirstPrice, S.Name as Second, M.SecondPrice, T.Name as Salad, M.SaladPrice, L.Name as Liquid, M.LiquidPrice FROM Menu M LEFT OUTER JOIN Courses F ON F.CourseID = M.First LEFT OUTER JOIN Courses S ON S.CourseID = M.Second LEFT OUTER JOIN Courses T ON T.CourseID = M.Salad LEFT OUTER JOIN Courses L ON L.CourseID = M.Liquid WHERE M.DayOfWeek = ?";
            connection.query(query, dayOfWeek, function (err, result) {
              if (err) { console.log(err.message) }
              if (result !== 0) {
                let row = [result[0].First, result[0].FirstPrice, result[0].Second, result[0].SecondPrice, result[0].Salad, result[0].SaladPrice, result[0].Liquid, result[0].LiquidPrice];
                for (let i = 0; i < row.length; i++) {
                  if (row[i] === null) { row[i] = "-"; }
                }
                ctx.reply("Меню на: " + mday + "." + month + "." + year + "\r\n \r\n" +
                  "1." + row[0] + " " + row[1] + " руб.\r\n" +
                  "2." + row[2] + " " + row[3] + " руб.\r\n" +
                  "3." + row[4] + " " + row[5] + " руб.\r\n" +
                  "4." + row[6] + " " + row[7] + " руб.\r\n");
              }
            });
          }
          else {
            ctx.reply("Вы не можете использовать эту команду, так как вас нету в базе предприятия.");
          }
        });
      break;
    case "start":
    case "Start":
      ctx.reply(
        "Начало работы с чат-ботом. \r\n !команды - команды, доступные для использования."
      );
      break;
    case "!удалить":
    case "!Удалить":
      let userID = ctx.message.user_id;
      connection.query("SELECT * FROM Users WHERE ID = ?", userID,
        function (err, results) {
          if (err) { console.log(err.message); }
          if (results.length != 0) {
            connection.query("SELECT First, Second, Third, Fourth FROM Orders WHERE UserID = ?", userID, function (err1, result) {
              if (err1) { console.log(err1.message); }
              orderInfo.push(result[0].First, result[0].Second, result[0].Third, result[0].Fourth);
              /*for (let i = 0; i < orderInfo.length; i++) {
                connection.query("UPDATE Products SET Amount = Amount+100 WHERE ProductID=?", orderInfo[i], function (err2) {
                  if (err2) console.log(err2);
                });
              }*/
              connection.query("DELETE FROM Orders WHERE UserID = ?", userID, function (err3) {
                if (err3) { console.log(err3.message); }
                ctx.reply("Заказ был удален.");
              });
            });
          }
        });
      break;
    default:
      ctx.reply("Неизвестная команда.");
  }
});





