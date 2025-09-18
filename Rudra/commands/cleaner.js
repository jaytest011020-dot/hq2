const { setData, getData, deleteData, getAllKeys } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.5.0",
  credits: "ChatGPT + NN",
  description: "Active user poll system with auto-kick",
  usages: "/cleaner <time> | /cleaner resend | /cleaner list | /cleaner cancel",
  commandCategory: "system",
  cooldowns: 5,
};

function parseTime(input) {
  const match = input.match(/^(\d+)([dhm])$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    default: return null;
  }
}

function formatTimeLeft(ms) {
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

async function sendPoll(api, threadID) {
  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  const voters = poll.voters || [];
  const total = poll.members.length;
  const count = voters.length;

  const timeLeft = poll.end - Date.now();
  const countdown = formatTimeLeft(timeLeft);

  const msg =
    `🧹 Active User Poll 🧹\n\n` +
    `⏳ Ends in: ${countdown}\n` +
    `📅 End Date: ${new Date(poll.end).toLocaleString()}\n\n` +
    `✅ ${count}/${total} users marked as active\n\n` +
    `📌 Reply with "active" to confirm your activity.\n\n` +
    `⚠️ Users who don't reply will be kicked automatically at deadline!`;

  const sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

async function endPoll(api, threadID, poll) {
  const inactive = poll.members.filter(
    (id) => !poll.voters.includes(id) && !poll.admins.includes(id) && id !== poll.botID
  );

  await api.sendMessage(
    `🧹 Poll ended!\n` +
    `✅ ${poll.voters.length}/${poll.members.length} marked active.\n` +
    `🚪 Kicking ${inactive.length} inactive users...`,
    threadID
  );

  for (let uid of inactive) {
    try {
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.log(`❌ Failed to kick ${uid}:`, e);
    }
  }

  await deleteData(`cleaner/${threadID}`);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Start poll
  if (args[0] && args[0].match(/^\d+[dhm]$/i)) {
    let existing = await getData(`cleaner/${threadID}`);
    if (existing && Date.now() < existing.end) {
      return api.sendMessage("⚠️ May naka-active na poll na. Gumamit ng /cleaner cancel muna.", threadID, messageID);
    }

    const ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m", threadID, messageID);

    const info = await api.getThreadInfo(threadID);
    const members = info.participantIDs;
    const admins = info.adminIDs.map(a => a.id);

    const poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      admins,
      botID: api.getCurrentUserID()
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  // Resend poll
  if (args[0] === "resend") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ Walang active poll.", threadID, messageID);
    return sendPoll(api, threadID);
  }

  // List voters
  if (args[0] === "list") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ Walang active poll.", threadID, messageID);

    if (poll.voters.length === 0) {
      return api.sendMessage("📋 Walang nag vote pa.", threadID, messageID);
    }

    return api.sendMessage(
      `📋 Active Users:\n${poll.voters.map(uid => `• ${uid}`).join("\n")}`,
      threadID,
      messageID
    );
  }

  // Cancel poll
  if (args[0] === "cancel") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ Walang active poll.", threadID, messageID);

    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("🛑 Poll cancelled.", threadID, messageID);
  }
};

// Handle user replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!body) return;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  // User reply "active"
  if (body.toLowerCase().trim() === "active") {
    if (!poll.voters.includes(senderID)) {
      poll.voters.push(senderID);
      await setData(`cleaner/${threadID}`, poll);
      return sendPoll(api, threadID);
    }
  }
};

// 🔄 Background auto-checker
setInterval(async () => {
  const keys = await getAllKeys();
  const polls = keys.filter(k => k.startsWith("cleaner/"));
  for (const key of polls) {
    const threadID = key.split("/")[1];
    const poll = await getData(key);
    if (poll && Date.now() >= poll.end) {
      // fake api object sa interval, ipapasa ng bot framework
      try {
        const api = global.api; 
        if (api) await endPoll(api, threadID, poll);
      } catch (e) {
        console.error("Auto-checker error:", e);
      }
    }
  }
}, 60 * 1000); // every 1 minute
