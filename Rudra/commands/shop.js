const fs = require("fs");
const path = require("path");

// === Paths ===
const bankFile = path.join(__dirname, "bank.json");
const shopFile = path.join(__dirname, "shop.json");

// === Ensure files exist ===
if (!fs.existsSync(bankFile)) fs.writeFileSync(bankFile, JSON.stringify({}, null, 2), "utf8");
if (!fs.existsSync(shopFile)) fs.writeFileSync(shopFile, JSON.stringify([], null, 2), "utf8");

// === Load/Save Bank ===
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

// === Load/Save Shop ===
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

// === Format Date ===
function formatDate() {
  const now = new Date();
  return now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

module.exports.config = {
  name: "shop",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto Shop system with coin deduction",
  commandCategory: "Economy",
  usages: "/shop <details> <fb link> | /shop remove",
  cooldowns: 5,
};

// === Command ===
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const bank = loadBank();
  let shopList = loadShop();

  // Ensure user exists in bank
  if (!bank[senderID]) bank[senderID] = { balance: 0 };

  const sub = args[0]?.toLowerCase();

  // Remove shop
  if (sub === "remove") {
    shopList = shopList.filter(item => item.seller !== senderID);
    saveShop(shopList);
    return api.sendMessage("✅ Tinanggal na ang entry mo sa Auto Shop.", threadID);
  }

  // Add shop
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /shop <details> <fb link>", threadID);
  }

  const fbLink = args[args.length - 1];
  const details = args.slice(0, -1).join(" ");
  const name = await Users.getNameUser(senderID);

  shopList.push({
    seller: senderID,
    name,
    fbLink,
    details,
    threadID,
  });

  saveShop(shopList);

  return api.sendMessage(
    `✅ Naidagdag ka sa Auto Shop!\n👤 ${name}\n📦 ${details}\n🔗 ${fbLink}\n\n💰 Bawat auto-post ay babawasan ka ng 50 coins.`,
    threadID
  );
};

// === Auto-post every 20 minutes ===
setInterval(() => {
  let bank = loadBank();
  let shopList = loadShop();
  let changed = false;

  shopList = shopList.filter(item => {
    if (!bank[item.seller] || bank[item.seller].balance < 50) {
      changed = true;
      return false; // remove pag wala coins
    }

    // Deduct 50 coins
    bank[item.seller].balance -= 50;

    const msg = `🛒 AUTO SHOP POST 🛒\n
👤 Seller: ${item.name}
🔗 ${item.fbLink}
📦 Item: ${item.details}
💰 Balance: ${bank[item.seller].balance.toLocaleString()} coins
🕒 Posted: ${formatDate()}

━━━━━━━━━━━━━━
👉 Gusto mo rin ma-post ang binebenta mo?
Type: /shop <details ng binebenta mo> <fb link> (50 coins bawat post)
`;

    try {
      api.sendMessage(msg, item.threadID);
    } catch (e) {
      console.error("Shop auto-post error:", e);
    }
    return true;
  });

  if (changed) saveShop(shopList);
  saveBank(bank);
}, 20 * 60 * 1000); // every 20 minutes
