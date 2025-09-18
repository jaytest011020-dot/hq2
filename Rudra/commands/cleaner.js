const { getData, setData, deleteData } = require("../../database.js");

// format poll UI
function formatPoll(poll) {
  const remaining = poll.end - Date.now();
  const m = Math.max(0, Math.floor((remaining / 1000 / 60) % 60));
  const h = Math.max(0, Math.floor((remaining / 1000 / 60 / 60) % 24));
  const d = Math.max(0, Math.floor(remaining / 1000 / 60 / 60 / 24));

  return (
`📊 ┃ Active User Poll ┃ 📊
─────────────────────────────
⏳ Ends in: ${d}d ${h}h ${m}m
📅 End: ${new Date(poll.end).toLocaleString()}
─────────────────────────────
✅ Reply "active" to this poll to stay in the group.
⚠️ Inactive users will be auto-kicked.
─────────────────────────────
👥 Active: ${poll.activeUsers.length} / ${poll.totalUsers.length}`
  );
}

// end poll logic
async function endPoll(api, threadID, poll) {
  if (poll.ended) return;
  poll.ended = true;

  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);

  const inactive = poll.totalUsers.filter(
    u => !poll.activeUsers.includes(u) &&
         u !== api.getCurrentUserID() &&
         !adminIDs.includes(u)
  );

  for (const uid of inactive) {
    try {
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.log("Kick failed:", uid, e.error || e);
    }
  }

  // unsend old poll posts
  if (poll.postIDs?.length) {
    for (const id of poll.postIDs) {
      api.unsendMessage(id, () => {});
    }
  }

  api.sendMessage(
    `✅ Poll Ended!\n👥 Active: ${poll.activeUsers.length}\n🚫 Kicked: ${inactive.length}`,
    threadID
  );

  await deleteData(`cleaner/${threadID}`);
}

module.exports.config = {
  name: "cleaner",
  version: "3.1.0",
  hasPermssion: 1,
  credits: "ChatGPT + NN",
  description: "Active user poll with auto kick on deadline (DB based)",
  commandCategory: "system",
  usages: "/cleaner <time> | list | resend | cancel",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = args[0]?.toLowerCase();

  let poll = await getData(`cleaner/${threadID}`);

  // start new poll
  if (sub && !["list", "resend", "cancel"].includes(sub)) {
    if (poll) return api.sendMessage("⚠️ May active poll pa.", threadID, messageID);

    const match = args[0].match(/^(\d+)([mhd])$/i);
    if (!match) return api.sendMessage("❌ Example: /cleaner 5m | 2h | 1d", threadID, messageID);

    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let duration = 0;
    if (unit === "m") duration = num * 60 * 1000;
    if (unit === "h") duration = num * 60 * 60 * 1000;
    if (unit === "d") duration = num * 24 * 60 * 60 * 1000;

    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs;

    poll = {
      start: Date.now(),
      end: Date.now() + duration,
      activeUsers: [],
      totalUsers: members,
      postIDs: [],
      ended: false,
    };

    api.sendMessage(
      formatPoll(poll),
      threadID,
      async (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          await setData(`cleaner/${threadID}`, poll);
        }
      }
    );

    // auto end schedule
    setTimeout(async () => {
      let p = await getData(`cleaner/${threadID}`);
      if (p && !p.ended) await endPoll(api, threadID, p);
    }, duration);

    return;
  }

  // list voters
  if (sub === "list") {
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    return api.sendMessage(
      `📋 Active Voters (${poll.activeUsers.length}):\n${poll.activeUsers.join(", ") || "None"}`,
      threadID
    );
  }

  // resend poll manually
  if (sub === "resend") {
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    api.sendMessage(
      formatPoll(poll),
      threadID,
      async (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          await setData(`cleaner/${threadID}`, poll);
        }
      }
    );
    return;
  }

  // cancel poll
  if (sub === "cancel") {
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    poll.ended = true;
    await deleteData(`cleaner/${threadID}`);

    return api.sendMessage("❌ Poll cancelled.", threadID);
  }
};

// handle replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body || !messageReply) return;

  let poll = await getData(`cleaner/${threadID}`);
  if (!poll || poll.ended) return;

  if (!poll.postIDs.includes(messageReply.messageID)) return;
  if (body.trim().toLowerCase() !== "active") return;

  if (!poll.activeUsers.includes(senderID)) {
    poll.activeUsers.push(senderID);

    // delete last poll
    if (poll.postIDs?.length) {
      const lastID = poll.postIDs[poll.postIDs.length - 1];
      api.unsendMessage(lastID, () => {});
    }

    // resend updated poll
    api.sendMessage(
      formatPoll(poll),
      threadID,
      async (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          await setData(`cleaner/${threadID}`, poll);
        }
      }
    );
  }
};
