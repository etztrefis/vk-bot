require("dotenv").config();
const VkBot = require("node-vk-bot-api");
const Scene = require("node-vk-bot-api/lib/scene");
const Stage = require("node-vk-bot-api/lib/stage");
const Session = require("node-vk-bot-api/lib/session");
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
(async () => {
	bot.startPolling((error) => {
		if (error) {
			console.error(error);
		}
		console.log("Bot started.");
	});

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

	let mainOrder = "";
	let finalOrder = [4];
	let totalPrice = [];
	let orderMax = [];
	let orderInfo = [];
	let alreadyOrdered = [];
	let price = [];
	let productsResult;

	const scene = new Scene(
		"order",
		(ctx) => {
			ctx.scene.next();
			ctx.reply(
				`Выпишите номера блюд, которые Вы хотите заказать из меню через запятую на: ${mday}.${month}.${year} \r\n Например => "2,3,1". Будьте внимательны к дате.`
			);
		},
		(ctx) => {
			mainOrder = ctx.message.body;
			mainOrder = mainOrder.replace(/[^,0-9]/gim, "");
			finalOrder = mainOrder.split(/,\s*/);
			finalOrder.sort((a, b) => a - b);
			orderMax = finalOrder.slice();
			for (let i = 0; i < finalOrder.length; i++) {
				if (!isNaN(finalOrder[i])) {
				} else {
					ctx.reply(
						"Неверный ввод заказа. Возможно допущены строковые символы."
					);
					ctx.scene.leave();
					break;
				}
			}
			let query = `SELECT 
    Dishes.DishID, Dishes.Price
      FROM
    eaterymain.Menu,
    eaterymain.Dishes
      WHERE
    Menu.DayOfWeek = ? AND
    Dishes.DishID = Menu.DishID
  `;
			connection.query(query, dayOfWeek, function (mainErr, mainResult) {
				if (mainErr) {
					console.error(mainErr);
				}
				if (mainResult !== 0) {
					let row = [
						mainResult[0].DishID,
						mainResult[1].DishID,
						mainResult[2].DishID,
						mainResult[3].DishID,
					];
					for (let i = 0; i < row.length; i++) {
						if (row[i] === null) {
							row[i] = 0;
						}
					}
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
			});
			try {
				ctx.reply("Вы уверены? (Да или нет)");
				ctx.scene.next();
			} catch (err) {
				console.error(err);
			}
		},
		(ctx) => {
			let yesOrNo = ctx.message.body;
			if (yesOrNo === "Да" || yesOrNo === "да") {
				connection.query(
					`SELECT 
        SUM(Dishes.Price) as Sum
          FROM
        eaterymain.Dishes
          WHERE
        Dishes.DishID IN (${orderMax})`,
					function (sumError, sumResult) {
						if (sumError) console.error(sumError);
						totalPrice = sumResult;
					}
				);
				for (let i = 0; i < orderMax.length; i++) {
					connection.query(
						"INSERT INTO Orders(UserID, DishID, Date) VALUES (?,?,?)",
						[ctx.message.user_id, orderMax[i], setTimeToNormal()],
						function (orderErr) {
							if (orderErr) console.error(orderErr);
						}
					);
				}
				connection.query(
					`SELECT 
            AmountProduct, ProductID
          FROM
            eaterymain.Compositions,
            eaterymain.Orders
          WHERE
            Compositions.DishID = Orders.DishID AND
            UserID = ?`,
					ctx.message.user_id,
					function (err, result) {
						if (err) console.error(err);
						productsResult = result;
					}
				);
				setTimeout(() => {
					connection.getConnection(function (err, conn) {
						if (err) console.log(err);

						conn.beginTransaction(function (err) {
							if (err) {
								conn.rollback(function () {
									conn.release();
									console.log(`1: ${err}`);
								});
							}
							for (let i = 0; i < productsResult.length; i++) {
								conn.query(
									`UPDATE Products SET Products.Amount = Products.Amount - ${productsResult[i].AmountProduct} WHERE Products.ProductID = ${productsResult[i].ProductID};`,
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
												`Ваш заказ: ${finalOrder} добавлен в систему. Стоимость: ${totalPrice[0].Sum} рублей. \r\n Будьте внимательны! Вы можете удалить до 05:00. ${mday}.${month}.${year}.`
											);
											console.log("Success");
										});
									}
								}
							);
						});
					});
				}, 2000);

				ctx.scene.leave();
			} else if (yesOrNo === "Нет" || yesOrNo === "нет") {
				ctx.reply("Заказ отменен.");
				ctx.scene.leave();
			} else {
				ctx.reply("Принимаются только значения да или нет.");
			}
		}
	);
	const session = new Session();
	const stage = new Stage(scene);
	bot.use(session.middleware());
	bot.use(stage.middleware());

	bot.command("/добавить", async (ctx) => {
		const menuQuery = await sequelize.query(
			`SELECT * FROM eaterymain.Menu WHERE DayOfWeek = ${dayOfWeek}`,
			{ type: QueryTypes.SELECT }
		);
		if (menuQuery.length > 1) {
			await ctx.reply("Невозможно оформить заказ на завтра.");
		} else {
			const activeUser = sequelize.query(
				`SELECT * FROM Users WHERE UID = ${ctx.message.user_id}`,
				{ type: QueryTypes.SELECT }
			);
			if (activeUser.length != 0) {
				ctx.scene.enter("order");
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
				await ctx.reply(
					"Начало работы с чат-ботом. \r\n 📖!команды - команды, доступные для использования."
				);
				break;
			case "!удалить":
			case "!Удалить":
				const activeUsersasd = await sequelize.query(
					// change variable name
					`SELECT * FROM Users WHERE UID = "${ctx.message.user_id}"`,
					{ type: QueryTypes.SELECT }
				);
				if (activeUsers.length != 0) {
					const orderQuery = `SELECT * FROM Orders WHERE UserID = `;

					connection.query(
						"SELECT First, Second, Third, Fourth FROM Orders WHERE UserID = ?",
						userID,
						function (err1, result) {
							if (err1) {
								console.log(err1.message);
							}
							if (result != 0) {
								orderInfo.push(
									result[0].First,
									result[0].Second,
									result[0].Third,
									result[0].Fourth
								);

								for (let i = 0; i < orderInfo.length; i++) {
									connection.query(
										"UPDATE Products SET Amount = Amount+100 WHERE ProductID=?",
										orderInfo[i],
										function (err2) {
											if (err2) {
												console.log(err2);
											}
										}
									);
								}
								connection.query(
									"DELETE FROM Orders WHERE UserID = ?",
									userID,
									function (err3, result2) {
										if (err3) {
											console.log(err3.message);
										}
										if (result2 != 0) {
											ctx.reply("Заказ был удален.");
										} else if (result2 == 0) {
											ctx.reply(
												"Нету заказа для удаления."
											);
										}
									}
								);
							} else {
								ctx.reply("У вас нету заказа для удаления.");
							}
						}
					);
				} else {
					ctx.reply(
						"Вы не можете использовать эту команду, так как вас нету в базе предприятия."
					);
				}

				break;
			case "/заказ":
			case "/Заказ":
				let IDofUser = ctx.message.user_id;
				let orderArray = [];
				connection.query(
					"SELECT O.Date, F.Name as First, S.Name as Second, T.Name as Third, L.Name as Fourth FROM Orders O LEFT OUTER JOIN Courses F ON F.CourseID = O.First LEFT OUTER JOIN Courses S ON S.CourseID = O.Second LEFT OUTER JOIN Courses T ON T.CourseID = O.Third LEFT OUTER JOIN Courses L ON L.CourseID = O.Fourth WHERE O.UserID = ?",
					IDofUser,
					function (err, result) {
						if (err) {
							console.log(err.message);
						}
						if (result != 0) {
							alreadyOrdered.push(
								result[0].First,
								result[0].Second,
								result[0].Third,
								result[0].Fourth
							);
							for (let i = 0; i < alreadyOrdered.length; i++) {
								if (alreadyOrdered[i] !== null) {
									orderArray.push(alreadyOrdered[i]);
								}
							}
							ctx.reply("Ваш заказ: " + orderArray + ".");
						} else if (result == 0) {
							ctx.reply("У вас нету активных заказов.");
						}
					}
				);
				break;
			case "!команды":
			case "!Команды":
				ctx.reply(
					`📖 Доступные Вам команды:\r\n
                        /добавить - диалог добавления нового заказа.
                        /удалить - удалить созданый ранее заказ.
                        /заказ - просмотр созданного заказа.
                        /меню - показ меню на следующий день.
                        /команды - просмотр доступных команд.`
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
