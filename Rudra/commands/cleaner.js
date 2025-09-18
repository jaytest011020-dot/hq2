const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.0.0",
  credits: "ChatGPT + NN",
  description: "Active user poll system with auto kick",
  usages: "/clean <time> (5d, 12h, 30m) | /cleaner resend | /cleaner list | /cleaner cancel",
  commandCategory: "system",
  cooldowns: 5,
};

function parseTime(input) {
  const match = input.match(/^(\d+)([dhm])$/i);
  if (!match) return null;
  let value = parseInt(match[1]);
  let unit = match[2].toLowerCase();
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    default: return null;
  }
}

function formatTimeLeft(ms) {
  if (ms <= 0) return "Expired";
  let d = Math.floor(ms / (24 * 60 * 60 * 1000));
  let h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  let m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${d}d ${h}h ${m}m`;
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
    `✅ ${count}/${total} users marked as active\n\n` +
    `📌 Reply with "active" to confirm your activity.\n\n` +
    `⚠️ Users who don't reply will be kicked automatically at deadline!`;

  let sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

// 📌 End poll and kick inactives
async function endPoll(api, threadID) {
  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  let inactive = poll.members.filter(
    (id) => !poll.voters.includes(id) && !poll.admins.includes(id) && id !== api.getCurrentUserID()
  );

  await api.sendMessage(
    `🧹 Poll ended!\n` +
    `✅ ${poll.voters.length}/${poll.members.length} are active.\n` +
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
    let ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m", threadID, messageID);

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;
    let admins = info.adminIDs.map(a => a.id);

    let poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      admins,
    };

    await setData(`cleaner/${threadID}`, poll);
    await sendPoll(api, threadID);

    // Auto end
    setTimeout(() => endPoll(api, threadID), ms);
    return;
  }

  // Resend poll
  if (args[0] === "resend") {
    return sendPoll(api, threadID);
  }

  // List voters
  if (args[0] === "list") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll.", threadID, messageID);

    let names = [];
    let infos = await api.getUserInfo(poll.voters);
    for (let uid of poll.voters) {
      names.push(infos[uid]?.name || uid);
    }

    return api.sendMessage(
      `✅ Active Users (${poll.voters.length}):\n` + names.join("\n"),
      threadID,
      messageID
    );
  }

  // Cancel poll
  if (args[0] === "cancel") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll to cancel.", threadID, messageID);

    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("❌ Poll has been cancelled.", threadID, messageID);
  }
};

// 📌 Handle votes
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  let text = body?.toLowerCase().trim();
  if (text === "active") {
    // Allow reply OR normal chat
    if (!poll.voters.includes(senderID)) {
      poll.voters.push(senderID);
      await setData(`cleaner/${threadID}`, poll);

      await api.sendMessage("✅ Marked you as active!", threadID, event.messageID);
      return sendPoll(api, threadID);
    }
  }
};
