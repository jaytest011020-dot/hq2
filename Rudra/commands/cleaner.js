const { getData, setData, deleteData } = require("../../database.js");

module.exports.config = {
  name: "cleaner",
  version: "2.5.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Poll to check active users, kicks inactive users on deadline",
  commandCategory: "system",
  usages: "/cleaner <time> | list | resend | cancel",
  cooldowns: 5
};

// format UI
function formatPollMessage(poll, totalUsers) {
  const remaining = poll.endTime - Date.now();
  const d = Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24)));
  const h = Math.max(0, Math.floor((remaining / (1000 * 60 * 60)) % 24));
  const m = Math.max(0, Math.floor((remaining / (1000 * 60)) % 60));
  const s = Math.max(0, Math.floor((remaining / 1000) % 60));

  return (
`📊 ┃ Active User Poll ┃ 📊
─────────────────────────────
⏳ Ends in: ${d}d ${h}h ${m}m ${s}s
📅 End Date: ${new Date(poll.endTime).toLocaleString()}
─────────────────────────────
✅ Reply "active" to this message to stay in the group.
⚠️ Inactive users will be auto-kicked on deadline.
─────────────────────────────
👥 Voters: ${poll.voters.length} / ${totalUsers}`
  );
}

// parse time input (e.g. 1d, 3h, 5m)
function parseTime(str) {
  const match = str.match(/(\d+)([dhm])/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === "d") return val * 24 * 60 * 60 * 1000;
  if (unit === "h") return val * 60 * 60 * 1000;
  if (unit === "m") return val * 60 * 1000;
  return null;
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  let poll = await getData(`cleaner.${threadID}`);
  const sub = args[0];

  // cancel
  if (sub === "cancel") {
    if (!poll) return api.sendMessage("⚠️ No active poll to cancel.", threadID, messageID);
    await deleteData(`cleaner.${threadID}`);
    return api.sendMessage("✅ Cleaner poll cancelled. You may start a new one.", threadID, messageID);
  }

  // list voters
  if (sub === "list") {
    if (!poll) return api.sendMessage("⚠️ No active poll in this group.", threadID, messageID);
    return api.sendMessage(
      `📋 Active Voters:\n${poll.voters.map(u => `- ${u}`).join("\n") || "❌ None yet"}`,
      threadID, messageID
    );
  }

  // resend
  if (sub === "resend") {
    if (!poll) return api.sendMessage("⚠️ No active poll to resend.", threadID, messageID);
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

  // start poll
  const ms = parseTime(sub);
  if (!ms) return api.sendMessage("❌ Invalid time. Example: /cleaner 1d | 3h | 5m", threadID, messageID);
  if (poll) return api.sendMessage("⚠️ A poll is already active. Cancel it first with /cleaner cancel.", threadID, messageID);

  const threadInfo = await api.getThreadInfo(threadID);
  const members = threadInfo.participantIDs;
  const admins = threadInfo.adminIDs.map(a => a.id);

  poll = {
    threadID,
    startTime: Date.now(),
    endTime: Date.now() + ms,
    members,
    admins,
    voters: [],
    botID: api.getCurrentUserID(),
    messageID: null,
    finished: false
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

// handle replies (for "active")
module.exports.handleEvent = async function({ api, event, Users }) {
  const { threadID, messageReply, senderID, body } = event;
  if (!body || !messageReply) return;

  let poll = await getData(`cleaner.${threadID}`);
  if (!poll || poll.finished) return;

  if (messageReply.messageID !== poll.messageID) return;
  if (body.toLowerCase() !== "active") return;

  if (!poll.voters.includes(senderID)) {
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
  }
};

// background auto checker
module.exports.handleSchedule = async function({ api }) {
  const polls = await getData("cleaner");
  if (!polls) return;

  for (const threadID in polls) {
    const poll = polls[threadID];
    if (poll.finished) continue;

    if (Date.now() >= poll.endTime) {
      poll.finished = true;
      await setData(`cleaner.${threadID}`, poll);

      const toKick = poll.members.filter(uid => 
        !poll.voters.includes(uid) &&
        !poll.admins.includes(uid) &&
        uid !== poll.botID
      );

      for (const uid of toKick) {
        try {
          await api.removeUserFromGroup(uid, threadID);
        } catch (e) {
          console.log("Kick failed:", uid, e);
        }
      }

      api.sendMessage(
        `⏰ Poll ended!\n✅ Active: ${poll.voters.length}\n❌ Kicked: ${toKick.length}`,
        threadID
      );
    }
  }
};
