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
  connectionLimit: 3,
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

const scene = new Scene('order',
  (ctx) => {
    ctx.scene.next()
    ctx.reply('Напишите номера блюд из меню через запятую на: ' + mday + "." + month + "." + year + ' Например => "2,3,1". Будьте внимательны к дате. ')
  },
  (ctx) => {
    mainOrder = ctx.message.body;
    mainOrder = mainOrder.replace(/\s+/g, '');
    finalOrder = mainOrder.split(/,\s*/);
    for (let i = 0; i < finalOrder.length; i++) {
      if (!isNaN(finalOrder[i])) { }
      else {
        ctx.reply("Неверный ввод заказа. Возможно допущены строковые символы.");
        ctx.scene.leave();
        break;
      }
    }
    try {
      ctx.reply("Вы уверены? (Да или нет)");
      ctx.scene.next();
    } catch (err) { }
  },
  (ctx) => {
    console.log(finalOrder);
    let yesOrNo = ctx.message.body;
    if (yesOrNo === "Да" || yesOrNo === "да") {
      connection.query("SELECT SUM(Price) as Sum FROM Courses WHERE CourseID IN(?)", finalOrder, function (err0, result) {
        if (err0) console.log(err0);
        console.log(result);
      });
      let add = [
        '',
        now,
        ctx.message.user_id,
        finalOrder[0],
        finalOrder[1],
        finalOrder[2],
        finalOrder[3],
        95,
      ];

      for (let i = 0; i < add.length; i++) {
        if (!add[i]) {
          add[i] = '';
        }
      }
      console.log(add);
      connection.query("INSERT INTO Orders VALUES ?", add, function (err) {
        if (err) console.log(err);
        else {
          for (let i = 0; i < finalOrder; i++) {
            connection.query("UPDATE Products SET Amount = Amount-100 WHERE id=?", finalOrder[i], function (err1) {
              if (err1) console.log(err1);
              else {
                ctx.reply("Ваш заказ: " + finalOrder + " добавлен в систему. Будьте внимательны! Вы можете удалить или изменить свой заказ до 05:00 " + mday + "." + month + "." + year + ".");
              }
            });
          }
        }
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
      ctx.scene.enter('order')
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
    default:
      ctx.reply("Неизвестная команда.");
  }
});





