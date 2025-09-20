const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "giveaway",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaz La Peña",
  description: "Giveaway with reactions, Firebase persistence, auto-end, and resend",
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
(React to join)
  `.trim();

  const mentions = [];
  if (mentionID) {
    const info = await api.getUserInfo(mentionID);
    const name = info[mentionID]?.name || "User";
    mentions.push({ tag: name, id: mentionID });
    msg += `\n\n✨ ${name} has joined the giveaway!`;
  }

  // Add all participants below
  if (data.joined.length > 0) {
    const infoAll = await api.getUserInfo(data.joined);
    const participants = data.joined.map(uid => `• ${infoAll[uid]?.name || "User"}`).join("\n");
    msg += `\n\n👥 Participants:\n${participants}`;
  }

  return { body: msg, mentions };
}

// Roll winners
async function rollWinners(api, threadID, data) {
  if (data.joined.length === 0) {
    return api.sendMessage(`❌ No participants joined giveaway #${data.ID}.`, threadID);
  }

  const winner = data.joined[Math.floor(Math.random() * data.joined.length)];
  const info = await api.getUserInfo(winner);
  const name = info[winner]?.name || "User";

  return api.sendMessage({
    body: `🎉 Congratulations ${name}!\n\n🏆 You won giveaway #${data.ID}\nPrize: ${data.prize}`,
    mentions: [{ tag: name, id: winner }]
  }, threadID);
}

// End giveaway
async function endGiveaway(api, threadID, data) {
  data.status = "ended";
  await setData(`giveaway/${data.ID}`, data);

  // unsend old message
  if (data.messageID) {
    try { await api.unsendMessage(data.messageID); } catch {}
  }

  const msg = {
    body: `⏰ Giveaway #${data.ID} has ended! Rolling winner...`,
  };
  const info = await api.sendMessage(msg, threadID);
  data.messageID = info.messageID;
  await setData(`giveaway/${data.ID}`, data);

  await rollWinners(api, threadID, data);
}

// Handle reactions
module.exports.handleReaction = async ({ api, event, handleReaction }) => {
  const { threadID, userID } = event;
  const ID = handleReaction.ID;

  let data = await getData(`giveaway/${ID}`);
  if (!data || data.status !== "open") return;
  if (data.joined.includes(userID)) return; // already joined

  data.joined.push(userID);
  await setData(`giveaway/${ID}`, data);

  // unsend old message
  if (data.messageID) {
    try { await api.unsendMessage(data.messageID); } catch {}
  }

  // build updated message at mention
  const msg = await buildMessage(api, threadID, data, userID);
  api.sendMessage(msg, threadID, (err, info) => {
    if (!err) {
      data.messageID = info.messageID;
      setData(`giveaway/${ID}`, data);
    }
  });
};

// Run command
module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID } = event;

  // RESEND
  if (args[0]?.toLowerCase() === "resend") {
    const ID = args[1]?.replace("#", "");
    if (!ID) return api.sendMessage("❌ Please provide giveaway ID to resend.", threadID);

    const data = await getData(`giveaway/${ID}`);
    if (!data) return api.sendMessage("❌ Giveaway not found.", threadID);

    if (data.status !== "open") return api.sendMessage("❌ Giveaway already ended.", threadID);

    // unsend old message
    if (data.messageID) {
      try { await api.unsendMessage(data.messageID); } catch {}
    }

    const msg = await buildMessage(api, threadID, data);
    api.sendMessage(msg, threadID, (err, info) => {
      if (!err) {
        data.messageID = info.messageID;
        setData(`giveaway/${ID}`, data);
      }
    });
    return;
  }

  // CREATE
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway 1 Golden Raccoon 1d", threadID);
  }

  const timeStr = args[args.length - 1];
  const prize = args.slice(0, -1).join(" ");
  const duration = parseTime(timeStr);

  if (!duration) return api.sendMessage("❌ Invalid time format. Use s, m, h, or d (e.g. 1h, 30m, 2d).", threadID);

  const ID = Date.now().toString(36);
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

  await setData(`giveaway/${ID}`, data);
  global.giveaways[ID] = data;

  // Schedule auto-end
  setTimeout(() => endGiveaway(api, threadID, data), duration);

  // First post
  const msg = await buildMessage(api, threadID, data);
  api.sendMessage(msg, threadID, (err, info) => {
    if (!err) {
      data.messageID = info.messageID;
      setData(`giveaway/${ID}`, data);
      global.client.handleReaction.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        ID
      });
    }
  });
};

// Restart recovery
setTimeout(async () => {
  if (!global.api) return;
  const all = await getData("giveaway");
  if (!all) return;

  for (const ID in all) {
    const data = all[ID];
    if (data.status === "open") {
      global.giveaways[ID] = data;
      const remaining = data.end - Date.now();
      if (remaining > 0) {
        setTimeout(() => endGiveaway(global.api, data.threadID, data), remaining);
      } else {
        endGiveaway(global.api, data.threadID, data);
      }
    }
  }
}, 5000);
