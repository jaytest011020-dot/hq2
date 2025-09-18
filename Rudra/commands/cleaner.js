const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "1.1.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with auto-kick after deadline",
  usages: "/clean <days> | /cleaner resend",
  commandCategory: "system",
  cooldowns: 5,
};

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
    `🧹 Active User Poll Started 🧹\n\n` +
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

  // 📌 Start a clean poll
  if (args[0] && !isNaN(args[0])) {
    let days = parseInt(args[0]);
    if (days <= 0) return api.sendMessage("❌ Invalid days.", threadID, messageID);

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;

    let poll = {
      start: Date.now(),
      end: Date.now() + days * 24 * 60 * 60 * 1000,
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

// 📌 Listen for /vote replies
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
