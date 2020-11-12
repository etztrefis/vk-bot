require("dotenv").config({ path: "../.env" });
const { Sequelize, QueryTypes } = require("sequelize");

console.log("Start logging.");

const sequelize = new Sequelize(
	process.env.DBNAME,
	process.env.USERNAME,
	process.env.PASSWORD,
	{
		host: process.env.SERVERNAME,
		dialect: "mysql",
	}
);
(async () => {
	try {
		const query = await sequelize.query("SELECT * FROM Orders", {
			type: QueryTypes.SELECT,
		});
		if (query.length > 0) {
			for (let i = 0; i < query.length; i++) {
				const queryData = `INSERT INTO 
                             Orders_Logs(Date, UserID, DishID) 
                                VALUES 
                             (${JSON.stringify(
									query[i].Date
								)}, ${JSON.stringify(
					query[i].UserID
				)}, ${JSON.parse(query[i].DishID)})`;
				console.log(queryData);
				const insertLogs = await sequelize.query(queryData, {
					type: QueryTypes.INSERT,
				});
				console.log(`Data copied into orders_logs ... ${i + 1}`);
			}
		}

		setTimeout(() => {
			const deleteQuery = sequelize.query("DELETE FROM Orders", {
				type: QueryTypes.DELETE,
			});
			console.log("Data has been logged.");
		}, 5000);
	} catch (e) {
		console.log(e);
	}
})();
