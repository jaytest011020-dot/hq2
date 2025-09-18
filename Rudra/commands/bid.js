const fs = require("fs");
const path = require("path");

const cleanerFile = path.join(__dirname, "cleaners.json");

// ensure db file exists
if (!fs.existsSync(cleanerFile)) fs.writeFileSync(cleanerFile, JSON.stringify({}, null, 2), "utf8");

// load/save helpers
function loadCleaners() {
  try {
    return JSON.parse(fs.readFileSync(cleanerFile, "utf8"));
  } catch {
    return {};
  }
}
function saveCleaners(data) {
  fs.writeFileSync(cleanerFile, JSON.stringify(data, null, 2), "utf8");
}

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

// schedule auto end
function scheduleEnd(api, threadID, poll) {
  const remaining = poll.end - Date.now();
  if (remaining <= 0) return endPoll(api, threadID, poll);

  poll.timeout = setTimeout(() => {
    endPoll(api, threadID, poll);
  }, remaining);
}

// end poll logic
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

  // unsend last poll messages
  if (poll.postIDs?.length) {
    poll.postIDs.forEach(id => {
      api.unsendMessage(id, () => {});
    });
  }

  api.sendMessage(
    `✅ Poll Ended!\n👥 Active: ${poll.activeUsers.length}\n🚫 Kicked: ${inactive.length}`,
    threadID
  );

  let cleaners = loadCleaners();
  delete cleaners[threadID];
  saveCleaners(cleaners);
}

module.exports.config = {
  name: "cleaner",
  version: "3.0.0",
  hasPermssion: 1,
  credits: "ChatGPT + Fix by NN",
  description: "Active user poll with auto kick on deadline",
  commandCategory: "system",
  usages: "/cleaner <time> | list | resend | cancel",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  let cleaners = loadCleaners();
  const sub = args[0]?.toLowerCase();

  // start new poll
  if (sub && !["list", "resend", "cancel"].includes(sub)) {
    if (cleaners[threadID]) return api.sendMessage("⚠️ May active poll pa.", threadID, messageID);

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

    const poll = {
      start: Date.now(),
      end: Date.now() + duration,
      activeUsers: [],
      totalUsers: members,
      postIDs: [],
      ended: false,
    };

    cleaners[threadID] = poll;
    saveCleaners(cleaners);

    api.sendMessage(
      formatPoll(poll),
      threadID,
      (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          saveCleaners(cleaners);
        }
      }
    );

    scheduleEnd(api, threadID, poll);
    return;
  }

  // resend poll manually
  if (sub === "resend") {
    const poll = cleaners[threadID];
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    api.sendMessage(
      formatPoll(poll),
      threadID,
      (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          saveCleaners(cleaners);
        }
      }
    );
    return;
  }

  // cancel poll
  if (sub === "cancel") {
    const poll = cleaners[threadID];
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    poll.ended = true;
    if (poll.timeout) clearTimeout(poll.timeout);
    delete cleaners[threadID];
    saveCleaners(cleaners);

    return api.sendMessage("❌ Poll cancelled.", threadID);
  }
};

// handle replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body || !messageReply) return;

  let cleaners = loadCleaners();
  const poll = cleaners[threadID];
  if (!poll || poll.ended) return;

  if (!poll.postIDs.includes(messageReply.messageID)) return;
  if (body.trim().toLowerCase() !== "active") return;

  if (!poll.activeUsers.includes(senderID)) {
    poll.activeUsers.push(senderID);

    // delete last poll message
    if (poll.postIDs?.length) {
      const lastID = poll.postIDs[poll.postIDs.length - 1];
      api.unsendMessage(lastID, () => {});
    }

    // resend updated poll
    api.sendMessage(
      formatPoll(poll),
      threadID,
      (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          saveCleaners(cleaners);
        }
      }
    );
  }
};
