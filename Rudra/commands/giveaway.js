const { setData, getData } = require("../../database.js");

// Parse duration like 1m, 2h, 1d
function parseDuration(str) {
  const match = str.match(/(\d+)([mhd])/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  if (unit === "m") return num * 60 * 1000;
  if (unit === "h") return num * 60 * 60 * 1000;
  if (unit === "d") return num * 24 * 60 * 60 * 1000;
  return null;
}

// Format time left
function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// Get username safely
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

// End giveaway and pick winner
async function endGiveaway(api, threadID, gid, force = false) {
  let data = await getData(`/giveaway/${threadID}`);
  if (!data || !data[gid]) return;

  const g = data[gid];
  if (!force && Date.now() < g.endTime) return;

  let winnerText = "⚠️ Walang sumali sa giveaway.";
  if (g.participants.length > 0) {
    const winner = g.participants[Math.floor(Math.random() * g.participants.length)];
    const winnerName = await getUserName(winner, api);
    winnerText = `🏆 Winner: ${winnerName}\n👤 UID: ${winner}`;
  }

  if (g.currentMsgID) {
    try { await api.unsendMessage(g.currentMsgID); } catch {}
  }

  api.sendMessage(
    `🎉 [GIVEAWAY ENDED] 🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${g.prize}
👑 Host: ${g.hostName}
👥 Participants: ${g.participants.length}
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

${winnerText}`,
    threadID
  );

  delete data[gid];
  await setData(`/giveaway/${threadID}`, data);
}

module.exports.config = {
  name: "giveaway",
  version: "4.1.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Giveaway system with join, resend, roll",
  commandCategory: "group",
  usages: "/giveaway <prize> <time> | resend <id> | roll <id>",
  cooldowns: 5
};

// Main command
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const ownerID = "your_owner_uid_here"; // palitan ng tunay mong UID
  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);

  if (senderID !== ownerID && !isAdmin) {
    return api.sendMessage("❌ Only admins or bot owner can use this command.", threadID, messageID);
  }

  if (!args[0]) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time> | resend <id> | roll <id>", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let data = await getData(`/giveaway/${threadID}`) || {};

  // RESEND
  if (sub === "resend") {
    const gid = args[1];
    if (!gid || !data[gid]) return api.sendMessage("⚠️ Invalid giveaway ID.", threadID, messageID);

    const g = data[gid];
    if (g.currentMsgID) {
      try { await api.unsendMessage(g.currentMsgID); } catch {}
    }

    const remaining = g.endTime - Date.now();
    const sent = await api.sendMessage(
      `🎉 [GIVEAWAY ONGOING] 🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${g.prize}
👑 Host: ${g.hostName}
⏳ Time left: ${formatTime(remaining)}
👥 Participants: ${g.participants.length}
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply to this message to join!`,
      threadID
    );

    g.currentMsgID = sent.messageID;
    data[gid] = g;
    await setData(`/giveaway/${threadID}`, data);
    return;
  }

  // ROLL
  if (sub === "roll") {
    const gid = args[1];
    if (!gid || !data[gid]) return api.sendMessage("⚠️ Invalid giveaway ID.", threadID, messageID);
    await endGiveaway(api, threadID, gid, true);
    return;
  }

  // START GIVEAWAY
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway Free Nitro 1h", threadID, messageID);
  }

  const timeArg = args[args.length - 1];
  const prize = args.slice(0, -1).join(" ");
  const duration = parseDuration(timeArg);
  if (!duration) return api.sendMessage("❌ Invalid time. Use 1m, 1h, or 1d.", threadID, messageID);

  const endTime = Date.now() + duration;
  const gid = "G" + Math.floor(1000 + Math.random() * 9000);
  const hostName = await getUserName(senderID, api);

  const giveaway = {
    prize,
    endTime,
    participants: [],
    hostID: senderID,
    hostName,
    currentMsgID: null
  };

  const sent = await api.sendMessage(
    `🎉 [GIVEAWAY STARTED] 🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${prize}
👑 Host: ${hostName}
⏳ Ends in: ${formatTime(duration)}
👥 Participants: 0
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply to this message to join!`,
    threadID
  );

  giveaway.currentMsgID = sent.messageID;
  data[gid] = giveaway;
  await setData(`/giveaway/${threadID}`, data);

  setTimeout(() => endGiveaway(api, threadID, gid), duration);
};

// Handle replies to join
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, messageReply } = event;

  // siguraduhin na may reply object
  if (!messageReply) return;

  let data = await getData(`/giveaway/${threadID}`);
  if (!data) return;

  for (const gid in data) {
    const g = data[gid];
    if (messageReply.messageID !== g.currentMsgID) continue;

    if (!g.participants.includes(senderID)) {
      g.participants.push(senderID);
      const name = await getUserName(senderID, api);

      if (g.currentMsgID) {
        try { await api.unsendMessage(g.currentMsgID); } catch {}
      }

      const remaining = g.endTime - Date.now();
      const sent = await api.sendMessage(
        `🎉 [GIVEAWAY ONGOING] 🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${g.prize}
👑 Host: ${g.hostName}
⏳ Time left: ${formatTime(remaining)}
👥 Participants: ${g.participants.length}
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply to this message to join!`,
        threadID
      );

      g.currentMsgID = sent.messageID;
      data[gid] = g;
      await setData(`/giveaway/${threadID}`, data);

      api.sendMessage(
        {
          body: `✅ Nakajoin ka na sa giveaway, ${name}! 🎉`,
          mentions: [{ tag: name, id: senderID }]
        },
        threadID
      );
    } else {
      api.sendMessage("⚠️ Nakajoin ka na dati dito!", threadID, messageReply.messageID);
    }
  }
};
