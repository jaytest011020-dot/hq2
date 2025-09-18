const { setData, getData } = require("../../database.js");

// 🔑 Helper: generate 6-digit auction ID
function generateID() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔧 Usage Example Helper
function usageExample(api, threadID, messageID) {
  return api.sendMessage(
    `❌ Wrong usage!\n\n📌 Correct Usage:\n/bid start <item> <starting_amount>\n/bid end <auction_id>\n/bid resend <auction_id>\n\n💡 Examples:\n/bid start Raccoon 200\n/bid end 123456\n/bid resend 654321`,
    threadID,
    messageID
  );
}

// 🔑 Helper: Fetch username by UID (same style as bank.js)
async function getUserName(uid, Users, api) {
  try {
    let name = await Users.getNameUser(uid);
    if (!name || name === uid) {
      let info = await api.getUserInfo(uid);
      if (info && info[uid]?.name) {
        name = info[uid].name;
      } else {
        name = uid;
      }
    }
    return name;
  } catch (err) {
    console.log(`[BID] Error fetching name for UID: ${uid}`, err);
    return uid;
  }
}

module.exports.config = {
  name: "bid",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord",
  description: "Auction system with 6-digit IDs, auto-end in 24h, and resend option (DB version)",
  commandCategory: "game",
  usages: "/bid start <item> <amount> | /bid end <id> | /bid resend <id>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, senderID } = event;

  // 🔹 Load thread data
  let threadData = (await getData(threadID)) || {};
  let auctions = threadData.auctions || [];

  const sub = args[0]?.toLowerCase();

  // start auction
  if (sub === "start") {
    const match = args.join(" ").match(/start\s+(.+)\s+(\d+)$/i);
    if (!match) return usageExample(api, threadID, messageID);

    const item = match[1].trim();
    const startAmount = parseInt(match[2]);
    if (!item || isNaN(startAmount)) return usageExample(api, threadID, messageID);

    const hostName = await getUserName(senderID, Users, api);

    const newAuction = {
      id: generateID(),
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

    auctions.push(newAuction);
    threadData.auctions = auctions;
    await setData(threadID, { data: threadData });

    return api.sendMessage(
      `📢 Auction Started!\n📦 Item: ${item}\n💵 Starting Bid: ${startAmount}\n👑 Host: ${hostName}\n🆔 Auction ID: ${newAuction.id}\n\n📝 Reply to this message with your bid!`,
      threadID,
      (err, info) => {
        if (!err) {
          newAuction.postID = info.messageID;
          threadData.auctions = auctions;
          setData(threadID, { data: threadData });
        }
      }
    );
  }

  // end auction
  if (sub === "end") {
    const auctionID = args[1];
    if (!auctionID) return usageExample(api, threadID, messageID);

    const auction = auctions.find(a => a.id === auctionID && a.active);
    if (!auction) return api.sendMessage("⚠️ Auction not found or already ended.", threadID, messageID);

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
    threadData.auctions = auctions;
    await setData(threadID, { data: threadData });

    return api.sendMessage(`📌 Auction Ended!\n${winner}`, threadID);
  }

  // resend auction post
  if (sub === "resend") {
    const auctionID = args[1];
    if (!auctionID) return usageExample(api, threadID, messageID);

    const auction = auctions.find(a => a.id === auctionID && a.active);
    if (!auction) return api.sendMessage("⚠️ Auction not found or already ended.", threadID, messageID);

    return api.sendMessage(
      `📢 Auction Resent!\n📦 Item: ${auction.item}\n💵 Current Highest: ${auction.highest}\n👤 Bidder: ${auction.bidder || "None"}\n👑 Host: ${auction.hostName}\n🆔 Auction ID: ${auction.id}\n\n📝 Reply to this message with your bid!`,
      threadID,
      (err, info) => {
        if (!err) {
          auction.postID = info.messageID;
          threadData.auctions = auctions;
          setData(threadID, { data: threadData });
        }
      }
    );
  }

  // default: wrong usage
  return usageExample(api, threadID, messageID);
};

// 📌 Handle replies for bidding
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, senderID, body, messageReply } = event;
  if (!body) return;

  let threadData = (await getData(threadID)) || {};
  let auctions = threadData.auctions || [];

  // auto-remove expired auctions
  for (const auction of auctions) {
    if (auction.active && Date.now() > auction.endTime) {
      const winner = auction.bidder
        ? `🏆 Winner: ${auction.bidder}\n📦 Item: ${auction.item}\n💵 Final Bid: ${auction.highest}`
        : `❌ No valid bids were placed for ${auction.item}.`;

      auction.active = false;
      api.sendMessage(`📌 Auction Ended (24h Auto)!\n${winner}`, threadID);
    }
  }

  // clean up if walang active auction
  if (auctions.every(a => !a.active)) {
    auctions = [];
  }
  threadData.auctions = auctions;
  await setData(threadID, { data: threadData });

  // check replies for active auctions
  if (!messageReply) return;
  const auction = auctions.find(a => a.active && a.postID === messageReply.messageID);
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

  const name = await getUserName(senderID, Users, api);
  auction.highest = bidAmount;
  auction.bidder = name;
  auction.bidderID = senderID;

  threadData.auctions = auctions;
  await setData(threadID, { data: threadData });

  api.sendMessage(
    `📢 New Highest Bid!\n📦 Item: ${auction.item}\n💵 Bid: ${bidAmount}\n👤 Bidder: ${name}\n👑 Host: ${auction.hostName}\n🆔 Auction ID: ${auction.id}\n\n📝 Reply to this message to bid higher!`,
    threadID,
    (err, info) => {
      if (!err) {
        auction.postID = info.messageID;
        threadData.auctions = auctions;
        setData(threadID, { data: threadData });
      }
    }
  );
};
