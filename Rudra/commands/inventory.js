const { setData, getData } = require("../../database.js");

const SHOP_ITEMS = [
  { name: "Energy Drink", price: 200, description: "Halves job cooldown once per use" },
  { name: "Lucky Charm", price: 500, description: "Increases job critical chance by 5%" },
  // Pwede pang dagdagan dito
];

module.exports.config = {
  name: "inventory",
  version: "1.2.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Shows your inventory of items per group chat with descriptions",
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
    // Hanapin description sa SHOP_ITEMS
    const shopItem = SHOP_ITEMS.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    const description = shopItem ? shopItem.description : "No description available";

    msg += `${idx + 1}. [${item.name}] x${item.quantity}\n   ℹ️ ${description}\n\n`;
  });

  api.sendMessage(msg, threadID, messageID);
};
