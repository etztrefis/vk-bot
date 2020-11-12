require("dotenv").config({ path: "../.env" });
const VkBot = require("node-vk-bot-api");
const { Sequelize, QueryTypes } = require("sequelize");

const bot = new VkBot({
	token: process.env.TOKEN,
	group_id: process.env.GROUP_ID,
	secret: process.env.SECRET,
	confirmation: process.env.CONFIRMATION,
});

const sequelize = new Sequelize(
	process.env.DBNAME,
	process.env.USERNAME,
	process.env.PASSWORD,
	{
		host: process.env.SERVERNAME,
		dialect: "mysql",
	}
);
console.log("CronJob started.");
(async () => {
	try {
		const now = new Date(),
			dayOfWeek = now.getDay() + 1,
			year = now.getFullYear(),
			month = now.getMonth(),
			mday = now.getDate() + 1;

		const hardDays = [1, 2, 3, 4, 5, 6, 7, 8, 9];

		if (hardDays.includes(mday)) {
			mday = "0" + mday;
		}
		if (hardDays.includes(month)) {
			month = "0" + month;
		}

		const queryData = `SELECT 
    Dishes.Name, Dishes.Price, Dishes.EnergyValue
        FROM
    eaterymain.Menu,
    eaterymain.Dishes
        WHERE
    Menu.DayOfWeek = "${dayOfWeek}" AND
    Dishes.DishID = Menu.DishID`;

		const users = await sequelize.query("SELECT UID FROM Users", {
			type: QueryTypes.SELECT,
		});

		const query = await sequelize.query(queryData, {
			type: QueryTypes.SELECT,
		});
		if (query.length > 0) {
			let rows = [
				JSON.stringify(query[0].Name),
				JSON.stringify(query[0].Price),
				JSON.stringify(query[0].EnergyValue),
				JSON.stringify(query[1].Name),
				JSON.stringify(query[1].Price),
				JSON.stringify(query[1].EnergyValue),
				JSON.stringify(query[2].Name),
				JSON.stringify(query[2].Price),
				JSON.stringify(query[2].EnergyValue),
				JSON.stringify(query[3].Name),
				JSON.stringify(query[3].Price),
				JSON.stringify(query[3].EnergyValue),
			];
			for (row of rows) {
				if (row === null) {
					row = "  -  ";
				}
			}
			const message = `📅 Меню на: ${mday}.${month}.${year}\r\n\r\n
                1. ${rows[0]} ${rows[1]} руб. | Энерг. ценность: ${rows[2]} ккал.
                2. ${rows[3]} ${rows[4]} руб. | Энерг. ценность: ${rows[5]} ккал. 
                3. ${rows[6]} ${rows[7]} руб. | Энерг. ценность: ${rows[8]} ккал. 
                4. ${rows[9]} ${rows[10]} руб. | Энерг. ценность: ${rows[11]} ккал. \r\n`;
			if (users.length > 0) {
				for (let i = 0; i < users.length; i++) {
					await bot.sendMessage(JSON.parse(users[i].UID), message);
				}
			}
		} else {
			if (users.length > 0) {
				for (let i = 0; i < users.length; i++) {
					await bot.sendMessage(
						JSON.parse(users[i].UID),
						"Записей о меню на завтрашний день в базе не найдено. 🚫"
					);
				}
			}
		}
	} catch (e) {
		console.error(e);
		if (users.length > 0) {
			for (let i = 0; i < users.length; i++) {
				await bot.sendMessage(
					JSON.parse(users[i].UID),
					"Записей о меню на завтрашний день в базе не найдено. 🚫"
				);
			}
		}
	}
	sequelize.close();
})();
