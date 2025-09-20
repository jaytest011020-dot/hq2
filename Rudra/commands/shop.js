const { setData, getData } = require("../../database.js");

const SHOP_ITEMS = [
  { name: "Energy Drink", price: 200, description: "Halves job cooldown once per use" },
  { name: "Lucky Charm", price: 500, description: "Increases job critical chance by 5%" },
  // Pwede pang dagdagan dito
];

module.exports.config = {
  name: "shop",
  version: "1.3.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Buy items to use as buffs",
  usages: "/shop, /shop buy <item number> <quantity>",
  commandCategory: "economy",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;

  // Show shop list
  if (!args[0]) {
    let msg = "🛒 𝗦𝗵𝗼𝗽 𝗜𝘁𝗲𝗺𝘀 🛒\n\n";
    SHOP_ITEMS.forEach((item, idx) => {
      msg += `====================\n`;
      msg += `📦 ${idx + 1}. ${item.name}\n`;
      msg += `💰 Price: ${item.price} coins\n`;
      msg += `📝 ${item.description}\n`;
    });
    msg += `====================\n`;
    msg += `Usage: /shop buy <item number> <quantity>`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // Buy item
  if (args[0].toLowerCase() === "buy") {
    const itemArg = args[1];
    const quantity = parseInt(args[2]) || 1;

    if (!itemArg) {
      return api.sendMessage(
        `❌ Usage: /shop buy <item number> <quantity>\nExample: /shop buy 1 2 or /shop buy "Energy Drink" 2`,
        threadID,
        messageID
      );
    }

    let shopItem;
    const itemIndex = parseInt(itemArg);
    if (!isNaN(itemIndex)) {
      shopItem = SHOP_ITEMS[itemIndex - 1];
    } else {
      shopItem = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemArg.toLowerCase());
    }

    if (!shopItem) {
      return api.sendMessage(
        `❌ Item not found in shop.\nUsage: /shop buy <item number|name> <quantity>\nExample: /shop buy 1 2 or /shop buy "Energy Drink" 2`,
        threadID,
        messageID
      );
    }

    const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
    const totalCost = shopItem.price * quantity;

    if (bankData.balance < totalCost) return api.sendMessage("❌ You don't have enough coins!", threadID, messageID);

    // Deduct coins
    bankData.balance -= totalCost;
    await setData(`bank/${threadID}/${senderID}`, bankData);

    // Add to inventory
    let inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
    const invItem = inventory.items.find(i => i.name === shopItem.name);

    if (invItem) invItem.quantity += quantity;
    else inventory.items.push({ name: shopItem.name, quantity });

    await setData(`inventory/${threadID}/${senderID}`, inventory);

    const msg = `
✅ Purchase Successful!
====================
📦 Item: ${shopItem.name}
🔢 Quantity: ${quantity}
💰 Total Cost: ${totalCost.toLocaleString()} coins
💵 New Balance: ${bankData.balance.toLocaleString()} coins
📝 Effect: ${shopItem.description}
====================
`;

    return api.sendMessage(msg, threadID, messageID);
  }

  // Invalid command
  return api.sendMessage(
    `❌ Invalid command.\nUsage: /shop buy <item number> <quantity>\nExample: /shop buy 1 2 or /shop buy "Energy Drink" 2`,
    threadID,
    messageID
  );
};
