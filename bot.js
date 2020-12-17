require("dotenv").config();
const mysql = require("mysql2");
const qr = require("qr-image");
const fs = require("fs");
const imgurUploader = require("imgur-uploader");
const express = require("express");
const bodyParser = require("body-parser");
const VkBot = require("node-vk-bot-api");
const Scene = require("node-vk-bot-api/lib/scene");
const Stage = require("node-vk-bot-api/lib/stage");
const Session = require("node-vk-bot-api/lib/session");
const Markup = require("node-vk-bot-api/lib/markup");
const { Sequelize, QueryTypes } = require("sequelize");
const cron = require("node-cron");

//db-updater
cron.schedule("00 23  * * *", () => {
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
});

//menu
cron.schedule("00 07 * * *", () => {
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
				month = now.getMonth() + 1,
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
						await bot.sendMessage(
							JSON.parse(users[i].UID),
							message
						);
					}
				}
			} else {
				if (query.length >= 0) {
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
});

const app = express();

const bot = new VkBot({
	token: process.env.TOKEN,
	group_id: process.env.GROUP_ID,
	secret: process.env.SECRET,
	confirmation: process.env.CONFIRMATION,
});

app.use(bodyParser.json());
app.post("/", bot.webhookCallback);
app.listen(process.env.PORT);

const sequelize = new Sequelize(
	process.env.DBNAME,
	process.env.USERNAME,
	process.env.PASSWORD,
	{
		host: process.env.SERVERNAME,
		dialect: "mysql",
	}
);

const connection = mysql.createPool({
	connectionLimit: 15,
	host: process.env.SERVERNAME,
	user: process.env.USERNAME,
	database: process.env.DBNAME,
	password: process.env.PASSWORD,
});

(async () => {
	bot.startPolling((error) => {
		if (error) {
			console.error(error);
		}
		console.log("Bot started.");
	});

	let now = new Date(),
		dayOfWeek = now.getDay() + 1,
		year = now.getFullYear(),
		month = now.getMonth() + 1,
		mday = now.getDate() + 1;

	const hardDays = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	if (hardDays.includes(mday)) {
		mday = "0" + mday;
	}
	if (hardDays.includes(month)) {
		month = "0" + month;
	}

	let finalOrder = [];
	let totalPrice = [];
	let orderMax = [];
	let productsResult;
	let productsDeleteResult;

	const scene = new Scene(
		"order",
		async (ctx) => {
			ctx.scene.next();
			await ctx.reply(
				`Выпишите номера блюд, которые Вы хотите заказать из меню через запятую на: ${mday}.${month}.${year} \r\n Например => "2,3,1". Будьте внимательны к дате. ⚠`
			);
		},
		async (ctx) => {
			let mainOrder = ctx.message.body;
			mainOrder = mainOrder.replace(/[^,0-9]/gim, "");
			finalOrder = mainOrder.split(/,\s*/);
			finalOrder.sort((a, b) => a - b);
			let working = true;
			for (let i = 0; i < finalOrder.length; i++) {
				if (finalOrder[i] > 4 || parseInt(finalOrder) == NaN) {
					working = false;
				}
			}
			if (!working) {
				await ctx.reply(
					"Неверный ввод заказа. Возможно допущены строковые символы. 🚫"
				);
				ctx.scene.leave();
			}
			orderMax = [...finalOrder];
			for (let i = 0; i < finalOrder.length; i++) {
				if (isNaN(finalOrder[i])) {
					await ctx.reply(
						"Неверный ввод заказа. Возможно допущены строковые символы. 🚫"
					);
					ctx.scene.leave();
					break;
				}
			}
			orderMax.forEach((value) => console.log(value));
			try {
				let query = `SELECT
				DishID
				    FROM
				eaterymain.Menu
				    WHERE
				Menu.DayOfWeek = ${dayOfWeek}`;
				const menuQueryMain = await sequelize.query(query, {
					type: QueryTypes.SELECT,
				});
				if (menuQueryMain != 0) {
					let row = [
						JSON.parse(menuQueryMain[0].DishID),
						JSON.parse(menuQueryMain[1].DishID),
						JSON.parse(menuQueryMain[2].DishID),
						JSON.parse(menuQueryMain[3].DishID),
					];

					if (orderMax.indexOf(orderMax[0]) != -1) {
						// if array[i] not null = row[i] else null
						orderMax[0] = row[0];
					} else if (orderMax.indexOf(orderMax[0]) == -1) {
						orderMax[0] = "null";
					}
					if (orderMax.indexOf(orderMax[1]) != -1) {
						orderMax[1] = row[1];
					} else if (orderMax.indexOf(orderMax[1]) == -1) {
						orderMax[1] = "null";
					}
					if (orderMax.indexOf(orderMax[2]) != -1) {
						orderMax[2] = row[2];
					} else if (orderMax.indexOf(orderMax[2]) == -1) {
						orderMax[2] = "null";
					}
					if (orderMax.indexOf(orderMax[3]) != -1) {
						orderMax[3] = row[3];
					} else if (orderMax.indexOf(orderMax[3]) == -1) {
						orderMax[3] = "null";
					}
				}
				let i = 0;
				while (i < orderMax.length) {
					if (orderMax[i] === "null") {
						orderMax.splice(i, 1);
					} else {
						i++;
					}
				}

				await ctx.reply(
					"Вы уверены? (Да или нет) ⚠",
					null,
					Markup.keyboard([
						[
							Markup.button("Да", "positive"),
							Markup.button("Нет", "negative"),
						],
					]).oneTime()
				);
				ctx.scene.next();
			} catch (err) {
				console.error(err);
			}
		},
		async (ctx) => {
			if (ctx.message.body == "Да" || ctx.message.body == "да") {
				const sumData = `SELECT 
                SUM(Dishes.Price) as Sum
                    FROM
                eaterymain.Dishes
                    WHERE
                Dishes.DishID IN (${orderMax})`;
				const sumQuery = await sequelize.query(sumData, {
					type: QueryTypes.SELECT,
				});
				if (sumQuery != 0) {
					totalPrice = sumQuery;
				}
				setTimeout(() => {
					connection.getConnection(async function (err, conn) {
						if (err) console.log(err);

						conn.beginTransaction(async function (err) {
							for (let i = 0; i < orderMax.length; i++) {
								const ordersData = `INSERT INTO Orders(UserID, DishID, Date) 
                                                VALUES (${
													ctx.message.user_id
												}, ${
									orderMax[i]
								}, "${setTimeToNormal()}")`;
								const ordersQuery = await sequelize
									.query(ordersData, {
										type: QueryTypes.INSERT,
									})
									.catch(function (error) {
										console.log(error);
									});
							}
							const productsData = `SELECT 
                                AmountProduct, ProductID
                                    FROM
                                eaterymain.Compositions,
                                eaterymain.Orders
                                    WHERE
                                Compositions.DishID = Orders.DishID AND
                                UserID = ${ctx.message.user_id}`;
							const productsQuery = await sequelize.query(
								productsData,
								{
									type: QueryTypes.SELECT,
								}
							);
							if (productsQuery != 0) {
								productsResult = productsQuery;
							}
							if (err) {
								conn.rollback(function () {
									conn.release();
									console.log(`1: ${err}`);
								});
							}
							for (let i = 0; i < productsResult.length; i++) {
								conn.query(
									`UPDATE Products SET Products.Amount = Products.Amount - ${JSON.parse(
										productsResult[i].AmountProduct
									)}
                                            WHERE Products.ProductID = ${JSON.parse(
												productsResult[i].ProductID
											)};`,
									function (err) {
										if (err) {
											conn.rollback(function () {
												console.error(err);
											});
										} else {
											console.log("updated.");
										}
									}
								);
							}
							conn.query(
								"SELECT COUNT(*) AS Less FROM eaterymain.Products WHERE Amount < 0;",
								function (err, result) {
									if (err) {
										conn.rollback(function () {
											console.error(err);
										});
									}
									if (result[0].Less > 0) {
										conn.rollback(function () {
											console.log("Final rollback.");
											ctx.reply(
												"На складе недостаточно продуктов для оформления данного заказа. 🚫"
											);
										});
									} else {
										conn.commit(function (err) {
											if (err) {
												conn.rollback(function () {
													console.error(err);
												});
											}
											ctx.reply(
												`Ваш заказ: ${finalOrder} добавлен в систему. Стоимость: ${totalPrice[0].Sum} рублей. \r\n Будьте внимательны! Вы можете удалить до 05:00 ${mday}.${month}.${year}. ✅`
											);
											(async () => {
												const user = await sequelize.query(
													`SELECT FirstName, LastName FROM Users WHERE UID = ${ctx.message.user_id}`
												);
												const userOrders = await sequelize.query(
													`SELECT Name FROM Dishes, Orders WHERE Dishes.DishID = Orders.DishID AND Orders.UserID = ${ctx.message.user_id}`
												);
												let orderArray = [];
												for (
													let i = 0;
													i < userOrders[0].length;
													i++
												) {
													orderArray.push(
														JSON.stringify(
															userOrders[0][i]
																.Name
														)
													);
												}
												const qrCodeText = `На ${mday}.${month}.${year}, Цена: ${
													totalPrice[0].Sum
												}, Покупатель: ${JSON.stringify(
													user[0][0].FirstName
												)} ${JSON.stringify(
													user[0][0].LastName
												)}, Заказ: ${orderArray.join(
													", "
												)}`;

												let qr_png = qr.image(
													qrCodeText,
													{
														type: "png",
													}
												);
												qr_png.pipe(
													require("fs").createWriteStream(
														`./static/${ctx.message.user_id}.png`
													)
												);

												setTimeout(() => {
													imgurUploader(
														fs.readFileSync(
															`./static/${ctx.message.user_id}.png`,
															{
																title:
																	ctx.message
																		.user_id,
															}
														)
													)
														.then((data) => {
															ctx.reply(
																`Ваша ссылка на qr-код заказа: ${data.link}`
															);
														})
														.catch((error) => {
															console.log(error);
														});
												}, 2000);
											})();
											console.log("Success");
										});
									}
								}
							);
						});
					});
				}, 2000);
				ctx.scene.leave();
			} else if (
				ctx.message.body === "Нет" ||
				ctx.message.body === "нет"
			) {
				await ctx.reply("Заказ отменен. ✅");
				ctx.scene.leave();
			} else {
				ctx.reply(
					"Принимаются только значения да или нет. Заказ отменен. 🚫"
				);
				ctx.scene.leave();
			}
		}
	);

	const session = new Session();
	const stage = new Stage(scene);
	bot.use(session.middleware());
	bot.use(stage.middleware());

	bot.command("!добавить", async (ctx) => {
		try {
			const queryData = `INSERT INTO Messages_Logs(UID, Date, Message) 
                                VALUES("${
									ctx.message.user_id
								}","${setTimeToNormal()}","${
				ctx.message.body
			}")`;
			const query = await sequelize.query(queryData, {
				type: QueryTypes.INSERT,
			});
		} catch (error) {
			console.error(error);
		}
		const menuQuery = await sequelize.query(
			`SELECT * FROM eaterymain.Menu WHERE DayOfWeek = ${dayOfWeek}`,
			{ type: QueryTypes.SELECT }
		);
		if (menuQuery.length < 1) {
			await ctx.reply("Невозможно оформить заказ на завтра. 🚫");
		} else {
			const activeUser = await sequelize.query(
				`SELECT * FROM Users WHERE UID = ${ctx.message.user_id}`,
				{ type: QueryTypes.SELECT }
			);
			if (activeUser.length != 0) {
				const orderUser = await sequelize.query(
					`SELECT * FROM Orders WHERE UserID = "${ctx.message.user_id}"`
				);
				if (orderUser.length > 2) {
					await ctx.reply(
						"У Вас уже есть заказ, если хотите создать новый - удалите старый. 🚫"
					);
				} else {
					ctx.scene.enter("order");
				}
			} else {
				ctx.reply(
					"Вы не можете использовать эту команду, так как Вы не зарегестрированны в базе данных предприятия. 🚫"
				);
			}
		}
	});

	//COMMANDS HADLING
	bot.event("message_new", async (ctx) => {
		try {
			const queryData = `INSERT INTO Messages_Logs(UID, Date, Message) 
                                VALUES("${
									ctx.message.user_id
								}","${setTimeToNormal()}","${
				ctx.message.body
			}")`;
			const query = await sequelize.query(queryData, {
				type: QueryTypes.INSERT,
			});
		} catch (error) {
			console.error(error);
		}

		//CHECK TO COMMAND
		switch (ctx.message.body) {
			case "!меню":
			case "!Меню":
				const activeUsers = await sequelize.query(
					`SELECT * FROM Users WHERE UID = "${ctx.message.user_id}"`,
					{ type: QueryTypes.SELECT }
				);
				if (activeUsers.length != 0) {
					let queryData = `SELECT 
                                Dishes.Name, Dishes.Price, Dishes.EnergyValue
                                    FROM
                                eaterymain.Menu,
                                eaterymain.Dishes
                                    WHERE
                                Menu.DayOfWeek = ${dayOfWeek} AND
                                Dishes.DishID = Menu.DishID`;
					const query = await sequelize.query(queryData, {
						type: QueryTypes.SELECT,
					});
					if (query.length == 0) {
						await bot.sendMessage(
							ctx.message.user_id,
							"Записей о меню на завтрашний день в базе не найдено. 🚫"
						);
					}
					try {
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
							await bot.sendMessage(ctx.message.user_id, message);
						}
					} catch (error) {
						await ctx.reply(
							"Меню за завтра отсутствует в базе данных. 🚫"
						);
						console.error(error);
					}
				} else {
					await ctx.reply(
						"Вы не можете использовать эту команду, так как Вы не зарегестрированны в базе данных предприятия. 🚫"
					);
				}
				break;
			case "start":
			case "Start":
			case "Начало":
			case "начало":
			case "Начать":
			case "начать":
				await ctx.reply(
					"Начало работы с чат-ботом. \r\n 📖 !команды - команды, доступные для использования.",
					null,
					Markup.keyboard([
						[Markup.button("!команды", "primary")],
					]).oneTime()
				);
				break;
			case "!удалить":
			case "!Удалить":
				const activeUser = await sequelize.query(
					`SELECT * FROM Users WHERE UID = "${ctx.message.user_id}"`,
					{ type: QueryTypes.SELECT }
				);
				if (activeUser.length != 0) {
					const productsData = `SELECT 
                                AmountProduct, ProductID
                                    FROM
                                eaterymain.Compositions,
                                eaterymain.Orders
                                    WHERE
                                Compositions.DishID = Orders.DishID AND
                                UserID = ${ctx.message.user_id}`;
					const productsQuery = await sequelize.query(productsData, {
						type: QueryTypes.SELECT,
					});
					if (productsQuery != 0) {
						productsDeleteResult = productsQuery;

						for (let i = 0; i < productsDeleteResult.length; i++) {
							connection.query(
								`UPDATE Products SET Products.Amount = Products.Amount + ${JSON.parse(
									productsDeleteResult[i].AmountProduct
								)} WHERE Products.ProductID = ${JSON.parse(
									productsDeleteResult[i].ProductID
								)};`,
								function (err) {
									if (err) {
										conn.rollback(function () {
											console.error(err);
										});
									} else {
										console.log("updated.");
									}
								}
							);
						}
					}
					connection.query(
						"DELETE FROM Orders WHERE UserID = ?",
						ctx.message.user_id,
						async function (error, result) {
							if (error) {
								console.error(error);
							}
							if (result != 0) {
								ctx.reply("Ваш заказ был удален. ✅");
							} else if (result == 0) {
								ctx.reply("Нету заказа для удаления. ⚠");
							}
						}
					);
				} else {
					ctx.reply(
						"Вы не можете использовать эту команду, так как вас нету в базе предприятия. 🚫"
					);
				}

				break;
			case "!заказ":
			case "!Заказ":
				const userOrders = await sequelize.query(
					`SELECT Name FROM Dishes, Orders WHERE Dishes.DishID = Orders.DishID AND Orders.UserID = ${ctx.message.user_id}`
				);
				let orderArray = [];
				for (let i = 0; i < userOrders[0].length; i++) {
					orderArray.push(JSON.stringify(userOrders[0][i].Name));
				}
				if (orderArray.length == 0) {
					await ctx.reply("У Вас нету активных заказов. ⚠");
				} else {
					await ctx.reply(
						`Ваш заказ на ${mday}.${month}.${year} => ${orderArray.join(
							", "
						)} ✅`
					);
				}
				break;
			case "!код":
			case "!Код":
				const admin = await sequelize.query(
					`SELECT * FROM Users WHERE UID = "${ctx.message.user_id}" AND isAdmin = 1`,
					{ type: QueryTypes.SELECT }
				);
				if (activeUser.length != 0) {
					const validateCode = Math.floor(Math.random() * 16777215)
						.toString(16)
						.toUpperCase();

					await sequelize
						.query(
							`INSERT INTO ValidationCods (Author, Code) VALUES 
						("${ctx.message.user_id}", "${validateCode}")`
						)
						.then(() => {
							ctx.reply(
								`Код для регистрации нового администратора: ${validateCode}. Количество активаций: 1. 
								После регистрации он станет недоступен.`
							);
						})
						.catch((error) => {
							console.error(error);
							ctx.reply("Ошибка создания кода регистрации. ⚠");
						});
				} else {
					await ctx.reply(
						"Данную команду может использовать только администратор системы. 🚫"
					);
				}

				break;
			case "!команды":
			case "!Команды":
				ctx.reply(
					`📖 Доступные Вам команды:\r\n
                        !добавить - диалог добавления нового заказа.
                        !удалить - удалить созданый ранее заказ.
                        !заказ - просмотр созданного заказа.
                        !меню - показ меню на следующий день.
						!команды - просмотр доступных команд.
						!код - создает код для регистрации администратора [доступно только администраторам].`,
					null,
					Markup.keyboard([
						[
							Markup.button("!добавить", "positive"),
							Markup.button("!удалить", "negative"),
						],
						[
							Markup.button("!заказ", "primary"),
							Markup.button("!меню", "primary"),
						],
					])
				);
				break;
			default:
				ctx.reply("😯 Неизвестная команда.");
				break;
		}
	});

	function setTimeToNormal() {
		var date;
		date = new Date();
		date =
			date.getUTCFullYear() +
			"-" +
			("00" + (date.getUTCMonth() + 1)).slice(-2) +
			"-" +
			("00" + date.getUTCDate()).slice(-2) +
			" " +
			("00" + date.getUTCHours()).slice(-2) +
			":" +
			("00" + date.getUTCMinutes()).slice(-2) +
			":" +
			("00" + date.getUTCSeconds()).slice(-2);
		return date;
	}
})();
