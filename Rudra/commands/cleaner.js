const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "1.2.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with flexible deadline",
  usages: "/clean <time> (e.g. 5d, 12h, 30m) | /cleaner resend",
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
    `✅ ${count}/${total} users have voted\n\n` +
    `Reply "/vote" to mark yourself as active!`;

  let sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // 📌 Start poll
  if (args[0] && args[0].match(/^\d+[dhm]$/i)) {
    let ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m", threadID, messageID);

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;

    let poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  // 📌 Resend poll
  if (args[0] === "resend") {
    return sendPoll(api, threadID);
  }
};

// 📌 Handle votes + auto-end
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  // Only respond to "/vote"
  if (body && body.toLowerCase().trim() === "/vote") {
    if (!poll.voters.includes(senderID)) {
      poll.voters.push(senderID);
      await setData(`cleaner/${threadID}`, poll);
      return sendPoll(api, threadID);
    }
  }

  // Auto-end if expired
  if (Date.now() >= poll.end) {
    let inactive = poll.members.filter((id) => !poll.voters.includes(id));
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
};
