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

// PH time
function formatDate() {
  return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

module.exports.config = {
  name: "shop",
  version: "7.2.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Global Auto Shop system (post every 20 minutes across all GCs)",
  commandCategory: "Economy",
  usages: "/shop <details> | /shop remove | /shop list",
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
    return api.sendMessage("✅ Tinanggal na ang entry mo sa shop.", threadID);
  }

  // list sellers
  if (sub === "list") {
    if (!shopData[threadID] || shopData[threadID].sellers.length === 0) {
      return api.sendMessage("📭 Walang active sellers sa shop na ito.", threadID);
    }

    let listMsg = `🛒 ACTIVE SHOP SELLERS (This GC) 🛒\n\n`;
    shopData[threadID].sellers.forEach((s, i) => {
      const bal = bank[s.seller]?.balance ?? 0;
      listMsg += `${i + 1}. 👤 ${s.name}\n📦 ${s.details}\n💰 Balance: ${bal.toLocaleString()} coins\n💬 From: ${s.threadName}\n🔗 ${s.fbLink}\n\n`;
    });
    listMsg += `🕒 Last Checked: ${formatDate()}`;
    return api.sendMessage(listMsg, threadID);
  }

  // add seller
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /shop <details> | /shop remove | /shop list", threadID);
  }

  const details = args.join(" ");
  const name = await Users.getNameUser(senderID);
  const info = await Users.getInfo(senderID);
  const fbLink = info?.profileUrl || `https://facebook.com/${senderID}`;
  const threadInfo = await Threads.getInfo(threadID);
  const threadName = threadInfo.threadName || "Unnamed Group";

  if (bank[senderID].balance < 20) {
    return api.sendMessage("❌ Kailangan ng at least 20 coins.", threadID);
  }
  bank[senderID].balance -= 20;
  saveBank(bank);

  shopData[threadID].sellers.push({
    seller: senderID,
    name,
    fbLink,
    details,
    threadName
  });
  saveShop(shopData);

  return api.sendMessage(`✅ Na-add ka sa auto shop! Bawas 20 coins.`, threadID);
};

// Auto-poster
let started = false;
module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  setInterval(async () => {
    let bank = loadBank();
    let shopData = loadShop();

    let globalSellers = [];
    for (const threadID of Object.keys(shopData)) {
      if (!shopData[threadID] || !shopData[threadID].sellers) continue;
      shopData[threadID].sellers.forEach(s => {
        globalSellers.push({ ...s, threadID });
      });
    }

    let stillActive = [];
    let postMessage = `🛒 GLOBAL AUTO SHOP POST (Every 20 minutes) 🛒\n📢 This post is sent to all groups where the bot is a member!\n\n`;

    for (const seller of globalSellers) {
      if (!bank[seller.seller] || bank[seller.seller].balance < 20) {
        api.sendMessage(
          `⚠️ ${seller.name}, na-remove ka sa auto shop kasi naubusan ka ng coins.`,
          seller.threadID
        );
        continue;
      }

      bank[seller.seller].balance -= 20;

      postMessage += `👤 Seller: ${seller.name}\n🔗 ${seller.fbLink}\n📦 Item: ${seller.details}\n💬 From: ${seller.threadName}\n💰 Balance: ${bank[seller.seller].balance.toLocaleString()} coins\n\n━━━━━━━━━━━━━━\n\n`;

      stillActive.push(seller);
    }

    if (stillActive.length > 0) {
      postMessage += `🕒 Updated: ${formatDate()}\n\n👉 Gusto mo rin ma-post ang items mo?\nType: /shop <details> (20 coins bawat 20 mins auto-post)\n\n📖 Type /help para makita ang lahat ng command\n\n👉 𝗝𝗼𝗶𝗻 𝗼𝘂𝗿 𝗚𝗮𝗴 𝗕𝘂𝘆 𝗮𝗻𝗱 𝗦𝗲𝗹𝗹 𝗚𝗖:\nhttps://m.me/j/AbYBqABSq7cyHsBk/`;

      for (const threadID of Object.keys(shopData)) {
        api.sendMessage(postMessage, threadID);
      }
    }

    let newShopData = {};
    stillActive.forEach(seller => {
      if (!newShopData[seller.threadID]) newShopData[seller.threadID] = { sellers: [] };
      newShopData[seller.threadID].sellers.push(seller);
    });

    saveShop(newShopData);
    saveBank(bank);
  }, 20 * 60 * 1000);
};
