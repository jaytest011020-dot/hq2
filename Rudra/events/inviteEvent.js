const { setData, getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    // 🔹 Una: kuha sa API
    const info = await api.getUserInfo(uid);
    if (info?.[uid]?.name) return info[uid].name;

    // 🔹 Fallback sa local Users module
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

    let gcData = (await getData(`invite/${threadID}`)) || {};

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;
      const actorID = logMessageData.actorFbId;

      // ⛔ Skip bot mismo
      if (newUserID === api.getCurrentUserID()) continue;

      let msg = "";
      let mentions = [];

      // 🔹 Kung may ibang nag-add (actor ≠ new user)
      if (actorID !== newUserID) {
        // ✅ Increment invite count
        if (!gcData[actorID]) gcData[actorID] = { count: 0 };
        gcData[actorID].count += 1;
        await setData(`invite/${threadID}`, gcData);

        // 🔹 Kumuha ng username: API muna, fallback sa Users
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
        // 🔹 Nag-join via link / self-join
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
