require("dotenv").config();
const mysql = require("mysql2");
const fs = require("fs");

console.log("Start logging.");

const connection = mysql.createPool({
  connectionLimit: 15,
  host: process.env.SERVERNAME,
  user: process.env.USERNAME,
  database: process.env.DBNAME,
  password: process.env.PASSWORD,
});

connection.query("SELECT * FROM Orders", function (err, result) {
  if (err) {
    console.log(err.message);
  }
  for (let i = 0; i < result.length; i++) {
    connection.query(
      //result[i].Date DATE DOESNT WORK
      `INSERT INTO Orders_Logs(Date, UserID, Dish, Price) VALUES (${result[i].Date}, ${result[i].UserID}, ${result[i].Dish}, ${result[i].Price})`,
      function (logError) {
        if (logError) {
          console.log(logError.message);
        }
      }
    );
    console.log(`Data copied into orders_logs ... ${i}`);
  }
});

setTimeout(
  () =>
    connection.query("DELETE FROM Orders", function (delError) {
      if (delError) {
        console.log(delError.message);
      }
      console.log("Data has been logged.");
    }),
  5000
);
