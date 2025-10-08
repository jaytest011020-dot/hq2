const { setData, getData } = require("../../database.js");

// Protected Admins that will NEVER be kicked
const PROTECTED_ADMINS = [
  "61559999326713", // Main Owner
  "61563731477181", // Secondary Admin
  "61554885397487", // Jandel Bot
];

// Helper to parse duration like "1m", "2h", "1d"
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

// Format milliseconds into human-readable time
function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// Safely get user name
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

// Kick inactive members + admins (except protected)
async function kickInactiveMembers(api, threadID) {
  const currentData = await getData(`/autoclean/${threadID}`);
  if (!currentData) return;

  const botID = api.getCurrentUserID();

  api.getThreadInfo(threadID, async (err, info) => {
    if (err || !info) return;

    const { adminIDs = [] } = info;
    const admins = adminIDs.map(a => a.id);

    const toKick = currentData.totalUsers.filter(uid =>
      !currentData.activeUsers.includes(uid) && // inactive
      uid !== botID && // not bot
      !PROTECTED_ADMINS.includes(uid) // not protected
    );

    for (const uid of toKick) {
      try {
        await api.removeUserFromGroup(uid, threadID);
      } catch (e) {}
    }

    await setData(`/autoclean/${threadID}`, null);

    api.sendMessage(
      `╭[AUTO CLEAN FINISHED]╮
┃ 👥 Active: ${currentData.activeUsers.length} / ${currentData.totalUsers.length}
┃ 🚫 Kicked: ${toKick.length}
┃ 🛡️ Protected: ${PROTECTED_ADMINS.length}
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );
  });
}

module.exports.config = {
  name: "autoclean",
  version: "6.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN + Jaylord La Peña",
  description: "Automatically kick inactive members and admins after timer expires (except protected)",
  commandCategory: "group",
  usages: "/autoclean 1m|1h|1d | cancel | list | startkick",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const botID = api.getCurrentUserID();

  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);
  if (!isAdmin && !PROTECTED_ADMINS.includes(senderID)) {
    return api.sendMessage("❌ Only admins or protected users can use this command.", threadID, messageID);
  }

  if (!args[0]) {
    return api.sendMessage("❌ Usage: /autoclean 1m|1h|1d | cancel | list | startkick", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let data = await getData(`/autoclean/${threadID}`);

  // Cancel autoclean
  if (sub === "cancel") {
    await setData(`/autoclean/${threadID}`, null);
    return api.sendMessage("🛑 AutoClean canceled.", threadID, messageID);
  }

  // Manual kick trigger
  if (sub === "startkick") {
    if (!data) return api.sendMessage("⚠️ No active AutoClean session found.", threadID, messageID);
    await kickInactiveMembers(api, threadID);
    return;
  }

  // Show list
  if (sub === "list") {
    if (!data) return api.sendMessage("⚠️ No active AutoClean session found.", threadID, messageID);

    const remaining = data.endTime - Date.now();
    return api.sendMessage(
      `📋 AUTO CLEAN STATUS
✅ Active: ${data.activeUsers.length}/${data.totalUsers.length}
🚫 Inactive: ${data.totalUsers.filter(u => !data.activeUsers.includes(u)).length}
⏳ Time left: ${formatTime(remaining)}`,
      threadID,
      messageID
    );
  }

  // Start new autoclean
  const duration = parseDuration(sub);
  if (!duration) return api.sendMessage("❌ Invalid time format. Use 1m, 1h, or 1d.", threadID, messageID);

  const endTime = Date.now() + duration;
  data = {
    totalUsers: info.participantIDs,
    activeUsers: [],
    endTime
  };

  await setData(`/autoclean/${threadID}`, data);

  api.sendMessage(
    `╭━[AUTO CLEAN STARTED]━╮
┃ 👥 Tracking ${data.totalUsers.length} members
┃ 🕒 Duration: ${formatTime(duration)}
┃ 🛡️ Protected: ${PROTECTED_ADMINS.length}
┃ 🔔 Sends or seen = marked active
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  // Timeout scheduler
  setTimeout(async () => {
    const saved = await getData(`/autoclean/${threadID}`);
    if (saved && saved.endTime <= Date.now()) {
      await kickInactiveMembers(api, threadID);
    }
  }, duration);
};

// Track active users
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, type } = event;
  if (type !== "message" && type !== "message_seen") return;

  let data = await getData(`/autoclean/${threadID}`);
  if (!data) return;

  if (!data.activeUsers.includes(senderID)) {
    data.activeUsers.push(senderID);
    await setData(`/autoclean/${threadID}`, data);
  }

  // If time already passed but data not cleared yet (bot restarted or timer missed)
  if (Date.now() >= data.endTime) {
    await kickInactiveMembers(api, threadID);
  }
};