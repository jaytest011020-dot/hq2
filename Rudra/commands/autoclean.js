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
  if (!ms || ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

module.exports.config = {
  name: "autoclean",
  version: "1.6.1",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto clean inactive users using poll + reply",
  commandCategory: "system",
  usages: "/autoclean 1m|1h|1d | cancel | resend | list",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args || args.length === 0) {
    return api.sendMessage("❌ Usage: /autoclean 1m|1h|1d | cancel | resend | list", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let pollData = await getData(`/autoclean/${threadID}`);

  // CANCEL
  if (sub === "cancel") {
    if (pollData?.pollMsgID) {
      try { await api.unsendMessage(pollData.pollMsgID); } catch {}
    }
    await setData(`/autoclean/${threadID}`, null);
    return api.sendMessage("🛑 AutoClean canceled.", threadID, messageID);
  }

  // RESEND
  if (sub === "resend") {
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);
    if (pollData.pollMsgID) {
      try { await api.unsendMessage(pollData.pollMsgID); } catch {}
    }

    const remaining = (pollData.endTime || Date.now()) - Date.now();
    const sent = await api.sendMessage(
      `╭[AUTO CLEAN ONGOING]╮

┃ 👥 Active: ${Array.isArray(pollData.activeUsers) ? pollData.activeUsers.length : 0} / ${(pollData.totalUsers || []).length}
┃ ⏳ Time left: ${formatTime(remaining)}
┃
┃ 🔔 Reply "active" para hindi makick.
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );

    pollData.pollMsgID = sent.messageID;
    await setData(`/autoclean/${threadID}`, pollData);
    return;
  }

  // LIST (improved, safe)
  if (sub === "list") {
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);

    try {
      const infoThread = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();
      const ownerID = "61559999326713"; // permanent UID mo (palitan kung needed)
      const adminIDs = Array.isArray(infoThread.adminIDs) ? infoThread.adminIDs.map(a => a.id) : [];

      const active = Array.isArray(pollData.activeUsers) ? pollData.activeUsers : [];
      const totalUsers = Array.isArray(pollData.totalUsers) ? pollData.totalUsers : [];

      const exempted = [...new Set([botID, ownerID, ...adminIDs])]; // unique exempted
      const inactive = totalUsers.filter(uid => !active.includes(uid) && !exempted.includes(uid));

      // gather all UIDs we want names for, unique
      const allUIDs = [...new Set([...active, ...inactive, ...exempted])];

      // Try to get user info (names). If fails, fallback to unknown.
      let userInfo = {};
      if (allUIDs.length > 0) {
        try {
          // api.getUserInfo may accept array or single id depending on lib
          userInfo = await api.getUserInfo(allUIDs);
          // some libs may return array; normalize to object keyed by id if necessary
          if (Array.isArray(userInfo)) {
            const tmp = {};
            for (const u of userInfo) {
              if (u && u.id) tmp[u.id] = u;
            }
            userInfo = tmp;
          }
        } catch (err) {
          userInfo = {}; // fallback
        }
      }

      const fmt = (uids) => {
        if (!uids || uids.length === 0) return "None";
        return uids.map(uid => `• ${ (userInfo[uid] && (userInfo[uid].name || userInfo[uid].fullName)) || userInfo[uid]?.first_name || "Unknown" } (${uid})`).join("\n");
      };

      const remaining = pollData.endTime ? formatTime(pollData.endTime - Date.now()) : "N/A";

      return api.sendMessage(
        `📋 AutoClean List\n\n` +
        `✅ Active Users (${active.length}):\n${fmt(active)}\n\n` +
        `🚫 Inactive Users (${inactive.length}):\n${fmt(inactive)}\n` +
        `➡️ Preview: ${inactive.length} user(s) will be kicked if AutoClean finishes.\n\n` +
        `🛡 Exempted (${exempted.length}):\n${fmt(exempted)}\n\n` +
        `⏳ Time left: ${remaining}`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("autoclean list error:", err);
      return api.sendMessage("⚠️ Error loading usernames for list.", threadID, messageID);
    }
  }

  // START autoclean
  const duration = parseDuration(sub);
  if (!duration) {
    return api.sendMessage("❌ Invalid duration. Use 1m, 1h, or 1d.", threadID, messageID);
  }

  const members = (await api.getThreadInfo(threadID)).participantIDs || [];
  const endTime = Date.now() + duration;

  pollData = {
    endTime,
    activeUsers: [],
    totalUsers: members,
    pollMsgID: null
  };

  const sent = await api.sendMessage(
    `╭━[AUTO CLEAN STARTED]━╮
┃ 👥 Active: 0 / ${members.length}
┃ ⏳ Time left: ${formatTime(duration)}
┃
┃ 🔔 Reply "active" para hindi makick.
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );
  pollData.pollMsgID = sent.messageID;

  await setData(`/autoclean/${threadID}`, pollData);

  // schedule kick
  setTimeout(async () => {
    try {
      const finalData = await getData(`/autoclean/${threadID}`);
      if (!finalData) return;

      const info = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();
      const ownerID = "61559999326713"; // permanent UID mo
      const adminIDs = Array.isArray(info.adminIDs) ? info.adminIDs.map(a => a.id) : [];

      const participants = Array.isArray(info.participantIDs) ? info.participantIDs : [];

      const activeFinal = Array.isArray(finalData.activeUsers) ? finalData.activeUsers : [];

      const toKick = participants.filter(uid =>
        !activeFinal.includes(uid) &&
        uid !== botID &&
        uid !== ownerID &&
        !adminIDs.includes(uid)
      );

      for (const uid of toKick) {
        try { await api.removeUserFromGroup(uid, threadID); } catch (e) {
          console.error("Kick error:", e && e.message ? e.message : e);
        }
      }

      await setData(`/autoclean/${threadID}`, null);

      api.sendMessage(
        `╭[AUTO CLEAN FINISHED]╮
┃ 👥 Active: ${activeFinal.length} / ${finalData.totalUsers ? finalData.totalUsers.length : 0}
┃ 🚫 Kicked: ${toKick.length}
╰━━━━━━━━━━━━━━━╯`,
        threadID
      );
    } catch (e) {
      console.error("autoclean schedule error:", e);
    }
  }, duration);
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  let pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return;

  if (!Array.isArray(pollData.activeUsers)) {
    pollData.activeUsers = [];
  }

  if (body.trim().toLowerCase() === "active") {
    if (!pollData.activeUsers.includes(senderID)) {
      pollData.activeUsers.push(senderID);
      await setData(`/autoclean/${threadID}`, pollData);

      let name = "User";
      try {
        const info = await api.getUserInfo(senderID);
        // normalize possible return shapes
        if (info && info[senderID]) {
          name = info[senderID].name || name;
        } else if (Array.isArray(info) && info[0] && (info[0].name || info[0].fullName)) {
          name = info[0].name || info[0].fullName || name;
        } else if (info && (info.name || info.fullName)) {
          name = info.name || info.fullName || name;
        }

        // ✅ auto-update username sa database
        const userData = (await getData(`/users/${senderID}`)) || {};
        userData.name = name;
        await setData(`/users/${senderID}`, userData);

      } catch (err) {
        // ignore user info error
      }

      // delete old poll
      if (pollData.pollMsgID) {
        try { await api.unsendMessage(pollData.pollMsgID); } catch {}
      }

      // resend updated poll
      const remaining = pollData.endTime ? pollData.endTime - Date.now() : 0;
      const sent = await api.sendMessage(
        {
          body: `╭[AUTO CLEAN ONGOING]╮

┃ 👥 Active: ${pollData.activeUsers.length} / ${(pollData.totalUsers || []).length}
┃ ⏳ Time left: ${formatTime(remaining)}
┃
┃ 🔔 Reply "active" para hindi makick.
╰━━━━━━━━━━━━━━━╯

✅ Success: @${name}`,
          mentions: [{ tag: `@${name}`, id: senderID }]
        },
        threadID
      );

      pollData.pollMsgID = sent.messageID;
      await setData(`/autoclean/${threadID}`, pollData);
    } else {
      api.sendMessage("✅ Nakaregister ka na bilang active.", threadID, messageID);
    }
  }
};
