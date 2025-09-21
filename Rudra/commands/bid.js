const fs = require("fs");
const path = require("path");
const auctionFile = path.join(__dirname, "auctions.json");

// Ensure file exists
if (!fs.existsSync(auctionFile)) fs.writeFileSync(auctionFile, JSON.stringify({}, null, 2), "utf8");

// Load/save auctions
function loadAuctions() {
  try {
    return JSON.parse(fs.readFileSync(auctionFile, "utf8"));
  } catch {
    return {};
  }
}
function saveAuctions(data) {
  fs.writeFileSync(auctionFile, JSON.stringify(data, null, 2), "utf8");
}

// Generate 6-digit ID
function generateID() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Usage Example Helper
function usageExample(api, threadID, messageID) {
  return api.sendMessage(
    `❌ Wrong usage!\n\n📌 Correct Usage:\n/bid start <item> <starting_amount>\n/bid end <auction_id>\n/bid resend <auction_id>\n\n💡 Examples:\n/bid start Raccoon 200\n/bid end 123456\n/bid resend 654321`,
    threadID,
    messageID
  );
}

// --- Load database functions for maintenance ---
const { getData } = require("../../database.js"); // adjust path if needed

module.exports.config = {
  name: "bid",
  version: "3.1.2",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord",
  description: "Auction system with 6-digit IDs, auto-end in 24h, and resend option",
  commandCategory: "gag tools",
  usages: "/bid start <item> <amount> | /bid end <id> | /bid resend <id>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, senderID } = event;

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const mp4Path = path.join(__dirname, "cache", "AI data.mp4"); // relative path
      return api.sendMessage(
        {
          body: "🚧 Bot is currently under maintenance. Auction commands are temporarily disabled.",
          attachment: fs.createReadStream(mp4Path),
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  let auctions = loadAuctions();
  if (!auctions[threadID]) auctions[threadID] = [];

  const sub = args[0]?.toLowerCase();

  // ... [rest of the auction logic stays the same]
  // start, end, resend, and default usage code remain unchanged
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, senderID, body, messageReply } = event;
  if (!body) return;

  // --- Maintenance check ---
  try {
    const { getData } = require("../../database.js");
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) return; // skip any auction activity during maintenance
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  let auctions = loadAuctions();
  if (!auctions[threadID]) return;

  // ... [rest of handleEvent logic stays the same]
};
