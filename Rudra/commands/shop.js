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
  version: "5.0.1",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Per-GC Auto Shop system (combined post every 20 minutes)",
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

  // immediate combined post
  let postContent = `🛒 AUTO SHOP POST (Auto post every 20 minutes) 🛒\n\n`;
  shopData[threadID].sellers.forEach(seller => {
    const bal = bank[seller.seller]?.balance ?? 0;
    postContent += `👤 Seller: ${seller.name}\n🔗 ${seller.fbLink}\n📦 Item: ${seller.details}\n💰 Balance: ${bal.toLocaleString()} coins\n\n━━━━━━━━━━━━━━\n\n`;
  });
  postContent += `🕒 Posted: ${formatDate()}\n\n👉 Gusto mo rin ma-post ang binebenta mo?\nType: /shop <details> (50 coins bawat auto-post)`;

  api.sendMessage(postContent, threadID);

  // reset interval for this thread
  if (shopTimers[threadID]) clearInterval(shopTimers[threadID]);

  shopTimers[threadID] = setInterval(() => {
    let bank = loadBank();
    let shopData = loadShop();
    if (!shopData[threadID] || shopData[threadID].sellers.length === 0) return;

    let stillActive = [];
    let autoPost = `🛒 AUTO SHOP POST (Auto post every 20 minutes) 🛒\n\n`;

    shopData[threadID].sellers.forEach(seller => {
      if (!bank[seller.seller] || bank[seller.seller].balance < 50) {
        // ❌ Wala nang coins → hindi na isasama
        return;
      }

      // ✅ May sapat na coins → bawasan at isama sa post
      bank[seller.seller].balance -= 50;
      autoPost += `👤 Seller: ${seller.name}\n🔗 ${seller.fbLink}\n📦 Item: ${seller.details}\n💰 Balance: ${bank[seller.seller].balance.toLocaleString()} coins\n\n━━━━━━━━━━━━━━\n\n`;
      stillActive.push(seller);
    });

    if (stillActive.length > 0) {
      autoPost += `🕒 Updated: ${formatDate()}\n\n👉 Want to post your items too?\nType: /shop <details> (50 coins per auto-post)`;
      api.sendMessage(autoPost, threadID);
    }

    // ✅ Update sellers list with only those who still have coins
    shopData[threadID].sellers = stillActive;
    saveShop(shopData);
    saveBank(bank);
  }, 20 * 60 * 1000); // every 20 minutes
};
