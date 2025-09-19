const { getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    const name = await Users.getNameUser(uid);
    if (name) return name;
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || `FB-User(${uid})`;
  } catch (err) {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "invite",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + NN",
  description: "Check your invites or list all inviters",
  commandCategory: "fun",
  usages: "/invite | /invite list",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;
  const sub = args[0]?.toLowerCase();

  const dbPath = `invite/${threadID}`;
  const gcData = (await getData(dbPath)) || {};

  if (sub === "list") {
    const inviters = Object.keys(gcData);
    if (inviters.length === 0) return api.sendMessage("⚠️ Wala pang nag-invite sa thread na ito.", threadID, messageID);

    let msg = `📋 Invite List for this group:\n\n`;

    for (const uid of inviters) {
      const name = await getUserName(uid, api, Users);
      msg += `👤 ${name} — Invites: ${gcData[uid].count}\n`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // default: show own invites
  const userData = gcData[senderID];
  const userCount = userData ? userData.count : 0;

  const name = await getUserName(senderID, api, Users);
  const msg = `👤 ${name}\n📊 Your invites in this group: ${userCount}`;
  return api.sendMessage(msg, threadID, messageID);
};
