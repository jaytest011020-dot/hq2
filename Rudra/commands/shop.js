const fs = require("fs");
const path = require("path");

const bankFile = path.join(__dirname, "bank.json");
const shopFile = path.join(__dirname, "shopData.json");

// ensure files exist
if (!fs.existsSync(bankFile)) fs.writeFileSync(bankFile, JSON.stringify({}, null, 2), "utf8");
if (!fs.existsSync(shopFile)) fs.writeFileSync(shopFile, JSON.stringify({}, null, 2), "utf8");

// load/save bank
function loadBank() {
  try {
    return JSON.parse(fs.readFileSync(bankFile, "utf8"));
  } catch {
    return {};
  }
}
function saveBank(data) {
  fs.writeFileSync(bankFile, JSON.stringify(data, null, 2), "utf8");
}

// load/save shop
function loadShop() {
  try {
    return JSON.parse(fs.readFileSync(shopFile, "utf8"));
  } catch {
    return {};
  }
}
function saveShop(data) {
  fs.writeFileSync(shopFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "shop",
  version: "11.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto Shop system (post every 20 minutes in current GC only)",
  commandCategory: "Economy",
  usages: "/shop add <details> | /shop remove | /shop list",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, senderID } = event;

  let bank = loadBank();
  let shopData = loadShop();

  if (!bank[senderID]) bank[senderID] = { balance: 0 };
  if (!shopData[threadID]) shopData[threadID] = { sellers: [] };

  const sub = args[0]?.toLowerCase();

  // remove seller
  if (sub === "remove") {
    shopData[threadID].sellers = shopData[threadID].sellers.filter(s => s.seller !== senderID);
    saveShop(shopData);
    return api.sendMessage("✅ Your shop entry has been removed.", threadID);
  }

  // list sellers
  if (sub === "list") {
    if (shopData[threadID].sellers.length === 0) {
      return api.sendMessage("📭 No active sellers in this shop.", threadID);
    }

    let listMsg = `🛒 ACTIVE SHOP SELLERS (This GC) 🛒\n\n`;
    shopData[threadID].sellers.forEach((s, i) => {
      const bal = bank[s.seller]?.balance ?? 0;
      listMsg += `${i + 1}. 👤 ${s.name}\n📦 ${s.details}\n💰 Balance: ${bal.toLocaleString()} coins\n\n`;
    });
    return api.sendMessage(listMsg, threadID);
  }

  // add seller
  if (sub === "add") {
    if (args.length < 2) {
      return api.sendMessage("❌ Usage: /shop add <details>", threadID);
    }

    const details = args.slice(1).join(" ");
    const name = await Users.getNameUser(senderID);

    if (bank[senderID].balance < 50) {
      return api.sendMessage("❌ You need at least 50 coins to join the auto shop.", threadID);
    }

    shopData[threadID].sellers.push({
      seller: senderID,
      name,
      details,
      threadID
    });
    saveShop(shopData);

    return api.sendMessage(`✅ Added to auto shop! (50 coins will be deducted every 20 mins)`, threadID);
  }

  return api.sendMessage("❌ Usage: /shop add <details> | /shop remove | /shop list", threadID);
};

// Auto poster (every 20 mins per GC only)
let started = false;
module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  setInterval(async () => {
    let bank = loadBank();
    let shopData = loadShop();

    for (const threadID of Object.keys(shopData)) {
      if (!shopData[threadID].sellers || shopData[threadID].sellers.length === 0) continue;

      let stillActive = [];
      let postMessage = `🛒 AUTO SHOP POST (Every 20 minutes) 🛒\n\n`;

      shopData[threadID].sellers.forEach(seller => {
        if (!bank[seller.seller] || bank[seller.seller].balance < 50) {
          api.sendMessage(
            `⚠️ ${seller.name}, you have been removed from the auto shop (not enough coins).`,
            threadID
          );
          return;
        }

        bank[seller.seller].balance -= 50;

        postMessage += `👤 Seller: ${seller.name}\n📦 ${seller.details}\n💰 Balance: ${bank[seller.seller].balance.toLocaleString()} coins\n\n━━━━━━━━━━━━━━\n\n`;
        stillActive.push(seller);
      });

      if (stillActive.length > 0) {
        postMessage += `👉 Want to sell too?\nType: /shop add <details> (50 coins every 20 mins)\n\n📖 Type /help to see all commands.`;

        api.sendMessage(postMessage, threadID);
      }

      shopData[threadID].sellers = stillActive;
    }

    saveShop(shopData);
    saveBank(bank);
  }, 20 * 60 * 1000); // every 20 mins
};
