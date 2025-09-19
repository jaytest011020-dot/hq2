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

// ✅ Wrapper para siguradong may pangalan
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
    return `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

async function formatList(uids, api) {
  if (!uids || uids.length === 0) return "Wala";
  let lines = [];
  for (const uid of uids) {
    const name = await getUserName(uid, api);
    lines.push(`• ${name} (${uid})`);
  }
  return lines.join("\n");
}

module.exports.config = {
  name: "autoclean",
  version: "2.1.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto clean inactive users using poll + reply",
  commandCategory: "system",
  usages: "/autoclean 1m|1h|1d | cancel | resend | list",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const ownerID = "61559999326713"; // palitan ng permanent UID mo
  const botID = api.getCurrentUserID();

  // ✅ Only allow owner + admins
  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);
  if (senderID !== ownerID && !isAdmin) {
    return api.sendMessage("❌ Only group admins and the bot owner can use this command.", threadID, messageID);
  }

  if (args.length === 0) {
    return api.sendMessage("❌ Usage: /autoclean 1m|1h|1d | cancel | resend | list", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let pollData = await getData(`/autoclean/${threadID}`);

  if (sub === "cancel") {
    if (pollData?.pollMsgID) {
      try { await api.unsendMessage(pollData.pollMsgID); } catch {}
    }
    await setData(`/autoclean/${threadID}`, null);
    return api.sendMessage("🛑 AutoClean canceled.", threadID, messageID);
  }

  if (sub === "resend") {
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);

    if (pollData.pollMsgID) {
      try { await api.unsendMessage(pollData.pollMsgID); } catch {}
    }

    const remaining = pollData.endTime - Date.now();
    const sent = await api.sendMessage(
      `╭[AUTO CLEAN ONGOING]╮

┃ 👥 Active: ${pollData.activeUsers?.length || 0} / ${pollData.totalUsers?.length || 0}
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

  if (sub === "list") {
    if (!pollData) return api.sendMessage("⚠️ No active autoclean.", threadID, messageID);

    const active = pollData.activeUsers || [];
    const allUsers = pollData.totalUsers || [];
    const exempted = info.adminIDs.map(a => a.id).concat([botID, ownerID]);
    const inactive = allUsers.filter(uid => !active.includes(uid) && !exempted.includes(uid));

    const activeList = await formatList(active, api);
    const inactiveList = await formatList(inactive, api);
    const exemptedList = await formatList(exempted, api);

    const remaining = pollData.endTime - Date.now();
    return api.sendMessage(
      `📋 AUTO CLEAN STATUS

✅ Active:
${activeList}

🚫 Inactive (pwedeng makick):
${inactiveList}

🛡 Exempted:
${exemptedList}

⏳ Time left: ${formatTime(remaining)}`,
      threadID,
      messageID
    );
  }

  // start autoclean
  const duration = parseDuration(sub);
  if (!duration) {
    return api.sendMessage("❌ Invalid duration. Use 1m, 1h, or 1d.", threadID, messageID);
  }

  const members = info.participantIDs;
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
    const finalData = await getData(`/autoclean/${threadID}`);
    if (!finalData) return;

    api.getThreadInfo(threadID, async (err, info) => {
      if (err) return;

      const toKick = info.participantIDs.filter(uid =>
        !finalData.activeUsers.includes(uid) &&
        uid !== botID &&
        uid !== ownerID &&
        !info.adminIDs.some(a => a.id === uid)
      );

      for (const uid of toKick) {
        try { await api.removeUserFromGroup(uid, threadID); } catch (e) {
          console.error("Kick error:", e.message);
        }
      }

      await setData(`/autoclean/${threadID}`, null);

      api.sendMessage(
        `╭[AUTO CLEAN FINISHED]╮
┃ 👥 Active: ${finalData.activeUsers.length} / ${finalData.totalUsers.length}
┃ 🚫 Kicked: ${toKick.length}
╰━━━━━━━━━━━━━━━╯`,
        threadID
      );
    });
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

      let name = await getUserName(senderID, api);

      // ✅ auto-update username sa database
      const userData = await getData(`/users/${senderID}`) || {};
      userData.name = name;
      await setData(`/users/${senderID}`, userData);

      // delete old poll
      if (pollData.pollMsgID) {
        try { await api.unsendMessage(pollData.pollMsgID); } catch {}
      }

      // resend updated poll
      const remaining = pollData.endTime - Date.now();
      const sent = await api.sendMessage(
        {
          body: `╭[AUTO CLEAN ONGOING]╮

┃ 👥 Active: ${pollData.activeUsers.length} / ${pollData.totalUsers.length}
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
