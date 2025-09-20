const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "giveaway",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaz La Peña",
  description: "Giveaways with multiple active IDs, join via reply, auto-update & end, Firebase persistence",
  commandCategory: "group",
  usages: "/giveaway <prize> <end time> | /giveaway resend <ID>",
  cooldowns: 5,
};

if (!global.giveaways) global.giveaways = {};

// Parse time string (1m, 1h, 1d)
function parseTime(str) {
  const match = str.match(/(\d+)([smhd])/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * multipliers[unit];
}

// Generate 4-digit unique ID
function generateID(existing) {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existing[id]);
  return id;
}

// Build giveaway message
async function buildMessage(api, threadID, data, mentionID = null) {
  const total = (await api.getThreadInfo(threadID)).participantIDs.length;
  const progress = `${data.joined.length} / ${total}`;

  let msg = `
🎁 GIVEAWAY 🎁
──────────────────────
🏆 Prize: ${data.prize}
🆔 ID: #${data.ID}
📌 Status: ${data.status.toUpperCase()}
⏰ Ends: ${new Date(data.end).toLocaleString("en-PH", { hour12: false })}
──────────────────────
✅ Participants: ${progress}
Reply "join" to participate
  `.trim();

  const mentions = [];
  if (mentionID) {
    const info = await api.getUserInfo(mentionID);
    const name = info[mentionID]?.name || "User";
    mentions.push({ tag: name, id: mentionID });
    msg += `\n\n✨ ${name} has joined the giveaway!`;
  }

  if (data.joined.length > 0) {
    const infoAll = await api.getUserInfo(data.joined);
    const participants = data.joined.map(uid => `• ${infoAll[uid]?.name || "User"}`).join("\n");
    msg += `\n\n👥 Participants:\n${participants}`;
  }

  return { body: msg, mentions };
}

// Roll winner
async function rollWinner(api, threadID, data) {
  if (data.joined.length === 0) {
    return api.sendMessage(`❌ No participants joined giveaway #${data.ID}.`, threadID);
  }
  const winner = data.joined[Math.floor(Math.random() * data.joined.length)];
  const info = await api.getUserInfo(winner);
  const name = info[winner]?.name || "User";

  return api.sendMessage({
    body: `🎉 Congratulations ${name}!\n🏆 You won giveaway #${data.ID}\nPrize: ${data.prize}`,
    mentions: [{ tag: name, id: winner }]
  }, threadID);
}

// End giveaway
async function endGiveaway(api, data) {
  data.status = "ended";
  await setData(`giveaway/${data.ID}`, data);

  if (data.messageID) {
    try { await api.unsendMessage(data.messageID); } catch {}
  }

  const msg = {
    body: `⏰ Giveaway #${data.ID} has ended! Rolling winner...`,
  };
  const info = await api.sendMessage(msg, data.threadID);
  data.messageID = info.messageID;
  await setData(`giveaway/${data.ID}`, data);

  await rollWinner(api, data.threadID, data);
}

// Handle user join via reply
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, body, messageID } = event;
  if (!body || body.toLowerCase() !== "join") return;

  const allGiveaways = await getData("giveaway") || {};
  for (const ID in allGiveaways) {
    const data = allGiveaways[ID];
    if (data.threadID !== threadID) continue;
    if (data.status !== "open") continue;
    if (data.joined.includes(senderID)) continue;

    data.joined.push(senderID);

    if (data.messageID) {
      try { await api.unsendMessage(data.messageID); } catch {}
    }

    const msg = await buildMessage(api, threadID, data, senderID);
    const info = await api.sendMessage(msg, threadID);
    data.messageID = info.messageID;
    await setData(`giveaway/${ID}`, data);
  }
};

// Run command
module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, isGroup } = event;

  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);
  const ownerID = "61559999326713"; // change to your bot owner ID

  // RESEND
  if (args[0]?.toLowerCase() === "resend") {
    const ID = args[1]?.replace("#", "");
    if (!ID) return api.sendMessage("❌ Provide giveaway ID to resend.", threadID);

    const data = await getData(`giveaway/${ID}`);
    if (!data) return api.sendMessage("❌ Giveaway not found.", threadID);
    if (data.status !== "open") return api.sendMessage("❌ Giveaway ended.", threadID);

    if (data.messageID) {
      try { await api.unsendMessage(data.messageID); } catch {}
    }

    const msg = await buildMessage(api, threadID, data);
    const infoMsg = await api.sendMessage(msg, threadID);
    data.messageID = infoMsg.messageID;
    await setData(`giveaway/${ID}`, data);
    return;
  }

  // CREATE
  if (!isAdmin && senderID !== ownerID) return api.sendMessage("❌ Only admins or bot owner can create giveaways.", threadID);
  if (args.length < 2) return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway 1 Golden Raccoon 1d", threadID);

  const timeStr = args[args.length - 1];
  const prize = args.slice(0, -1).join(" ");
  const duration = parseTime(timeStr);
  if (!duration) return api.sendMessage("❌ Invalid time format.", threadID);

  const allGiveaways = await getData("giveaway") || {};
  const ID = generateID(allGiveaways);
  const end = Date.now() + duration;

  const data = {
    ID,
    prize,
    author: senderID,
    joined: [],
    status: "open",
    end,
    threadID
  };

  allGiveaways[ID] = data;
  await setData("giveaway", allGiveaways);
  global.giveaways[ID] = data;

  // Schedule auto-end
  setTimeout(() => endGiveaway(api, data), duration);

  // First post
  const msg = await buildMessage(api, threadID, data);
  const infoMsg = await api.sendMessage(msg, threadID);
  data.messageID = infoMsg.messageID;
  await setData(`giveaway/${ID}`, allGiveaways);
};

// Restart recovery
setTimeout(async () => {
  if (!global.api) return;
  const all = await getData("giveaway") || {};
  for (const ID in all) {
    const data = all[ID];
    if (data.status === "open") {
      global.giveaways[ID] = data;
      const remaining = data.end - Date.now();
      if (remaining > 0) {
        setTimeout(() => endGiveaway(global.api, data), remaining);
      } else {
        endGiveaway(global.api, data);
      }
    }
  }
}, 5000);
