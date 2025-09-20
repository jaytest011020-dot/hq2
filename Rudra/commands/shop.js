const { setData, getData } = require("../../database.js");

const SHOP_ITEMS = [
  { name: "Energy Drink", price: 200, description: "Halves job cooldown once per use" },
  { name: "Lucky Charm", price: 500, description: "Increases job critical chance by 5%" },
  // Pwede pang dagdagan dito
];

module.exports.config = {
  name: "shop",
  version: "1.0.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Buy items to use as buffs",
  usages: "/shop, /shop buy <item> <qty>",
  commandCategory: "economy",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;

  if (!args[0]) {
    // Show shop items
    let msg = "🛒 Shop Items:\n\n";
    SHOP_ITEMS.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} - 💰 ${item.price} coins\n   ${item.description}\n`;
    });
    return api.sendMessage(msg, threadID, messageID);
  }

  if (args[0].toLowerCase() === "buy") {
    const itemName = args[1];
    const quantity = parseInt(args[2]) || 1;

    if (!itemName) return api.sendMessage("❌ Usage: /shop buy <item> <quantity>", threadID, messageID);

    const shopItem = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    if (!shopItem) return api.sendMessage("❌ Item not found in shop.", threadID, messageID);

    // Check user's balance
    const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
    const totalCost = shopItem.price * quantity;

    if (bankData.balance < totalCost) return api.sendMessage("❌ You don't have enough coins!", threadID, messageID);

    bankData.balance -= totalCost;
    await setData(`bank/${threadID}/${senderID}`, bankData);

    // Add item to inventory
    let inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
    const invItem = inventory.items.find(i => i.name === shopItem.name);

    if (invItem) invItem.quantity += quantity;
    else inventory.items.push({ name: shopItem.name, quantity });

    await setData(`inventory/${threadID}/${senderID}`, inventory);

    return api.sendMessage(`✅ You bought ${quantity} x ${shopItem.name} for ${totalCost} coins.`, threadID, messageID);
  }
};
