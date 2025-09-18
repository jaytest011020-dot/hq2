const { getData, setData, deleteData } = require("../../database.js");

function formatBid(bid) {
  return (
`📢 ┃ Auction Started ┃ 📢
─────────────────────────────
📦 Item: ${bid.item}
💰 Current Bid: ${bid.currentBid} by ${bid.highestBidder ? bid.highestBidder : "None"}
🏷️ Starting Price: ${bid.startPrice}
─────────────────────────────
⏳ Ends in: ${Math.max(0, Math.floor((bid.end - Date.now()) / 1000))}s
📅 End: ${new Date(bid.end).toLocaleString()}
─────────────────────────────
✅ Place bid: /bid <amount>
❌ End auction: /bid end
`
  );
}

async function endBid(api, threadID, bid) {
  if (bid.ended) return;
  bid.ended = true;

  let msg = `⏰ Auction Ended!\n📦 Item: ${bid.item}\n`;

  if (bid.highestBidder) {
    msg += `🏆 Winner: ${bid.highestBidder}\n💰 Price: ${bid.currentBid}`;
  } else {
    msg += `❌ No bids placed.`;
  }

  api.sendMessage(msg, threadID);
  await deleteData(`bid/${threadID}`);
}

module.exports.config = {
  name: "bid",
  version: "3.0.0",
  hasPermssion: 1,
  credits: "ChatGPT + NN",
  description: "Auction system with database",
  commandCategory: "system",
  usages: "/bid start <item> <price> | /bid <amount> | /bid end | /bid info",
  cooldowns: 2,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const sub = args[0]?.toLowerCase();
  let bid = await getData(`bid/${threadID}`);

  // start auction
  if (sub === "start") {
    if (bid) return api.sendMessage("⚠️ May active auction pa.", threadID, messageID);

    const item = args[1];
    const startPrice = parseInt(args[2]);

    if (!item || isNaN(startPrice)) {
      return api.sendMessage("❌ Usage: /bid start <item> <starting_price>", threadID, messageID);
    }

    bid = {
      item,
      startPrice,
      currentBid: startPrice,
      highestBidder: null,
      end: Date.now() + 60000, // default 1 min
      ended: false,
    };

    api.sendMessage(
      formatBid(bid),
      threadID,
      async (err, info) => {
        if (!err) {
          bid.messageID = info.messageID;
          await setData(`bid/${threadID}`, bid);
        }
      }
    );

    setTimeout(async () => {
      let b = await getData(`bid/${threadID}`);
      if (b && !b.ended) await endBid(api, threadID, b);
    }, 60000);

    return;
  }

  // place bid
  if (!isNaN(sub)) {
    if (!bid) return api.sendMessage("⚠️ Walang active auction.", threadID, messageID);
    if (bid.ended) return api.sendMessage("❌ Auction already ended.", threadID, messageID);

    const amount = parseInt(sub);
    if (amount <= bid.currentBid) {
      return api.sendMessage(`❌ Bid must be higher than current bid (${bid.currentBid}).`, threadID, messageID);
    }

    bid.currentBid = amount;
    bid.highestBidder = senderID;

    // delete old message and resend
    if (bid.messageID) {
      api.unsendMessage(bid.messageID, () => {});
    }

    api.sendMessage(
      formatBid(bid),
      threadID,
      async (err, info) => {
        if (!err) {
          bid.messageID = info.messageID;
          await setData(`bid/${threadID}`, bid);
        }
      }
    );

    return;
  }

  // end auction manually
  if (sub === "end") {
    if (!bid) return api.sendMessage("⚠️ Walang active auction.", threadID, messageID);
    await endBid(api, threadID, bid);
    return;
  }

  // info
  if (sub === "info") {
    if (!bid) return api.sendMessage("⚠️ Walang active auction.", threadID, messageID);
    return api.sendMessage(formatBid(bid), threadID, messageID);
  }

  return api.sendMessage("❌ Usage: /bid start <item> <price> | /bid <amount> | /bid end | /bid info", threadID, messageID);
};
