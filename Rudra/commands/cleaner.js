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
  if (poll.ended) return; // avoid double end
  poll.ended = true;

  // get group info for admin check
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);

  // kick inactive
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

  // unsend old poll posts
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
  version: "2.0.0",
  hasPermssion: 1,
  credits: "ChatGPT",
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
    if (cleaners[threadID]) return api.sendMessage("⚠️ May active poll pa sa GC na ito.", threadID, messageID);

    const timeStr = args[0];
    const match = timeStr.match(/^(\d+)([mhd])$/i);
    if (!match) return api.sendMessage("❌ Invalid format. Example: /cleaner 5m | 2h | 1d", threadID, messageID);

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
      `📊 Active Poll Started!\n⏳ Ends in ${num}${unit}\n\n📝 Reply with "active" to stay.\n⚠️ Inactive will be kicked!`,
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

  // list voters
  if (sub === "list") {
    const poll = cleaners[threadID];
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    return api.sendMessage(
      `📋 Active Voters (${poll.activeUsers.length}):\n${poll.activeUsers.join(", ") || "None"}`,
      threadID
    );
  }

  // resend poll
  if (sub === "resend") {
    const poll = cleaners[threadID];
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    const remaining = poll.end - Date.now();
    if (remaining <= 0) return api.sendMessage("⚠️ Poll already ended.", threadID);

    api.sendMessage(
      `📊 Active Poll (Resent)\n⏳ Time left: ${Math.floor(remaining / 1000)}s\n\n📝 Reply with "active" to stay.`,
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

    return api.sendMessage("❌ Poll has been cancelled.", threadID);
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

    api.sendMessage(
      `✅ Marked Active! (${poll.activeUsers.length}/${poll.totalUsers.length})`,
      threadID,
      (err, info) => {
        if (!err) {
          poll.postIDs.push(info.messageID);
          saveCleaners(cleaners);
        }
      }
    );
    saveCleaners(cleaners);
  }
};
