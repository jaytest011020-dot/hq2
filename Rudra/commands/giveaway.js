const { setData, getData } = require("../../database.js");

// 🔹 Helper: Parse duration like 1m, 2h, 1d
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

// 🔹 Helper: Format remaining time
function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// 🔹 Helper: Get username with fallback
async function getUserName(uid, api, Users) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid] && info[uid].name) return info[uid].name;
  } catch {}
  try {
    if (Users) {
      const user = await Users.getInfo(uid);
      if (user?.name) return user.name;
    }
  } catch {}
  return `User(${uid})`;
}

// 🔹 End a giveaway and pick a winner
async function endGiveaway(api, threadID, gid, Users, force = false) {
  let data = await getData(`/giveaway/${threadID}`);
  if (!data || !data[gid]) return;

  const g = data[gid];
  if (!force && Date.now() < g.endTime) return;

  g.ended = true;
  let winnerText = "⚠️ Walang sumali sa giveaway.";

  if (g.participants.length > 0) {
    const winner = g.participants[Math.floor(Math.random() * g.participants.length)];
    const winnerName = await getUserName(winner, api, Users);
    winnerText = `🏆 Congratulations ${winnerName}! You won **${g.prize}**!`;
  }

  if (g.currentMsgID) {
    try { await api.unsendMessage(g.currentMsgID); } catch {}
  }

  await api.sendMessage(
    `🎉[GIVEAWAY ENDED]🎉
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

// 🔹 Command config
module.exports.config = {
  name: "giveaway",
  version: "5.1.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Giveaway system with join, resend, roll",
  commandCategory: "group",
  usages: "/giveaway <prize> <time> | resend <id> | roll <id>",
  cooldowns: 5
};

// 🔹 Command run
module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const ownerID = "your_owner_uid_here"; // palitan ng tunay na UID
  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);

  if (senderID !== ownerID && !isAdmin) {
    return api.sendMessage("❌ Only admins or bot owner can use this command.", threadID);
  }

  if (!args[0]) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time> | resend <id> | roll <id>", threadID);
  }

  const sub = args[0].toLowerCase();
  let data = await getData(`/giveaway/${threadID}`) || {};

  // 🔹 RESEND
  if (sub === "resend") {
    const gid = args[1];
    if (!gid || !data[gid]) return api.sendMessage("⚠️ Invalid giveaway ID.", threadID);

    const g = data[gid];
    if (g.currentMsgID) try { await api.unsendMessage(g.currentMsgID); } catch {}

    const remaining = g.endTime - Date.now();
    const sent = await api.sendMessage(
      `🎉[GIVEAWAY ONGOING]🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${g.prize}
👑 Host: ${g.hostName}
⏳ Time left: ${formatTime(remaining)}
👥 Participants: ${g.participants.length}
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply or type "join" to enter!`,
      threadID
    );

    g.currentMsgID = sent.messageID;
    data[gid] = g;
    await setData(`/giveaway/${threadID}`, data);
    return;
  }

  // 🔹 ROLL
  if (sub === "roll") {
    const gid = args[1];
    if (!gid || !data[gid]) return api.sendMessage("⚠️ Invalid giveaway ID.", threadID);
    await endGiveaway(api, threadID, gid, Users, true);
    return;
  }

  // 🔹 START GIVEAWAY
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway Free Nitro 1h", threadID);
  }

  const timeArg = args[args.length - 1];
  const prize = args.slice(0, -1).join(" ");
  const duration = parseDuration(timeArg);
  if (!duration) return api.sendMessage("❌ Invalid time. Use 1m, 1h, or 1d.", threadID);

  const endTime = Date.now() + duration;
  const gid = "G" + Math.floor(1000 + Math.random() * 9000);
  const hostName = await getUserName(senderID, api, Users);

  const giveaway = {
    prize,
    endTime,
    participants: [],
    hostID: senderID,
    hostName,
    currentMsgID: null,
    ended: false
  };

  const sent = await api.sendMessage(
    `🎉[GIVEAWAY STARTED]🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${prize}
👑 Host: ${hostName}
⏳ Ends in: ${formatTime(duration)}
👥 Participants: 0
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply or type "join" to enter!`,
    threadID
  );

  giveaway.currentMsgID = sent.messageID;
  data[gid] = giveaway;
  await setData(`/giveaway/${threadID}`, data);

  setTimeout(() => endGiveaway(api, threadID, gid, Users), duration);
};

// 🔹 Handle join events
module.exports.handleEvent = async function({ api, event, Users }) {
  const { threadID, senderID, body } = event;
  if (!body) return;

  if (body.trim().toLowerCase() !== "join") return;

  let data = await getData(`/giveaway/${threadID}`);
  if (!data) return;

  for (const gid in data) {
    const g = data[gid];
    if (g.ended) continue;

    if (!g.participants.includes(senderID)) {
      g.participants.push(senderID);
      const name = await getUserName(senderID, api, Users);

      // Unsends old message to avoid clutter
      if (g.currentMsgID) try { await api.unsendMessage(g.currentMsgID); } catch {}

      const remaining = g.endTime - Date.now();
      const sent = await api.sendMessage(
        `🎉[GIVEAWAY ONGOING]🎉
┏━━━━━━━━━━━━━━━┓
🏆 Prize: ${g.prize}
👑 Host: ${g.hostName}
⏳ Time left: ${formatTime(remaining)}
👥 Participants: ${g.participants.length}
🆔 ID: ${gid}
┗━━━━━━━━━━━━━━━┛

👉 Reply or type "join" to enter!`,
        threadID
      );

      g.currentMsgID = sent.messageID;
      await setData(`/giveaway/${threadID}`, data);

      api.sendMessage(
        { body: `✅ Nakajoin ka na sa giveaway, ${name}! 🎉`,
          mentions: [{ tag: name, id: senderID }] },
        threadID
      );
    } else {
      api.sendMessage("⚠️ Nakajoin ka na dati dito!", threadID);
    }
  }
};
