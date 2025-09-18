const { setData, getData } = require("../../database.js"); // Database functions
const config = require("../../config.json"); // Import config.json
const BOT_ADMINS = config.ADMINBOT; // Kukunin yung admin list sa config

module.exports.config = {
  name: "bank",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord",
  description: "Bank system with admin restriction",
  usages: "/bank",
  cooldowns: 5,
  hasPermission: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // Check kung admin yung nag run
  if (!BOT_ADMINS.includes(senderID)) {
    return api.sendMessage(
      "❌ Only bot admins can use this command.",
      threadID,
      messageID
    );
  }

  // Example basic feature (pwede mong dagdagan dito)
  if (args[0] === "balance") {
    let balance = await getData(senderID, "bank");
    if (!balance) balance = 0;

    return api.sendMessage(
      `🏦 Your current balance is: ${balance} coins`,
      threadID,
      messageID
    );
  }

  if (args[0] === "add") {
    let amount = parseInt(args[1]);
    if (isNaN(amount)) {
      return api.sendMessage("⚠️ Please enter a valid number.", threadID, messageID);
    }

    let balance = await getData(senderID, "bank");
    if (!balance) balance = 0;

    balance += amount;
    await setData(senderID, "bank", balance);

    return api.sendMessage(
      `✅ Added ${amount} coins. New balance: ${balance}`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    "📌 Usage:\n/bank balance\n/bank add <amount>",
    threadID,
    messageID
  );
};
