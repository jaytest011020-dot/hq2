const { setData, getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    // ✅ Unahin ang FB API
    const info = await api.getUserInfo(uid);
    if (info?.[uid]?.name) return info[uid].name;

    // ✅ Fallback sa local Users module
    const name = await Users.getNameUser(uid);
    if (name) return name;

    return `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "inviteEvent",
  eventType: ["log:subscribe"],
  version: "3.1.0",
  credits: "ChatGPT + NN",
};

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;

    if (!addedParticipants || addedParticipants.length === 0) return;

    // 🔹 Load GC data from Firebase
    let gcData = (await getData(`invite/${threadID}`)) || {};

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;
      if (newUserID === api.getCurrentUserID()) continue; // Skip bot

      // 🔹 Determine inviter
      // Primary: newP.inviterID → Actual inviter
      // Fallback: logMessageData.actorFbId → Event triggerer
      let inviterID = newP.inviterID || logMessageData.actorFbId;

      // 🔹 Check self-join
      let msg = "";
      let mentions = [];

      if (inviterID && inviterID !== newUserID) {
        // ✅ Valid inviter, increment invite count
        if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };
        gcData[inviterID].count += 1;
        await setData(`invite/${threadID}`, gcData);

        const inviterName = await getUserName(inviterID, api, Users);
        const newUserName = await getUserName(newUserID, api, Users);

        msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: @${inviterName}
┃ ➕ Invited: @${newUserName}
┃ 📊 Total Invites: ${gcData[inviterID].count}
╰━━━━━━━━━━━━━━━━━━━━╯`;

        mentions = [
          { tag: inviterName, id: inviterID },
          { tag: newUserName, id: newUserID }
        ];
      } else {
        // ✅ Self join / link join
        const joinerName = await getUserName(newUserID, api, Users);
        msg = `╭━[JOIN NOTIF]━╮
┃ 🚪 @${joinerName} joined the group via link.
╰━━━━━━━━━━━━━━━━━━━━╯`;

        mentions = [{ tag: joinerName, id: newUserID }];
      }

      // 🔹 Send message with mentions
      api.sendMessage({ body: msg, mentions }, threadID);
    }
  } catch (err) {
    console.error("❌ ERROR in inviteEvent module:", err);
  }
};
