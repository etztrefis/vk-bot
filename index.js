require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const fs = require("fs");
const mysql = require("mysql2");

const bot = new VkBot({
  token: process.env.TOKEN,
  group_id: process.env.GROUP_ID,
  secret: process.env.SECRET,
  confirmation: process.env.CONFIRMATION,
});

bot.startPolling(() => {
  console.log("Bot started.");
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

  bot.command('!Заказ', (ctx) => {
    ctx.scene.enter('Создание заказа');
  });

  /*cosnt scene = new Scene('Создание заказа',
    (ctx) => {
      ctx.scene.next();
      ctx.reply('How old are you?');
    },
    
  );*/

  //CHECK TO COMMAND
  switch (ctx.message.body) {
    case "!меню":
      const connection = mysql.createPool({
        connectionLimit: 2,
        host: process.env.SERVERNAME,
        user: process.env.USERNAME,
        database: process.env.DBNAME,
        password: process.env.PASSWORD,
      });
      let id = ctx.message.user_id;

      connection.query("SELECT * FROM Users WHERE ID = ?", id,
        function (err, results) {
          if (err) { console.log(err.message); }
          if (results.length != 0) {
            let now = new Date();
            let dayOfWeek = now.getDay();
            let year = now.getFullYear();
            let month = now.getMonth();
            let mday = now.getDate() + 1;
            connection.query("SELECT First, FirstPrice, Second, SecondPrice, Salad, SaladPrice, Liquid, LiquidPrice FROM Menu WHERE DayOfWeek = ?",
              dayOfWeek, function (err, result) {
                if (err) { console.log(err.message) }
                if (result != 0) {
                  ctx.reply("Меню на: " + mday + "." + month + "." + year + "\r\n \r\n"
                  );
                  console.log(result);

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
