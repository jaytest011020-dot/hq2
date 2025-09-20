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
  version: "1.7.0",
  credits: "ChatGPT + NN",
};

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;

    if (!addedParticipants || addedParticipants.length === 0) return;

    let gcData = (await getData(`invite/${threadID}`)) || {};

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;

      // ⛔ Skip bot mismo
      if (newUserID === api.getCurrentUserID()) continue;

      const actorID = logMessageData.actorFbId; // yung nag-trigger ng add/join
      const inviterID = newP.inviterID || (actorID !== newUserID ? actorID : null);

      let msg = "";

      if (inviterID) {
        // ✅ Case: may nag-add (kahit walang inviterID basta actor ≠ newUserID)
        if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };
        gcData[inviterID].count += 1;
        await setData(`invite/${threadID}`, gcData);

        const inviterName = await getUserName(inviterID, api, Users);
        const newUserName = await getUserName(newUserID, api, Users);

        msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: ${inviterName}
┃ ➕ Invited: ${newUserName}
┃ 📊 Total Invites: ${gcData[inviterID].count}
╰━━━━━━━━━━━━━━━━━━━━╯`;

      } else {
        // ✅ Case: tunay na sumali via link
        const joinerName = await getUserName(newUserID, api, Users);

        msg = `╭━[JOIN NOTIF]━╮
┃ 🚪 ${joinerName} joined the group via link.
╰━━━━━━━━━━━━━━━━━━━━╯`;
      }

      api.sendMessage(msg, threadID);
    }
  } catch (err) {
    console.error("❌ ERROR in inviteEvent module:", err);
  }
};
