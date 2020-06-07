require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const Scene = require('node-vk-bot-api/lib/scene');
const Stage = require('node-vk-bot-api/lib/stage');
const Session = require('node-vk-bot-api/lib/session');
const mysql = require("mysql2");

const bot = new VkBot({
    token: process.env.TOKEN,
    group_id: process.env.GROUP_ID,
    secret: process.env.SECRET,
    confirmation: process.env.CONFIRMATION,
});

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

let menu = [];

let query = "SELECT F.Name as First, M.FirstPrice, S.Name as Second, M.SecondPrice, T.Name as Salad, M.SaladPrice, L.Name as Liquid, M.LiquidPrice FROM Menu M LEFT OUTER JOIN Courses F ON F.CourseID = M.First LEFT OUTER JOIN Courses S ON S.CourseID = M.Second LEFT OUTER JOIN Courses T ON T.CourseID = M.Salad LEFT OUTER JOIN Courses L ON L.CourseID = M.Liquid WHERE M.DayOfWeek = ?";
connection.query(query, dayOfWeek, function (err, result) {
    if (err) { console.log(err.message) }
    if (result !== 0) {
        let row = [result[0].First, result[0].FirstPrice, result[0].Second, result[0].SecondPrice, result[0].Salad, result[0].SaladPrice, result[0].Liquid, result[0].LiquidPrice];
        for (let i = 0; i < row.length; i++) {
            if (row[i] === null) { row[i] = "-"; }
        }
        let message = ("Меню на: " + mday + "." + month + "." + year + "\r\n \r\n" +
            "1." + row[0] + " " + row[1] + " руб.\r\n" +
            "2." + row[2] + " " + row[3] + " руб.\r\n" +
            "3." + row[4] + " " + row[5] + " руб.\r\n" +
            "4." + row[6] + " " + row[7] + " руб.\r\n");

        connection.query("SELECT ID FROM Users", function (err1, result1) {
            if (err1) { console.log(err1.message) }
            let users = result1;
            for (let i = 0; i < users.length; i++) {
                bot.sendMessage(users[i].ID, message);
            }
        });
    }
});