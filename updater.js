require("dotenv").config();
const mysql = require("mysql2");
const fs = require("fs");

console.log("Start logging.");
try {
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
        `INSERT INTO Orders_Logs(Date, UserID, DishID, Price) VALUES (?, ${result[i].UserID}, ${result[i].DishID}, ${result[i].Price})`,
        result[i].Date,
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
} catch (e) {
  console.log(e);
}
