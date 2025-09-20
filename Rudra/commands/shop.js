const { setData, getData } = require("../../database.js");

const SHOP_ITEMS = [
  { name: "Lucky Charm", price: 500, description: "Increases chance of critical in /job by 5% for 24h", type: "buff", duration: 24*60*60*1000 },
  { name: "Energy Drink", price: 200, description: "Reduces /job cooldown by 50% for 1 use", type: "consumable" },
  { name: "VIP Badge", price: 1000, description: "Cosmetic badge, no gameplay effect", type: "cosmetic" },
  { name: "Lottery Ticket", price: 50, description: "Enter weekly lottery draw", type: "consumable" }
];

module.exports.config = {
  name: "shop",
  version: "1.0.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Shop system with buffs, consumables, cosmetics",
  commandCategory: "economy",
  usages: "/shop | /shop buy <item number or name>",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // Load user's bank for balance check
  let userBank = (await getData(`bank/${threadID}/${senderID}`)) || { uid: senderID, name: `FB-User(${senderID})`, balance: 0 };

  // /shop -> show all items
  if (!args[0] || args[0].toLowerCase() !== "buy") {
    let msg = `🛒 Welcome to the shop!\n\n`;
    SHOP_ITEMS.forEach((item, i) => {
      msg += `${i+1}. ${item.name} — ${item.price} coins\n   ${item.description}\n`;
    });
    msg += `\nBuy an item: /shop buy <item number or name>`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // /shop buy <item>
  const itemArg = args.slice(1).join(" ");
  let itemToBuy = SHOP_ITEMS.find((item, i) => itemArg.toLowerCase() === item.name.toLowerCase() || itemArg === String(i+1));
  if (!itemToBuy) return api.sendMessage("❌ Item not found.", threadID, messageID);

  if (userBank.balance < itemToBuy.price)
    return api.sendMessage("❌ You don't have enough coins to buy this item.", threadID, messageID);

  // Deduct coins
  userBank.balance -= itemToBuy.price;
  await setData(`bank/${threadID}/${senderID}`, userBank);

  // Add item to inventory
  let inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
  let existing = inventory.items.find(i => i.name === itemToBuy.name);
  const now = Date.now();

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
    if (itemToBuy.duration) existing.expires = now + itemToBuy.duration;
  } else {
    inventory.items.push({
      name: itemToBuy.name,
      type: itemToBuy.type,
      quantity: 1,
      expires: itemToBuy.duration ? now + itemToBuy.duration : null
    });
  }

  await setData(`inventory/${threadID}/${senderID}`, inventory);

  return api.sendMessage(`✅ You bought 1 ${itemToBuy.name}!\nYour new balance: ${userBank.balance.toLocaleString()} coins`, threadID, messageID);
};
