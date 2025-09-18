const { setData, getData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.0.0",
  credits: "ChatGPT + NN",
  description: "Active user voting system with auto-kick on deadline",
  usages: "/clean <time> (e.g. 5d, 12h, 30m) | /cleaner resend | /cleaner list | /cleaner cancel",
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
  const poll = await getData(`cleaner/${threadID}`);
  if (!poll || poll.ended) return;

  const voters = poll.voters || [];
  const total = poll.members.length;
  const count = voters.length;

  const timeLeft = poll.end - Date.now();
  const countdown = formatTimeLeft(timeLeft);

  const msg =
    `🧹 Active User Poll 🧹\n\n` +
    `⏳ Ends in: ${countdown}\n` +
    `📅 End Date: ${new Date(poll.end).toLocaleString()}\n\n` +
    `✅ ${count}/${total} users have replied "active"\n\n` +
    `👉 Reply with "active" in this chat to mark yourself as active.\n\n` +
    `🚪 Users who don’t reply before the deadline will be kicked automatically.`;

  const sent = await api.sendMessage(msg, threadID);
  poll.messageID = sent.messageID;
  await setData(`cleaner/${threadID}`, poll);
}

async function endPoll(api, threadID, poll) {
  if (poll.ended) return; // already ended

  const inactive = poll.members.filter(
    (id) => !poll.voters.includes(id) && !poll.admins.includes(id) && id !== poll.botID
  );

  let report = "🧹 Poll ended!\n";
  report += `✅ ${poll.voters.length}/${poll.members.length} marked active.\n`;

  if (inactive.length > 0) {
    report += `\n🚪 Kicking ${inactive.length} inactive users:\n`;
    for (let uid of inactive) {
      report += `• ${uid}\n`;
    }
  } else {
    report += `\n🎉 All users are active!`;
  }

  await api.sendMessage(report, threadID);

  // Kick inactive
  for (let uid of inactive) {
    try {
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.log(`❌ Failed to kick ${uid}:`, e);
    }
  }

  poll.ended = true;
  await deleteData(`cleaner/${threadID}`);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Start new poll
  if (args[0] && args[0].match(/^\d+[dhm]$/i)) {
    const existing = await getData(`cleaner/${threadID}`);
    if (existing && !existing.ended) {
      return api.sendMessage("⚠️ There is already an active poll in this group.", threadID, messageID);
    }

    const ms = parseTime(args[0]);
    if (!ms) return api.sendMessage("❌ Invalid time format. Use 5d, 12h, 30m", threadID, messageID);

    const info = await api.getThreadInfo(threadID);
    const members = info.participantIDs;
    const admins = info.adminIDs.map(a => a.id);
    const botID = api.getCurrentUserID();

    const poll = {
      start: Date.now(),
      end: Date.now() + ms,
      voters: [],
      members,
      admins,
      botID,
      ended: false,
    };

    await setData(`cleaner/${threadID}`, poll);
    return sendPoll(api, threadID);
  }

  // Resend poll
  if (args[0] === "resend") {
    return sendPoll(api, threadID);
  }

  // List voters
  if (args[0] === "list") {
    const poll = await getData(`cleaner/${threadID}`);
    if (!poll || poll.ended) {
      return api.sendMessage("❌ No active poll in this group.", threadID, messageID);
    }

    const voters = poll.voters;
    let msg = `📋 Active users so far (${voters.length}):\n`;
    for (let uid of voters) {
      msg += `• ${uid}\n`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  // Cancel poll
  if (args[0] === "cancel") {
    const poll = await getData(`cleaner/${threadID}`);
    if (!poll || poll.ended) {
      return api.sendMessage("❌ No active poll to cancel.", threadID, messageID);
    }

    await deleteData(`cleaner/${threadID}`);
    return api.sendMessage("🛑 Poll has been cancelled.", threadID, messageID);
  }

  return api.sendMessage("📌 Usage:\n/clean <time>\n/cleaner resend\n/cleaner list\n/cleaner cancel", threadID, messageID);
};

// Handle replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!body) return;

  const poll = await getData(`cleaner/${threadID}`);
  if (!poll || poll.ended) return;

  if (body.toLowerCase().trim() === "active") {
    if (!poll.voters.includes(senderID)) {
      poll.voters.push(senderID);
      await setData(`cleaner/${threadID}`, poll);
      return sendPoll(api, threadID); // update poll message
    }
  }

  // Auto-end if expired
  if (Date.now() >= poll.end) {
    return endPoll(api, threadID, poll);
  }
};

// Auto-check every 1 minute
setInterval(async () => {
  try {
    const allPolls = await getData("cleaner"); // kung naka-tree structure, adjust dito
    if (!allPolls) return;

    for (const threadID in allPolls) {
      const poll = allPolls[threadID];
      if (poll && !poll.ended && Date.now() >= poll.end) {
        // Need api here, skip if not available (runtime will inject api in handleEvent/run)
        // This interval can trigger endPoll if we expose api globally sa main bot
      }
    }
  } catch (e) {
    console.log("[Cleaner Check Error]", e);
  }
}, 60 * 1000);
