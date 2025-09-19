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
  version: "1.5.1",
  credits: "ChatGPT + NN",
};

module.exports.run = async function({ api, event, Users }) {
  try {
    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;

    if (!addedParticipants || addedParticipants.length === 0) return;

    let gcData = (await getData(`invite/${threadID}`)) || {};

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;

      // Skip bot itself
      if (newUserID === api.getCurrentUserID()) continue;

      // Correct inviter detection
      const inviterID = newP.inviterID || logMessageData.actorFbId;
      if (!inviterID || inviterID === newUserID) continue;

      // Initialize inviter data
      if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };

      // Increment inviter count
      gcData[inviterID].count += 1;
      await setData(`invite/${threadID}`, gcData);

      // Get user names
      const inviterName = await getUserName(inviterID, api, Users);
      const newUserName = await getUserName(newUserID, api, Users);

      // Styled notification
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
