const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "3.2.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Poll system to auto-kick inactive members after set time",
  commandCategory: "group management",
  usages: "/cleaner <time> | /cleaner list | /cleaner resend | /cleaner cancel",
  cooldowns: 5,
};

// Format message
function formatPollMessage(poll, totalMembers) {
  return `🧹 Group Cleaner Poll 🧹
⏳ Time Limit: ${poll.timeText}
👥 Members: ${totalMembers}
✅ Active: ${poll.voters.length}
❌ Inactive (will be kicked): ${totalMembers - poll.voters.length}

📝 Reply with "active" to stay in group!`;
}

// Parse time string (e.g., "3m", "1h", "1d")
function parseTime(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  if (unit === "s") ms = val * 1000;
  if (unit === "m") ms = val * 60 * 1000;
  if (unit === "h") ms = val * 60 * 60 * 1000;
  if (unit === "d") ms = val * 24 * 60 * 60 * 1000;
  return ms;
}

// Main command
module.exports.run = async function ({ api, event, args, Threads }) {
  const { threadID, messageID } = event;
  const sub = args[0]?.toLowerCase();

  // cancel cleaner
  if (sub === "cancel") {
    let poll = await getData(`cleaner.${threadID}`);
    if (!poll) return api.sendMessage("⚠️ No active cleaner running.", threadID, messageID);

    await deleteData(`cleaner.${threadID}`);
    return api.sendMessage("🛑 Cleaner poll cancelled.", threadID, messageID);
  }

  // list active poll
  if (sub === "list") {
    let poll = await getData(`cleaner.${threadID}`);
    if (!poll) return api.sendMessage("⚠️ No active cleaner running.", threadID, messageID);
    return api.sendMessage(formatPollMessage(poll, poll.members.length), threadID, messageID);
  }

  // resend poll
  if (sub === "resend") {
    let poll = await getData(`cleaner.${threadID}`);
    if (!poll) return api.sendMessage("⚠️ No active cleaner running.", threadID, messageID);

    return api.sendMessage(
      formatPollMessage(poll, poll.members.length),
      threadID,
      (err, info) => {
        if (!err) {
          poll.messageID = info.messageID;
          setData(`cleaner.${threadID}`, poll);
        }
      }
    );
  }

  // start new cleaner
  if (!args[0]) {
    return api.sendMessage(
      "⚠️ Please provide a duration.\nExample: /cleaner 3m | 1h | 1d",
      threadID,
      messageID
    );
  }

  const duration = parseTime(args[0]);
  if (!duration) {
    return api.sendMessage(
      "⚠️ Invalid time format. Use `s` = seconds, `m` = minutes, `h` = hours, `d` = days.",
      threadID,
      messageID
    );
  }

  const threadInfo = await Threads.getInfo(threadID);
  const members = threadInfo.participantIDs;

  const poll = {
    threadID,
    endTime: Date.now() + duration,
    timeText: args[0],
    voters: [],
    members,
    messageID: null,
    finished: false,
  };

  api.sendMessage(
    formatPollMessage(poll, members.length),
    threadID,
    (err, info) => {
      if (!err) {
        poll.messageID = info.messageID;
        setData(`cleaner.${threadID}`, poll);
      }
    }
  );
};

// Auto-check for expired polls
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageReply, senderID, body } = event;

  // load poll
  let poll = await getData(`cleaner.${threadID}`);
  if (!poll || poll.finished) return;

  // check if expired
  if (Date.now() > poll.endTime) {
    poll.finished = true;
    await setData(`cleaner.${threadID}`, poll);

    const inactive = poll.members.filter(id => !poll.voters.includes(id));

    api.sendMessage(
      `⏰ Cleaner ended!\n✅ Active: ${poll.voters.length}\n❌ Inactive: ${inactive.length}`,
      threadID,
      async () => {
        for (const id of inactive) {
          try {
            await api.removeUserFromGroup(id, threadID);
          } catch {}
        }
      }
    );
    return;
  }

  // reply handling (only accept replies to poll post)
  if (!body || !messageReply) return;
  if (messageReply.messageID !== poll.messageID) return;

  if (body.trim().toLowerCase() !== "active") {
    return api.sendMessage(
      "⚠️ Please reply with 'active' (exact word) to confirm you're staying.",
      threadID,
      event.messageID
    );
  }

  if (poll.voters.includes(senderID)) {
    return api.sendMessage("✅ You're already marked as active.", threadID, event.messageID);
  }

  poll.voters.push(senderID);
  await setData(`cleaner.${threadID}`, poll);

  const name = await Users.getNameUser(senderID);
  api.sendMessage(
    `✅ ${name} is marked active! (${poll.voters.length}/${poll.members.length})`,
    threadID
  );

  // resend updated poll
  api.sendMessage(
    formatPollMessage(poll, poll.members.length),
    threadID,
    (err, info) => {
      if (!err) {
        poll.messageID = info.messageID;
        setData(`cleaner.${threadID}`, poll);
      }
    }
  );
};
