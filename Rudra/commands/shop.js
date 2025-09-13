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
  version: "6.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Global Auto Shop system (post every 20 minutes across all GCs)",
  commandCategory: "Economy",
  usages: "/shop <details> | /shop remove | /shop list",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users }) {
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
    if (shopData[threadID].sellers.length === 0) {
      return api.sendMessage("📭 Walang active sellers sa shop na ito.", threadID);
    }

    let listMsg = `🛒 ACTIVE SHOP SELLERS 🛒\n\n`;
    shopData[threadID].sellers.forEach((s, i) => {
      const bal = bank[s.seller]?.balance ?? 0;
      listMsg += `${i + 1}. 👤 ${s.name}\n📦 ${s.details}\n💰 Balance: ${bal.toLocaleString()} coins\n\n`;
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

  // check coins
  if (bank[senderID].balance < 50) {
    return api.sendMessage("❌ Kailangan ng at least 50 coins.", threadID);
  }
  bank[senderID].balance -= 50;
  saveBank(bank);

  // add seller entry
  shopData[threadID].sellers.push({
    seller: senderID,
    name,
    fbLink,
    details
  });
  saveShop(shopData);

  return api.sendMessage(`✅ Na-add ka sa auto shop! Bawas 50 coins.`, threadID);
};

// Global auto poster (every 20 mins across all GCs)
let started = false;
module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  setInterval(async () => {
    let bank = loadBank();
    let shopData = loadShop();

    for (const threadID of Object.keys(shopData)) {
      if (!shopData[threadID] || shopData[threadID].sellers.length === 0) continue;

      let stillActive = [];
      let autoPost = `🛒 AUTO SHOP POST (Every 20 minutes) 🛒\n\n`;

      shopData[threadID].sellers.forEach(seller => {
        if (!bank[seller.seller] || bank[seller.seller].balance < 50) {
          // wala nang coins → tanggalin
          api.sendMessage(
            `⚠️ ${seller.name}, na-remove ka sa auto shop kasi naubusan ka ng coins.`,
            threadID
          );
          return;
        }

        // bawas coins at isama sa list
        bank[seller.seller].balance -= 50;
        autoPost += `👤 Seller: ${seller.name}\n🔗 ${seller.fbLink}\n📦 Item: ${seller.details}\n💰 Balance: ${bank[seller.seller].balance.toLocaleString()} coins\n\n━━━━━━━━━━━━━━\n\n`;
        stillActive.push(seller);
      });

      if (stillActive.length > 0) {
        autoPost += `🕒 Updated: ${formatDate()}\n\n👉 Gusto mo rin ma-post ang items mo?\nType: /shop <details> (50 coins bawat 20 mins auto-post)`;
        api.sendMessage(autoPost, threadID);
      }

      shopData[threadID].sellers = stillActive;
    }

    saveShop(shopData);
    saveBank(bank);
  }, 20 * 60 * 1000); // every 20 mins
};
