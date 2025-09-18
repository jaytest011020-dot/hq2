const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.5.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with reply-based detection",
  usages: "/cleaner <time> | /cleaner list | /cleaner resend | /cleaner cancel",
  commandCategory: "system",
  cooldowns: 5,
};

function parseTime(input) {
  const match = input.match(/^(\d+)([dhm]?)$/i);
  if (!match) return null;

  let value = parseInt(match[1]);
  let unit = match[2]?.toLowerCase();

  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    default: return value * 60 * 1000; // default minutes
  }
}

function formatTimeLeft(ms) {
  if (ms <= 0) return "Expired";
  let days = Math.floor(ms / (24 * 60 * 60 * 1000));
  let hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  let minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

async function sendPoll(api, threadID) {
  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  let voters = poll.voters || [];
  let total = poll.members.length;
  let count = voters.length;

  let timeLeft = poll.end - Date.now();
  let countdown = formatTimeLeft(timeLeft);

  let msg =
    `🧹 Active User Poll 🧹\n\n` +
    `⏳ Ends in: ${countdown}\n` +
    `📅 End Date: ${new Date(poll.end).toLocaleString()}\n\n` +
    `✅ ${count}/${total} users marked themselves active\n\n` +
    `Reply "active" to THIS message to stay in the group.\n` +
    `⚠️ Inactive users will be auto-kicked on deadline.`;

  return api.sendMessage(msg, threadID, async (err, info) => {
    if (!err) {
      poll.messageID = info.messageID;
      await setData(`cleaner/${threadID}`, poll);
    }
  });
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args[0] && args[0].match(/^\d+[dhm]?$/i)) {
    let ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m, or number for minutes", threadID, messageID);

    let existing = await getData(`cleaner/${threadID}`);
    if (existing && !existing.ended) {
      return api.sendMessage("⚠️ There is already an active poll here. Cancel it first.", threadID, messageID);
    }

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;

    let poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      ended: false,
      messageID: null
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  if (args[0] === "list") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll.", threadID, messageID);
    let voters = poll.voters || [];
    let msg = `✅ Active Users (${voters.length}):\n${voters.map(id => `• ${id}`).join("\n") || "None yet"}`;
    return api.sendMessage(msg, threadID, messageID);
  }

  if (args[0] === "resend") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll || poll.ended) return api.sendMessage("❌ No active poll to resend.", threadID, messageID);
    return sendPoll(api, threadID);
  }

  if (args[0] === "cancel") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll to cancel.", threadID, messageID);
    poll.ended = true;
    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("✅ Poll has been cancelled.", threadID, messageID);
  }
};

// REPLY HANDLER
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body) return;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll || poll.ended) return;

  // only if user replies to the poll message
  if (messageReply && poll.messageID && messageReply.messageID === poll.messageID) {
    if (body.toLowerCase().trim() === "active") {
      if (!poll.voters.includes(senderID)) {
        poll.voters.push(senderID);
        await setData(`cleaner/${threadID}`, poll);
        return sendPoll(api, threadID); // resend with update
      }
    }
  }

  // deadline check
  if (Date.now() >= poll.end && !poll.ended) {
    poll.ended = true;
    await setData(`cleaner/${threadID}`, poll);

    let inactive = poll.members.filter(id => !poll.voters.includes(id));
    await api.sendMessage(
      `🧹 Poll ended!\n✅ ${poll.voters.length}/${poll.members.length} active.\n🚪 Kicking ${inactive.length} inactive users...`,
      threadID
    );

    for (let uid of inactive) {
      if (uid === api.getCurrentUserID()) continue;
      try {
        await api.removeUserFromGroup(uid, threadID);
      } catch (e) {
        console.log(`❌ Failed to kick ${uid}:`, e);
      }
    }

    await deleteData(`cleaner/${threadID}`);
  }
};
