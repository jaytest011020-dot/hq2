const { setData, getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    // ✅ Unahin sa local Users module
    const name = await Users.getNameUser(uid);
    if (name) return name;

    // ✅ Fallback sa api.getUserInfo
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "inviteEvent",
  eventType: ["log:subscribe"],
  version: "2.1.0",
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

      const actorID = logMessageData.actorFbId; // laging may laman
      let msg = "";
      let mentions = [];

      if (actorID !== newUserID) {
        // ✅ Case: may nag-add (actor ≠ new user)
        if (!gcData[actorID]) gcData[actorID] = { count: 0 };
        gcData[actorID].count += 1;
        await setData(`invite/${threadID}`, gcData);

        const inviterName = await getUserName(actorID, api, Users);
        const newUserName = await getUserName(newUserID, api, Users);

        msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: @${inviterName}
┃ ➕ Invited: @${newUserName}
┃ 📊 Total Invites: ${gcData[actorID].count}
╰━━━━━━━━━━━━━━━╯`;

        mentions = [
          { tag: inviterName, id: actorID },
          { tag: newUserName, id: newUserID }
        ];

      } else {
        // ✅ Case: siya mismo ang sumali (via link)
        const joinerName = await getUserName(newUserID, api, Users);

        msg = `╭━[JOIN NOTIF]━╮
┃ 🚪 @${joinerName} joined the group via link.
╰━━━━━━━━━━━━━━━╯`;

        mentions = [{ tag: joinerName, id: newUserID }];
      }

      api.sendMessage({ body: msg, mentions }, threadID);
    }
  } catch (err) {
    console.error("❌ ERROR in inviteEvent module:", err);
  }
};
