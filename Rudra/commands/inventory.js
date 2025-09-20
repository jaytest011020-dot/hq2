const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "inventory",
  version: "1.0.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Shows your inventory of items per group chat",
  usages: "/inventory",
  commandCategory: "economy",
  cooldowns: 3
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID, messageID } = event;

  // Load inventory per thread
  let inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };

  if (inventory.items.length === 0) {
    return api.sendMessage("🛒 Your inventory is empty!", threadID, messageID);
  }

  let msg = "🛒 Your Inventory:\n\n";
  inventory.items.forEach((item, idx) => {
    msg += `${idx + 1}. ${item.name} x${item.quantity}\n`;
  });

  api.sendMessage(msg, threadID, messageID);
};
