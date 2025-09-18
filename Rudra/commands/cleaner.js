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
    api.unsendMessage(poll.postID, () => {});
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
  version: "2.1.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Active user poll with auto kick on deadline",
  commandCategory: "system",
  usages: "/cleaner <time> | list | resend | cancel",
  cooldowns: 5,
};

// format UI
function pollText(poll) {
  const remaining = poll.end - Date.now();
  const m = Math.floor((remaining / 60000) % 60);
  const h = Math.floor((remaining / 3600000) % 24);
  const d = Math.floor(remaining / 86400000);
  return `📊 Active Poll!\n⏳ Ends in: ${d}d ${h}h ${m}m\n\n📝 Reply "active" to stay.\n⚠️ Inactive will be kicked.\n\n👥 Active: ${poll.activeUsers.length}/${poll.totalUsers.length}`;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  let cleaners = loadCleaners();
  const sub = args[0]?.toLowerCase();

  // start new poll
  if (sub && !["list", "resend", "cancel"].includes(sub)) {
    if (cleaners[threadID]) return api.sendMessage("⚠️ May active poll pa sa GC na ito.", threadID, messageID);

    const match = sub.match(/^(\d+)([mhd])$/i);
    if (!match) return api.sendMessage("❌ Format: /cleaner 5m | 2h | 1d", threadID, messageID);

    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let duration = 0;
    if (unit === "m") duration = num * 60000;
    if (unit === "h") duration = num * 3600000;
    if (unit === "d") duration = num * 86400000;

    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs;

    const poll = {
      start: Date.now(),
      end: Date.now() + duration,
      activeUsers: [],
      totalUsers: members,
      postID: null,
      ended: false,
    };

    cleaners[threadID] = poll;
    saveCleaners(cleaners);

    api.sendMessage(pollText(poll), threadID, (err, info) => {
      if (!err) {
        poll.postID = info.messageID;
        saveCleaners(cleaners);
      }
    });

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

  // resend
  if (sub === "resend") {
    const poll = cleaners[threadID];
    if (!poll) return api.sendMessage("⚠️ Walang active poll.", threadID, messageID);

    const remaining = poll.end - Date.now();
    if (remaining <= 0) return api.sendMessage("⚠️ Poll already ended.", threadID);

    if (poll.postID) api.unsendMessage(poll.postID, () => {});
    api.sendMessage(pollText(poll), threadID, (err, info) => {
      if (!err) {
        poll.postID = info.messageID;
        saveCleaners(cleaners);
      }
    });
    return;
  }

  // cancel
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
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body || !messageReply) return;

  let cleaners = loadCleaners();
  const poll = cleaners[threadID];
  if (!poll || poll.ended) return;

  if (messageReply.messageID !== poll.postID) return;
  if (body.trim().toLowerCase() !== "active") return;

  if (!poll.activeUsers.includes(senderID)) {
    const name = await Users.getNameUser(senderID);
    poll.activeUsers.push(senderID);

    // delete old poll
    if (poll.postID) api.unsendMessage(poll.postID, () => {});

    // send updated poll
    api.sendMessage(
      `✅ ${name} marked active!\n\n${pollText(poll)}`,
      threadID,
      (err, info) => {
        if (!err) {
          poll.postID = info.messageID;
          saveCleaners(cleaners);
        }
      }
    );
    saveCleaners(cleaners);
  }
};
