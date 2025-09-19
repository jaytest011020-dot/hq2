const { setData, getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    const name = await Users.getNameUser(uid);
    if (name) return name;
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "inviteEvent",
  eventType: ["log:subscribe"],
  version: "1.5.0",
  credits: "ChatGPT + NN",
};

module.exports.run = async function({ api, event, Users }) {
  try {
    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;
    if (!addedParticipants || addedParticipants.length === 0) return;

    // Use actorFbId as inviter if no explicit inviter
    const inviterID = logMessageData.actorFbId;

    if (!inviterID) return;

    let gcData = (await getData(`invite/${threadID}`)) || {};
    if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;
      if (newUserID === api.getCurrentUserID()) continue; // skip bot
      if (newUserID === inviterID) continue; // skip self-invite

      // increment inviter count
      gcData[inviterID].count += 1;
      await setData(`invite/${threadID}`, gcData);

      // get names
      const inviterName = await getUserName(inviterID, api, Users);
      const newUserName = await getUserName(newUserID, api, Users);

      // send styled notification
      const msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: ${inviterName}
┃ ➕ Invited: ${newUserName}
┃
┃ 📊 Total Invites: ${gcData[inviterID].count}
╰━━━━━━━━━━━━━━━━━━━━╯`;

      api.sendMessage(msg, threadID);
    }
  } catch (err) {
    console.error("❌ ERROR in inviteEvent module:", err);
  }
};
