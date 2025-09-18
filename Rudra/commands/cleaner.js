const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.0.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with flexible deadline",
  usages: "/cleaner <time> (e.g. 5d, 12h, 30m, 10) | /cleaner list | /cleaner resend | /cleaner cancel",
  commandCategory: "system",
  cooldowns: 5,
};

// Parse time like 5d / 10h / 30m / 10
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

// Send or resend poll
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
    `✅ ${count}/${total} users have replied "active"\n\n` +
    `Reply "active" to mark yourself as active!\n` +
    `⚠️ Inactive users will be auto-kicked when poll ends.`;

  let sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // start poll
  if (args[0] && args[0].match(/^\d+[dhm]?$/i)) {
    let ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m, or number for minutes", threadID, messageID);

    // check if already active
    let existing = await getData(`cleaner/${threadID}`);
    if (existing && !existing.ended) {
      return api.sendMessage("⚠️ There is already an active poll in this group. Cancel it first before creating a new one.", threadID, messageID);
    }

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;

    let poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      ended: false
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  // list voters
  if (args[0] === "list") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll in this group.", threadID, messageID);

    let voters = poll.voters || [];
    let msg = `✅ Active Users (${voters.length}):\n${voters.map(id => `• ${id}`).join("\n") || "None yet"}`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // resend poll
  if (args[0] === "resend") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll || poll.ended) return api.sendMessage("❌ No active poll to resend.", threadID, messageID);
    return sendPoll(api, threadID);
  }

  // cancel poll
  if (args[0] === "cancel") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll to cancel.", threadID, messageID);

    poll.ended = true;
    await setData(`cleaner/${threadID}`, poll);
    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("✅ Poll has been cancelled. You can now create a new one.", threadID, messageID);
  }

  return api.sendMessage("📌 Usage:\n/cleaner <time>\n/cleaner list\n/cleaner resend\n/cleaner cancel", threadID, messageID);
};

// Handle replies + auto-end check
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll || poll.ended) return;

  // reply "active"
  if (body && body.toLowerCase().trim() === "active") {
    if (!poll.voters.includes(senderID)) {
      poll.voters.push(senderID);
      await setData(`cleaner/${threadID}`, poll);
      return sendPoll(api, threadID); // auto resend with update
    }
  }

  // check if expired
  if (Date.now() >= poll.end && !poll.ended) {
    poll.ended = true;
    await setData(`cleaner/${threadID}`, poll);

    let inactive = poll.members.filter(id => !poll.voters.includes(id));
    await api.sendMessage(
      `🧹 Poll ended!\n` +
      `✅ ${poll.voters.length}/${poll.members.length} are active.\n` +
      `🚪 Kicking ${inactive.length} inactive users...`,
      threadID
    );

    for (let uid of inactive) {
      // don't kick self or admins
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
