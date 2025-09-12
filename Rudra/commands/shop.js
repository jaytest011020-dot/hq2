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

// load/save shop per thread
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
  version: "4.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Per-GC Auto Shop system",
  commandCategory: "Economy",
  usages: "/shop <details> | /shop remove",
  cooldowns: 5,
};

// Timers per thread
const shopTimers = {};

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
    return api.sendMessage("✅ Tinanggal na ang entry mo sa shop ng GC na ito.", threadID);
  }

  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /shop <details>", threadID);
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

  // add to shop list
  shopData[threadID].sellers.push({
    seller: senderID,
    name,
    fbLink,
    details
  });
  saveShop(shopData);

  // post immediately
  const msg = `🛒 AUTO SHOP POST 🛒\n
👤 Seller: ${name}
🔗 ${fbLink}
📦 Item: ${details}
💰 Balance: ${bank[senderID].balance.toLocaleString()} coins
🕒 Posted: ${formatDate()}

━━━━━━━━━━━━━━
👉 Gusto mo rin ma-post ang binebenta mo?
Type: /shop <details> (50 coins bawat auto-post)
`;
  api.sendMessage(msg, threadID);

  // reset interval for this thread
  if (shopTimers[threadID]) clearInterval(shopTimers[threadID]);

  shopTimers[threadID] = setInterval(() => {
    let bank = loadBank();
    let shopData = loadShop();
    if (!shopData[threadID] || shopData[threadID].sellers.length === 0) return;

    let newList = [];
    shopData[threadID].sellers.forEach(seller => {
      if (!bank[seller.seller] || bank[seller.seller].balance < 50) {
        // skip if no coins
        return;
      }

      bank[seller.seller].balance -= 50;
      const autoMsg = `🛒 AUTO SHOP POST 🛒\n
👤 Seller: ${seller.name}
🔗 ${seller.fbLink}
📦 Item: ${seller.details}
💰 Balance: ${bank[seller.seller].balance.toLocaleString()} coins
🕒 Posted: ${formatDate()}

━━━━━━━━━━━━━━
👉 Gusto mo rin ma-post ang binebenta mo?
Type: /shop <details> (50 coins bawat auto-post)
`;
      api.sendMessage(autoMsg, threadID);
      newList.push(seller);
    });

    shopData[threadID].sellers = newList;
    saveShop(shopData);
    saveBank(bank);
  }, 20 * 60 * 1000); // 20 minutes
};
