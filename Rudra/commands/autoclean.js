const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "autoclean",
  version: "2.0.0",
  hasPermission: 1,
  credits: "ChatGPT + Jaylord",
  description: "Kick inactive members after a set time using poll replies",
  commandCategory: "system",
  usages: "/autoclean 1m|1h|1d | cancel | resend | list",
  cooldowns: 5,
};

let activePolls = {}; // cache para mabilis, pero naka-sync sa Firebase

function parseDuration(input) {
  const match = input.match(/^(\d+)([mhd])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  let ms = 0;
  if (unit === "m") ms = value * 60 * 1000;
  if (unit === "h") ms = value * 60 * 60 * 1000;
  if (unit === "d") ms = value * 24 * 60 * 60 * 1000;
  return ms;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

async function postPoll(api, threadID, duration, authorID) {
  const now = Date.now();
  const endTime = now + duration;

  const pollData = {
    threadID,
    startTime: now,
    endTime,
    authorID,
    activeUsers: [],
    pollMsgID: null,
  };

  const message = {
    body: `🧹 AUTO CLEAN STARTED\n\nReply "active" sa message na ito para hindi ka makick.\n⏳ Deadline: ${new Date(endTime).toLocaleString()}`,
  };

  const sent = await api.sendMessage(message, threadID);
  pollData.pollMsgID = sent.messageID;

  await setData(`/autoclean/${threadID}`, pollData);
  activePolls[threadID] = pollData;

  // schedule auto-kick
  setTimeout(() => handleKick(api, threadID), duration);

  return pollData;
}

async function handleKick(api, threadID) {
  const pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return;

  const threadInfo = await api.getThreadInfo(threadID);
  const admins = threadInfo.adminIDs.map(a => a.id);
  const botID = api.getCurrentUserID();

  const toKick = threadInfo.participantIDs.filter(uid =>
    !pollData.activeUsers.includes(uid) &&
    !admins.includes(uid) &&
    uid !== botID
  );

  for (const uid of toKick) {
    try {
      await api.removeUserFromGroup(uid, threadID);
    } catch (err) {
      console.error("Kick error:", err);
    }
  }

  await api.sendMessage(
    `🧹 AUTO CLEAN FINISHED\nKicked ${toKick.length} inactive members.`,
    threadID
  );

  await setData(`/autoclean/${threadID}`, null);
  delete activePolls[threadID];
}

async function resendPoll(api, threadID) {
  const pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return api.sendMessage("❌ Walang active autoclean.", threadID);

  const remaining = pollData.endTime - Date.now();
  if (remaining <= 0) return api.sendMessage("⏳ Tapos na ang autoclean.", threadID);

  const message = {
    body: `🧹 AUTO CLEAN ONGOING\n✅ Active: ${pollData.activeUsers.length}\n⏳ Time left: ${formatTime(remaining)}\n\nReply "active" para hindi makick.`,
  };

  const sent = await api.sendMessage(message, threadID);
  pollData.pollMsgID = sent.messageID;
  await setData(`/autoclean/${threadID}`, pollData);
}

async function listStatus(api, threadID) {
  const pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return api.sendMessage("❌ Walang active autoclean.", threadID);

  const threadInfo = await api.getThreadInfo(threadID);
  const members = threadInfo.participantIDs;

  const active = pollData.activeUsers;
  const inactive = members.filter(uid => !active.includes(uid));

  await api.sendMessage(
    `🧹 AUTO CLEAN STATUS\n\n✅ Active: ${active.length}\n❌ Inactive: ${inactive.length}\n\nDeadline: ${new Date(pollData.endTime).toLocaleString()}`,
    threadID
  );
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID } = event;

  if (!args[0]) {
    return api.sendMessage("⚡ Usage: /autoclean 1m|1h|1d | cancel | resend | list", threadID);
  }

  const command = args[0].toLowerCase();

  if (command === "cancel") {
    await setData(`/autoclean/${threadID}`, null);
    delete activePolls[threadID];
    return api.sendMessage("🛑 Autoclean cancelled.", threadID);
  }

  if (command === "resend") {
    return resendPoll(api, threadID);
  }

  if (command === "list") {
    return listStatus(api, threadID);
  }

  // start autoclean
  const duration = parseDuration(command);
  if (!duration) return api.sendMessage("⚡ Invalid time. Use 1m, 1h, 1d.", threadID);

  return postPoll(api, threadID, duration, senderID);
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  const pollData = await getData(`/autoclean/${threadID}`);
  if (!pollData) return;

  if (body.toLowerCase().includes("active")) {
    if (!pollData.activeUsers.includes(senderID)) {
      pollData.activeUsers.push(senderID);
      await setData(`/autoclean/${threadID}`, pollData);

      // delete old poll
      if (pollData.pollMsgID) {
        try {
          await api.unsendMessage(pollData.pollMsgID);
        } catch {}
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
