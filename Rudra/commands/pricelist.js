const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "pricelist",
  version: "1.2.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Show or update pet prices",
  commandCategory: "Trading",
  usages: "/pricelist | /pricelist add <petName> <price>",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  let petPrices = (await getData("petPrices")) || {};

  // ✅ Case 1: Show full pricelist
  if (args.length === 0) {
    if (Object.keys(petPrices).length === 0) {
      return api.sendMessage("📂 Wala pang pets sa pricelist.", threadID, event.messageID);
    }

    // Sort alphabetically
    let sortedEntries = Object.entries(petPrices).sort((a, b) => a[0].localeCompare(b[0]));

    let list = sortedEntries
      .map(([name, price]) => `• ${name} — 💰 ${price}`)
      .join("\n");

    return api.sendMessage(`📊 Pricelist:\n\n${list}`, threadID, event.messageID);
  }

  // ✅ Case 2: Add or update
  if (args[0].toLowerCase() === "add") {
    if (args.length < 3) {
      return api.sendMessage(
        "❌ Usage: /pricelist add <petName> <price>",
        threadID,
        event.messageID
      );
    }

    // Pet name = lahat ng args maliban sa huling isa
    const petName = args.slice(1, -1).join(" ").toLowerCase();
    const price = parseInt(args[args.length - 1]);

    if (isNaN(price) || price <= 0) {
      return api.sendMessage("❌ Invalid price.", threadID, event.messageID);
    }

    let oldPrice = petPrices[petName];
    petPrices[petName] = price;
    await setData("petPrices", petPrices);

    if (oldPrice) {
      return api.sendMessage(
        `🔄 Updated: ${petName} price from ${oldPrice} → ${price}`,
        threadID,
        event.messageID
      );
    } else {
      return api.sendMessage(
        `✅ Added: ${petName} with price ${price}`,
        threadID,
        event.messageID
      );
    }
  }

  // ❌ Wrong usage
  return api.sendMessage(
    "❌ Usage:\n/pricelist\n/pricelist add <petName> <price>",
    threadID,
    event.messageID
  );
};
