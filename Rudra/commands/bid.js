const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

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
  version: "3.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auction system with multiple simultaneous bids",
  commandCategory: "Utility",
  usages: "/bid start <item> <amount> | /bid end <auction_id>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, senderID } = event;
  let auctions = loadAuctions();
  if (!auctions[threadID]) auctions[threadID] = [];

  const sub = args[0]?.toLowerCase();

  // start auction
  if (sub === "start") {
    const match = args.join(" ").match(/start\s+(.+)\s+(\d+)$/i);
    if (!match) {
      return api.sendMessage("❌ Usage: /bid start <item> <starting_amount>", threadID, messageID);
    }

    const item = match[1].trim();
    const startAmount = parseInt(match[2]);
    if (!item || isNaN(startAmount)) {
      return api.sendMessage("❌ Usage: /bid start <item> <starting_amount>", threadID, messageID);
    }

    const hostName = await Users.getNameUser(senderID);

    const newAuction = {
      id: uuidv4(), // unique ID for each auction
      active: true,
      item,
      highest: startAmount,
      bidder: null,
      bidderID: null,
      postID: null,
      hostID: senderID,
      hostName,
      endTime: Date.now() + 24 * 60 * 60 * 1000 // 24h auto end
    };

    auctions[threadID].push(newAuction);
    saveAuctions(auctions);

    return api.sendMessage(
      `📢 Auction Started!\n📦 Item: ${item}\n💵 Starting Bid: ${startAmount}\n👑 Host: ${hostName}\n🆔 Auction ID: ${newAuction.id}\n\n📝 Reply to this message with your bid!`,
      threadID,
      (err, info) => {
        if (!err) {
          newAuction.postID = info.messageID;
          saveAuctions(auctions);
        }
      }
    );
  }

  // end auction
  if (sub === "end") {
    const auctionID = args[1];
    if (!auctionID) {
      return api.sendMessage("❌ Usage: /bid end <auction_id>", threadID, messageID);
    }

    const auction = auctions[threadID]?.find(a => a.id === auctionID && a.active);
    if (!auction) {
      return api.sendMessage("⚠️ Auction not found or already ended.", threadID, messageID);
    }

    // check if sender is host or admin
    const threadInfo = await Threads.getInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);

    if (auction.hostID !== senderID && !isAdmin) {
      return api.sendMessage("❌ Only the host or a group admin can end this auction.", threadID, messageID);
    }

    const winner = auction.bidder
      ? `🏆 Winner: ${auction.bidder}\n📦 Item: ${auction.item}\n💵 Final Bid: ${auction.highest}`
      : `❌ No valid bids were placed for ${auction.item}.`;

    auction.active = false;
    saveAuctions(auctions);

    return api.sendMessage(`📌 Auction Ended!\n${winner}`, threadID);
  }

  return api.sendMessage("❌ Usage: /bid start <item> <amount> | /bid end <auction_id>", threadID, messageID);
};

// Handle replies for bidding
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, senderID, body, messageReply } = event;
  if (!body) return;

  let auctions = loadAuctions();
  if (!auctions[threadID]) return;

  // auto-remove expired auctions
  for (const auction of auctions[threadID]) {
    if (auction.active && Date.now() > auction.endTime) {
      const winner = auction.bidder
        ? `🏆 Winner: ${auction.bidder}\n📦 Item: ${auction.item}\n💵 Final Bid: ${auction.highest}`
        : `❌ No valid bids were placed for ${auction.item}.`;

      auction.active = false;
      api.sendMessage(`📌 Auction Ended (24h Auto)!\n${winner}`, threadID);
    }
  }

  // clean up thread if no active auctions left
  if (auctions[threadID].every(a => !a.active)) {
    delete auctions[threadID];
  }
  saveAuctions(auctions);

  // check replies for active auctions
  if (!messageReply) return;
  const auction = auctions[threadID]?.find(a => a.active && a.postID === messageReply.messageID);
  if (!auction) return;

  const match = body.match(/\d+/);
  if (!match) {
    return api.sendMessage("⚠️ Please enter a valid number for your bid.", threadID, messageID);
  }

  const bidAmount = parseInt(match[0]);

  if (bidAmount <= auction.highest) {
    return api.sendMessage(
      `⚠️ Your bid (${bidAmount}) must be higher than the current highest bid: ${auction.highest}.`,
      threadID,
      messageID
    );
  }

  const name = await Users.getNameUser(senderID);
  auction.highest = bidAmount;
  auction.bidder = name;
  auction.bidderID = senderID;

  saveAuctions(auctions);

  api.sendMessage(
    `📢 New Highest Bid!\n📦 Item: ${auction.item}\n💵 Bid: ${bidAmount}\n👤 Bidder: ${name}\n👑 Host: ${auction.hostName}\n🆔 Auction ID: ${auction.id}\n\n📝 Reply to this message to bid higher!`,
    threadID,
    (err, info) => {
      if (!err) {
        auction.postID = info.messageID;
        saveAuctions(auctions);
      }
    }
  );
};
