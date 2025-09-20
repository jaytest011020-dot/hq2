const { getData, setData } = require("../../database.js"); // Firebase module

async function getUserName(uid, api, Users) {
  try {
    // Unahin sa local Users module
    const name = await Users.getNameUser(uid);
    if (name) return name;

    // Fallback sa api.getUserInfo
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "inviteEvent",
  eventType: ["log:subscribe"],
  version: "2.3.0",
  credits: "ChatGPT + NN",
};

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;
    if (!addedParticipants || addedParticipants.length === 0) return;

    // Load GC config (invite tracking on/off)
    let gcConfig = (await getData(`inviteConfig/${threadID}`)) || { enabled: true };
    if (!gcConfig.enabled) return; // skip kung naka off

    // Load GC invite data
    let gcData = (await getData(`invite/${threadID}`)) || {};

    for (const newP of addedParticipants) {
      const newUserID = newP.userFbId;
      if (newUserID === api.getCurrentUserID()) continue; // skip bot mismo

      const actorID = logMessageData.actorFbId; // sino ang nag-add
      let msg = "";
      let mentions = [];

      if (actorID && actorID !== newUserID) {
        // ✅ may nag-add → increment invite count
        if (!gcData[actorID]) gcData[actorID] = { count: 0 };
        gcData[actorID].count += 1;
        await setData(`invite/${threadID}`, gcData);

        const inviterName = await getUserName(actorID, api, Users);
        const newUserName = await getUserName(newUserID, api, Users);

        msg = `╭━[INVITE NOTIF]━╮
┃ 👤 Inviter: @${inviterName}
┃ ➕ Invited: @${newUserName}
┃ 📊 Total Invites: ${gcData[actorID].count}
╰━━━━━━━━━━━━╯`;

        mentions = [
          { tag: inviterName, id: actorID },
          { tag: newUserName, id: newUserID }
        ];
      } else {
        // ✅ sumali via link → walang invite count increment
        const joinerName = await getUserName(newUserID, api, Users);

        msg = `╭━[JOIN NOTIF]━╮
┃ 🚪 @${joinerName} joined the group via link.
╰━━━━━━━━━━━━╯`;

        mentions = [{ tag: joinerName, id: newUserID }];
      }

      api.sendMessage({ body: msg, mentions }, threadID);
    }
  } catch (err) {
    console.error("❌ ERROR in inviteEvent module:", err);
  }
};

// Optional: Command para i-toggle invite tracking
module.exports.toggleInvite = async function({ api, event, args }) {
  const { threadID } = event;
  if (!args[0]) return api.sendMessage("Usage: /invite on | off", threadID);

  if (args[0].toLowerCase() === "on") {
    await setData(`inviteConfig/${threadID}`, { enabled: true });
    return api.sendMessage("✅ Invite tracking ENABLED for this group.", threadID);
  } else if (args[0].toLowerCase() === "off") {
    await setData(`inviteConfig/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Invite tracking DISABLED for this group.", threadID);
  } else {
    return api.sendMessage("❌ Invalid option. Use 'on' or 'off'.", threadID);
  }
};
