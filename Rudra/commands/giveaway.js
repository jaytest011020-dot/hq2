const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "giveaway",
  version: "5.1.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaz La Peña",
  description: "Giveaway with join by reply, live countdown, auto-end, and resend",
  commandCategory: "group",
  usages: "/giveaway <prize> <time> | /giveaway resend <ID>",
  cooldowns: 5,
};

if (!global.giveaways) global.giveaways = {};

// Parse duration like "1m", "2h", "1d"
function parseDuration(str) {
  const match = str.match(/(\d+)([mhd])/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return val * multipliers[unit];
}

// Format remaining time
function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// Build giveaway message
async function buildMessage(api, data, mentionID = null) {
  const totalParticipants = data.joined.length;
  let msg = `
🎁 GIVEAWAY 🎁
──────────────────────
🏆 Prize: ${data.prize}
🆔 ID: #${data.ID}
📌 Status: ${data.status.toUpperCase()}
⏰ Ends in: ${formatTime(data.end - Date.now())}
──────────────────────
✅ Participants: ${totalParticipants}
Reply "join" to participate!
`.trim();

  const mentions = [];
  if (mentionID) {
    const info = await api.getUserInfo(mentionID);
    const name = info[mentionID]?.name || "User";
    mentions.push({ tag: name, id: mentionID });
    msg += `\n\n✨ ${name} joined the giveaway!`;
  }

  if (data.joined.length > 0) {
    const infoAll = await api.getUserInfo(data.joined);
    const participants = data.joined.map(uid => `• ${infoAll[uid]?.name || "User"}`).join("\n");
    msg += `\n\n👥 Participants:\n${participants}`;
  }

  return { body: msg, mentions };
}

// Roll winner
async function rollWinner(api, data) {
  if (data.joined.length === 0) return null;
  const winnerID = data.joined[Math.floor(Math.random() * data.joined.length)];
  const info = await api.getUserInfo(winnerID);
  const name = info[winnerID]?.name || "User";
  return { id: winnerID, name };
}

// End giveaway
async function endGiveaway(api, data) {
  data.status = "ended";
  await setData(`giveaway/${data.ID}`, data);

  if (data.messageID) {
    try { await api.unsendMessage(data.messageID); } catch {}
  }

  const winner = await rollWinner(api, data);
  let body = `⏰ Giveaway #${data.ID} ended!`;
  const mentions = [];
  if (winner) {
    body += `\n🎉 Winner: ${winner.name}\nPrize: ${data.prize}`;
    mentions.push({ tag: winner.name, id: winner.id });
  } else {
    body += `\n❌ No participants joined.`;
  }

  const info = await api.sendMessage({ body, mentions }, data.threadID);
  data.messageID = info.messageID;
  await setData(`giveaway/${data.ID}`, data);
}

// Live countdown updater
function startCountdown(api, data) {
  const interval = setInterval(async () => {
    if (data.status !== "open") return clearInterval(interval);

    if (Date.now() >= data.end) {
      clearInterval(interval);
      return endGiveaway(api, data);
    }

    if (data.messageID) {
      try { await api.unsendMessage(data.messageID); } catch {}
    }

    const msg = await buildMessage(api, data);
    const info = await api.sendMessage(msg, data.threadID);
    data.messageID = info.messageID;
    await setData(`giveaway/${data.ID}`, data);
  }, 10000); // update every 10 seconds
  data.countdown = interval;
}

// Handle user replies to join
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!body || body.toLowerCase() !== "join") return;

  const giveaways = await getData("giveaway");
  if (!giveaways) return;

  for (const ID in giveaways) {
    const data = giveaways[ID];
    if (data.threadID !== threadID || data.status !== "open") continue;

    if (!data.joined.includes(senderID)) {
      data.joined.push(senderID);
      await setData(`giveaway/${ID}`, data);

      // unsend old message
      if (data.messageID) {
        try { await api.unsendMessage(data.messageID); } catch {}
      }

      // send updated message
      const msg = await buildMessage(api, data, senderID);
      const info = await api.sendMessage(msg, threadID);
      data.messageID = info.messageID;
      await setData(`giveaway/${ID}`, data);
    }
  }
};

// Run command
module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID } = event;

  if (!args[0]) return api.sendMessage("❌ Usage: /giveaway <prize> <time> | /giveaway resend <ID>", threadID);

  // Resend
  if (args[0].toLowerCase() === "resend") {
    const ID = args[1];
    if (!ID) return api.sendMessage("❌ Provide giveaway ID to resend.", threadID);

    const data = await getData(`giveaway/${ID}`);
    if (!data || data.status !== "open") return api.sendMessage("❌ Giveaway not found or ended.", threadID);

    if (data.messageID) {
      try { await api.unsendMessage(data.messageID); } catch {}
    }

    const msg = await buildMessage(api, data);
    const info = await api.sendMessage(msg, threadID);
    data.messageID = info.messageID;
    await setData(`giveaway/${ID}`, data);
    return;
  }

  // Create
  if (args.length < 2) return api.sendMessage("❌ Usage: /giveaway <prize> <time>", threadID);
  const timeStr = args[args.length - 1];
  const prize = args.slice(0, -1).join(" ");
  const duration = parseDuration(timeStr);
  if (!duration) return api.sendMessage("❌ Invalid time. Use m/h/d (e.g., 2m, 1h).", threadID);

  const ID = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit ID
  const end = Date.now() + duration;

  const data = {
    ID,
    prize,
    author: senderID,
    joined: [],
    status: "open",
    end,
    threadID,
    messageID: null
  };

  await setData(`giveaway/${ID}`, data);
  global.giveaways[ID] = data;

  const msg = await buildMessage(api, data);
  const info = await api.sendMessage(msg, threadID);
  data.messageID = info.messageID;
  await setData(`giveaway/${ID}`, data);

  startCountdown(api, data);
};

// Recover giveaways on restart
setTimeout(async () => {
  if (!global.api) return;
  const all = await getData("giveaway");
  if (!all) return;

  for (const ID in all) {
    const data = all[ID];
    if (data.status === "open") {
      global.giveaways[ID] = data;
      startCountdown(global.api, data);
    }
  }
}, 5000);
