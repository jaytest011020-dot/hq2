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

module.exports.config = {
  name: "bid",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auction system for group chats",
  commandCategory: "Utility",
  usages: "/bid start <item> <amount> | /bid end",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, senderID } = event;
  let auctions = loadAuctions();
  if (!auctions[threadID]) auctions[threadID] = { active: false };

  const sub = args[0]?.toLowerCase();

  // start auction
  if (sub === "start") {
    if (auctions[threadID].active) {
      return api.sendMessage("⚠️ An auction is already active. End it before starting a new one.", threadID, messageID);
    }

    const item = args[1];
    const startAmount = parseInt(args[2]);

    if (!item || isNaN(startAmount)) {
      return api.sendMessage("❌ Usage: /bid start <item> <starting_amount>", threadID, messageID);
    }

    const hostName = await Users.getNameUser(senderID);

    auctions[threadID] = {
      active: true,
      item,
      highest: startAmount,
      bidder: null,
      bidderID: null,
      postID: null,
      hostID: senderID,
      hostName,
      startTime: Date.now() // save start time
    };

    saveAuctions(auctions);

    return api.sendMessage(
      `📢 Auction Started!\n📦 Item: ${item}\n💵 Starting Bid: ${startAmount}\n👑 Host: ${hostName}\n⏳ Auto ends in 24h if not ended manually.\n\nReply to this message with your bid!`,
      threadID,
      (err, info) => {
        if (!err) {
          auctions[threadID].postID = info.messageID;
          saveAuctions(auctions);
        }
      }
    );
  }

  // end auction
  if (sub === "end") {
    if (!auctions[threadID].active) {
      return api.sendMessage("⚠️ No active auction to end.", threadID, messageID);
    }

    const auction = auctions[threadID];

    // check if sender is host or thread admin
    const threadInfo = await Threads.getInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);

    if (auction.hostID !== senderID && !isAdmin) {
      return api.sendMessage("❌ Only the auction starter or a group admin can end this bid.", threadID, messageID);
    }

    const winner = auction.bidder
      ? `🏆 Winner: ${auction.bidder}\n📦 Item: ${auction.item}\n💵 Final Bid: ${auction.highest}`
      : `❌ No valid bids were placed for ${auction.item}.`;

    const hostLine = `👑 Host: ${auction.hostName}`;

    auctions[threadID] = { active: false };
    saveAuctions(auctions);

    return api.sendMessage(`📌 Auction Ended!\n${hostLine}\n${winner}`, threadID);
  }

  return api.sendMessage("❌ Usage: /bid start <item> <amount> | /bid end", threadID, messageID);
};

// Handle replies for bidding
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!body) return;
  let auctions = loadAuctions();
  const auction = auctions[threadID];
  if (!auction || !auction.active) return;

  // ⏳ Auto remove check (24h = 86400000ms)
  if (Date.now() - auction.startTime >= 86400000) {
    const winner = auction.bidder
      ? `🏆 Winner: ${auction.bidder}\n📦 Item: ${auction.item}\n💵 Final Bid: ${auction.highest}`
      : `❌ No valid bids were placed for ${auction.item}.`;
    const hostLine = `👑 Host: ${auction.hostName}`;

    auctions[threadID] = { active: false };
    saveAuctions(auctions);

    return api.sendMessage(`⏰ Auction Auto-Ended (24h reached)!\n${hostLine}\n${winner}`, threadID);
  }

  // Only detect replies to the auction post
  if (!messageReply || messageReply.messageID !== auction.postID) return;

  // Extract first number in message
  const match = body.match(/\d+/);
  if (!match) {
    return api.sendMessage("⚠️ Please enter a valid number for your bid.", threadID, messageID);
  }

  const bidAmount = parseInt(match[0]);
  if (bidAmount <= auction.highest) {
    return api.sendMessage(`⚠️ Your bid must be higher than ${auction.highest}.`, threadID, messageID);
  }

  const name = await Users.getNameUser(senderID);

  auction.highest = bidAmount;
  auction.bidder = name;
  auction.bidderID = senderID;
  saveAuctions(auctions);

  api.sendMessage(
    `📢 New Highest Bid!\n📦 Item: ${auction.item}\n💵 Bid: ${bidAmount}\n👤 Bidder: ${name}\n👑 Host: ${auction.hostName}`,
    threadID
  );
};
