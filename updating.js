require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const Scene = require('node-vk-bot-api/lib/scene');
const Stage = require('node-vk-bot-api/lib/stage');
const Session = require('node-vk-bot-api/lib/session');
const mysql = require("mysql2");
const fs = require("fs");

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

connection.query("SELECT * FROM Orders", function (err, result) {
    if (err) { console.log(err.message); }
    let date = now + "\r\n";
    let orders = result;
    fs.appendFile("orders.txt", date, function (error) {
        if (error) throw error;
    });
    for (let i = 0; i < orders.length; i++) {
        let message = "ID:" + orders[i].ID + " Date: " + orders[i].Date + " UserID: " + orders[i].UserID + " First: " + orders[i].First + " Second: " + orders[i].Second + " Third: " + orders[i].Third + " Fourth: " + orders[i].Fourth + " TotalPrice: " + orders[i].TotalPrice + "\r\n\r\n";
        fs.appendFile("orders.txt", message, function (error) {
            if (error) throw error;
            if (!error) {
                connection.query("DELETE FROM Orders", function (err) {
                    if (!err) { console.log('Deleted.'); }
                    if (err) { console.log(err.message); }
                });
            }
        });
    }
});