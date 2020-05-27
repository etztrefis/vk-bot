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
  connectionLimit: 2,
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

const scene = new Scene('order',
  (ctx) => {
    ctx.scene.next()
    ctx.reply('Напишите номера блюд из меню через запятую на: ' + mday + "." + month + "." + year + ' Например => "2,3,1". Будьте внимательны к дате. ')
  },
  (ctx) => {
    let numbers = ctx.message.body;
    ctx.reply("Ваш заказ: " + numbers + ".  Будьте внимательны! Вы можете удалить или изменить свой заказ до 05:00 " + mday + "." + month + "." + year + ".");
    ctx.scene.leave()
  },
)
const session = new Session()
const stage = new Stage(scene)

bot.use(session.middleware())
bot.use(stage.middleware())
//ДОБАВИТЬ ПРОВЕРКИ
bot.command('!заказ', (ctx) => {
  ctx.scene.enter('order')
})

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





