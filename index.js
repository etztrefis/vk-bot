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

  //CHECK TO COMMAND
  switch (ctx.message.body) {
    case "!меню":
      const connection = mysql.createConnection({
        host: process.env.SERVERNAME,
        user: process.env.USERNAME,
        database: process.env.DBNAME,
        password: process.env.PASSWORD,
      });
      connection.connect(function (err) {
        if (err) {
          return console.error("Error: " + err.message);
        } else {
          console.log("Successfuly connected.");
        }
      });

      connection.end(function(err){
        if(err){
          return console.log("Error: " + err.message);
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
