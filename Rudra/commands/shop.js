const fs = require("fs");
const path = require("path");

// === Paths ===
const bankFile = path.join(__dirname, "bank.json");
const shopFile = path.join(__dirname, "shop.json");

// Ensure files exist
if (!fs.existsSync(bankFile)) fs.writeFileSync(bankFile, JSON.stringify({}, null, 2), "utf8");
if (!fs.existsSync(shopFile)) fs.writeFileSync(shopFile, JSON.stringify([], null, 2), "utf8");

// Bank helpers
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

// Shop helpers
function loadShop() {
  try {
    return JSON.parse(fs.readFileSync(shopFile, "utf8"));
  } catch {
    return [];
  }
}
function saveShop(data) {
  fs.writeFileSync(shopFile, JSON.stringify(data, null, 2), "utf8");
}

// Format PH time
function formatDate() {
  const now = new Date();
  return now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

module.exports.config = {
  name: "shop",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto Shop system (deduct new add + batch cycle)",
  commandCategory: "Economy",
  usages: "/shop <details> | /shop remove",
  cooldowns: 5,
};

let shopTimer = null; // Global 20-min cycle timer

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  let bank = loadBank();
  let shopList = loadShop();

  if (!bank[senderID]) bank[senderID] = { balance: 0 };

  const sub = args[0]?.toLowerCase();

  // Remove item
  if (sub === "remove") {
    shopList = shopList.filter(item => item.seller !== senderID);
    saveShop(shopList);
    return api.sendMessage("✅ Tinanggal na ang entry mo sa Auto Shop.", threadID);
  }

  // Require details
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /shop <details>", threadID);
  }

  const details = args.join(" ");
  const name = await Users.getNameUser(senderID);

  // Auto-get FB link
  const info = await Users.getInfo(senderID);
  const fbLink = info?.profileUrl || `https://facebook.com/${senderID}`;

  // Deduct 50 coins agad sa bagong add
  if (bank[senderID].balance < 50) {
    return api.sendMessage("❌ Kailangan mo ng at least 50 coins para makapag-add sa Auto Shop.", threadID);
  }
  bank[senderID].balance -= 50;
  saveBank(bank);

  // Add to shop list
  shopList.push({
    seller: senderID,
    name,
    fbLink,
    details,
    threadID,
  });
  saveShop(shopList);

  // Immediate post for this seller
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

  // Reset timer (start new 20-min cycle for ALL sellers)
  if (shopTimer) clearInterval(shopTimer);

  shopTimer = setInterval(() => {
    let bank = loadBank();
    let shopList = loadShop();
    let changed = false;

    shopList = shopList.filter(item => {
      if (!bank[item.seller] || bank[item.seller].balance < 50) {
        changed = true;
        return false;
      }

      bank[item.seller].balance -= 50;

      const autoMsg = `🛒 AUTO SHOP POST 🛒\n
👤 Seller: ${item.name}
🔗 ${item.fbLink}
📦 Item: ${item.details}
💰 Balance: ${bank[item.seller].balance.toLocaleString()} coins
🕒 Posted: ${formatDate()}

━━━━━━━━━━━━━━
👉 Gusto mo rin ma-post ang binebenta mo?
Type: /shop <details> (50 coins bawat auto-post)
`;

      try {
        api.sendMessage(autoMsg, item.threadID);
      } catch (e) {
        console.error("Shop auto-post error:", e);
      }
      return true;
    });

    if (changed) saveShop(shopList);
    saveBank(bank);
  }, 20 * 60 * 1000);

  return api.sendMessage(
    `✅ Naidagdag ka sa Auto Shop!\n👤 ${name}\n📦 ${details}\n\n💰 Bawas agad: 50 coins.\n⏰ Susunod na cycle: lahat ng sellers mababawasan ulit.`,
    threadID
  );
};
