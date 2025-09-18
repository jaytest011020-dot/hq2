const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "1.6.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with reply-based voting and deadline",
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
    `👉 Reply "active" to this message to mark yourself as active!`;

  let sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID } = event;

  // 📌 Start poll
  if (args[0] && args[0].match(/^\d+[dhm]$/i)) {
    let ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m", threadID, messageID);

    let info = await api.getThreadInfo(threadID);
    let members = info.participantIDs;
    let admins = info.adminIDs.map(a => a.id);
    let botID = api.getCurrentUserID();

    let poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      admins,
      botID,
      messageID: null,
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  // 📌 Resend poll
  if (args[0] === "resend") {
    return sendPoll(api, threadID);
  }

  // 📌 Show list of voters
  if (args[0] === "list") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll found.", threadID, messageID);

    if (poll.voters.length === 0) {
      return api.sendMessage("📋 No one has voted yet.", threadID, messageID);
    }

    let names = [];
    for (let uid of poll.voters) {
      try {
        let name = await Users.getNameUser(uid);
        names.push(`👤 ${name} (${uid})`);
      } catch {
        names.push(`👤 ${uid}`);
      }
    }

    return api.sendMessage(
      `📋 Voted Users (${poll.voters.length}):\n\n${names.join("\n")}`,
      threadID,
      messageID
    );
  }

  // 📌 Cancel poll
  if (args[0] === "cancel") {
    let poll = await getData(`cleaner/${threadID}`);
    if (!poll) return api.sendMessage("❌ No active poll found.", threadID, messageID);

    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("🛑 The active user poll has been cancelled.", threadID, messageID);
  }
};

// 📌 Handle replies + auto-end
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, messageReply, body } = event;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll) return;

  // ✅ Count only replies to the poll message AND only if body === "active"
  if (messageReply && messageReply.messageID === poll.messageID) {
    if (body && body.trim().toLowerCase() === "active") {
      if (!poll.voters.includes(senderID)) {
        poll.voters.push(senderID);
        await setData(`cleaner/${threadID}`, poll);
        return sendPoll(api, threadID);
      }
    }
  }

  // 🕒 Auto-end if expired
  if (Date.now() >= poll.end) {
    let inactive = poll.members.filter(
      (id) => !poll.voters.includes(id) && !poll.admins.includes(id) && id !== poll.botID
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
};
