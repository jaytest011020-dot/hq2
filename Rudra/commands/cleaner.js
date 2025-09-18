const { getData, setData, updateData, deleteData } = require("../../database.js");

// Format poll UI
function pollText(poll) {
  const remaining = poll.end - Date.now();
  if (remaining <= 0) return `❌ Poll ended.`;

  const m = Math.floor((remaining / 60000) % 60);
  const h = Math.floor((remaining / 3600000) % 24);
  const d = Math.floor(remaining / 86400000);

  return (
`📊 ┃ Active User Poll ┃ 📊
─────────────────────────────
⏳ Ends in: ${d}d ${h}h ${m}m
📅 Deadline: ${new Date(poll.end).toLocaleString()}
─────────────────────────────
✅ Reply "active" to stay in the GC
⚠️ Non-active will be auto-kicked!
─────────────────────────────
👥 Active: ${poll.activeUsers.length}/${poll.totalUsers.length}`
  );
}

// Clean poll data bago save
function cleanPoll(poll) {
  return {
    start: poll.start,
    end: poll.end,
    activeUsers: poll.activeUsers,
    totalUsers: poll.totalUsers,
    postID: poll.postID,
    ended: poll.ended
  };
}

// End poll + kick inactive
async function endPoll(api, threadID, poll) {
  if (poll.ended) return;
  poll.ended = true;

  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);

  const inactive = poll.totalUsers.filter(
    u => !poll.activeUsers.includes(u) && u !== api.getCurrentUserID() && !adminIDs.includes(u)
  );

  for (const uid of inactive) {
    try {
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.log("Kick failed:", uid, e.error || e);
    }
  }

  if (poll.postID) {
    try {
      await api.unsendMessage(poll.postID);
    } catch (e) {}
  }

  api.sendMessage(
    `✅ Poll Ended!\n👥 Active: ${poll.activeUsers.length}\n🚫 Kicked: ${inactive.length}`,
    threadID
  );

  await deleteData(`/cleaners/${threadID}`);
}

module.exports.config = {
  name: "cleaner",
  version: "4.3.0",
  hasPermssion: 1,
  credits: "ChatGPT + NN",
  description: "Active user poll with auto kick on deadline (DB)",
  commandCategory: "system",
  usages: "/cleaner <time> | list | resend | cancel",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = args[0]?.toLowerCase();

  let poll = await getData(`/cleaners/${threadID}`);

  // Fail-safe: delete if expired
  if (poll && poll.end <= Date.now()) {
    await deleteData(`/cleaners/${threadID}`);
    poll = null;
  }

  // start new poll
  if (sub && !["list", "resend", "cancel"].includes(sub)) {
    if (poll) return api.sendMessage("⚠️ May active poll pa sa GC na ito.", threadID, messageID);

    const match = sub.match(/^(\d+)([mhd])$/i);
    if (!match) return api.sendMessage("❌ Invalid format. Example: /cleaner 5m | 2h | 1d", threadID, messageID);

    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let duration = 0;
    if (unit === "m") duration = num * 60000;
    if (unit === "h") duration = num * 3600000;
    if (unit === "d") duration = num * 86400000;

    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs;

    poll = {
      start: Date.now(),
      end: Date.now() + duration,
      activeUsers: [],
      totalUsers: members,
      postID: null,
      ended: false,
    };

    api.sendMessage(pollText(poll), threadID, async (err, info) => {
      if (!err) {
        poll.postID = info.messageID;
        await setData(`/cleaners/${threadID}`, cleanPoll(poll));

        // auto-end timer
        setTimeout(() => endPoll(api, threadID, poll), duration);
      }
    });

    return;
  }

  // list
  if (sub === "list") {
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);
    return api.sendMessage(
      `📋 Active Voters (${poll.activeUsers.length}):\n${poll.activeUsers.join(", ") || "None"}`,
      threadID
    );
  }

  // resend
  if (sub === "resend") {
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);
    if (poll.postID) {
      try {
        await api.unsendMessage(poll.postID);
      } catch (e) {}
    }
    api.sendMessage(pollText(poll), threadID, async (err, info) => {
      if (!err) {
        poll.postID = info.messageID;
        await updateData(`/cleaners/${threadID}`, { postID: poll.postID });
      }
    });
    return;
  }

  // cancel
  if (sub === "cancel") {
    try {
      if (poll?.postID) {
        try {
          await api.unsendMessage(poll.postID);
        } catch (e) {}
      }
      await deleteData(`/cleaners/${threadID}`);
      return api.sendMessage("❌ Poll has been cancelled and removed from database.", threadID);
    } catch (err) {
      console.error("Cleaner cancel error:", err);
      return api.sendMessage("⚠️ Failed to cancel poll. Check database connection.", threadID);
    }
  }
};

// handle replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body || !messageReply) return;

  const poll = await getData(`/cleaners/${threadID}`);
  if (!poll || poll.ended) return;
  if (messageReply.messageID !== poll.postID) return;
  if (body.trim().toLowerCase() !== "active") return;

  if (!poll.activeUsers.includes(senderID)) {
    poll.activeUsers.push(senderID);

    if (poll.postID) {
      try {
        await api.unsendMessage(poll.postID);
      } catch (e) {}
    }
    api.sendMessage(pollText(poll), threadID, async (err, info) => {
      if (!err) {
        poll.postID = info.messageID;
        await setData(`/cleaners/${threadID}`, cleanPoll(poll));
      }
    });
  } else {
    api.sendMessage("✅ Nakaregister ka na bilang active.", threadID, messageReply.messageID);
  }
};
