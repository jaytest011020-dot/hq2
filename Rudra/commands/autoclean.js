const { setData, getData } = require("../../database.js");

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

function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

module.exports.config = {
  name: "autoclean",
  version: "1.0.0",
  hasPermission: 1,
  credits: "ChatGPT",
  description: "Auto clean inactive users using poll + reply",
  commandCategory: "system",
  usages: "/autoclean 1m|1h|1d | cancel | resend | list",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length === 0) {
    return api.sendMessage("❌ Usage: /autoclean 1m|1h|1d | cancel | resend | list", threadID, messageID);
  }

  const sub = args[0].toLowerCase();

  if (sub === "cancel") {
    await setData(`/autoclean/${threadID}`, null);
    return api.sendMessage("🛑 AutoClean canceled.", threadID, messageID);
  }

  if (sub === "resend") {
    const pollData = await getData(`/autoclean/${threadID}`);
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);

    const remaining = pollData.endTime - Date.now();
    const message = {
      body: `🧹 AUTO CLEAN ONGOING\n✅ Active: ${pollData.activeUsers?.length || 0}\n⏳ Time left: ${formatTime(remaining)}\n\nReply "active" para hindi makick.`,
    };
    const sent = await api.sendMessage(message, threadID);
    pollData.pollMsgID = sent.messageID;
    await setData(`/autoclean/${threadID}`, pollData);
    return;
  }

  if (sub === "list") {
    const pollData = await getData(`/autoclean/${threadID}`);
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);

    return api.sendMessage(
      `📋 Active Users:\n${pollData.activeUsers.map(uid => `• ${uid}`).join("\n") || "Wala pa."}`,
      threadID,
      messageID
    );
  }

  // start autoclean
  const duration = parseDuration(sub);
  if (!duration) {
    return api.sendMessage("❌ Invalid duration. Use 1m, 1h, or 1d.", threadID, messageID);
  }

  const endTime = Date.now() + duration;
  const pollData = {
    endTime,
    activeUsers: [],
    pollMsgID: null
  };

  const message = {
    body: `🧹 AUTO CLEAN STARTED\n✅ Active: 0\n⏳ Time left: ${formatTime(duration)}\n\nReply "active" para hindi makick.`,
  };

  const sent = await api.sendMessage(message, threadID);
  pollData.pollMsgID = sent.messageID;

  await setData(`/autoclean/${threadID}`, pollData);

  // schedule kick
  setTimeout(async () => {
    const finalData = await getData(`/autoclean/${threadID}`);
    if (!finalData) return;

    api.getThreadInfo(threadID, async (err, info) => {
      if (err) return;
      const toKick = info.participantIDs.filter(
        uid => !finalData.activeUsers.includes(uid) && uid !== api.getCurrentUserID() && !info.adminIDs.includes(uid)
      );

      for (const uid of toKick) {
        try {
          await api.removeUserFromGroup(uid, threadID);
        } catch (e) {
          console.error("Kick error:", e.message);
        }
      }

      await setData(`/autoclean/${threadID}`, null);
      api.sendMessage(`✅ AutoClean finished. Kicked ${toKick.length} inactive users.`, threadID);
    });
  }, duration);
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  const pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return;

  if (!Array.isArray(pollData.activeUsers)) {
    pollData.activeUsers = [];
  }

  if (body.toLowerCase().includes("active")) {
    if (!pollData.activeUsers.includes(senderID)) {
      pollData.activeUsers.push(senderID);
      await setData(`/autoclean/${threadID}`, pollData);

      // delete old poll
      if (pollData.pollMsgID) {
        try {
          await api.unsendMessage(pollData.pollMsgID);
        } catch (err) {
          console.error("Unsend error:", err.message);
        }
      }

      // resend updated poll
      const remaining = pollData.endTime - Date.now();
      const message = {
        body: `🧹 AUTO CLEAN ONGOING\n✅ Active: ${pollData.activeUsers.length}\n⏳ Time left: ${formatTime(remaining)}\n\nReply "active" para hindi makick.`,
      };

      const sent = await api.sendMessage(message, threadID);
      pollData.pollMsgID = sent.messageID;
      await setData(`/autoclean/${threadID}`, pollData);
    } else {
      api.sendMessage("✅ Naka-register ka na.", threadID, messageID);
    }
  }
};
