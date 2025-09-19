// events/autoAddOwner.js
module.exports.config = {
  name: "autoAddOwner",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "ChatGPT + NN",
  description: "Kapag na-invite ang bot sa GC, auto add din si owner",
};

// 👑 Palitan ito ng UID mo
const PROTECTED_ADMIN = "61559999326713";

// Helper para kuha username via api.getUserInfo
async function getUserName(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    return (info && info[uid] && info[uid].name) ? info[uid].name : uid;
  } catch {
    return uid;
  }
}

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData, author } = event;

  // Check kung may participants na in-add
  const added = logMessageData?.addedParticipants || [];
  if (!Array.isArray(added)) return;

  for (const participant of added) {
    const addedId = participant?.userFbId;
    if (!addedId) continue;

    // Kung yung bot ang na-invite
    if (String(addedId) === String(api.getCurrentUserID())) {
      try {
        // Add owner sa GC
        await api.addUserToGroup(PROTECTED_ADMIN, threadID);

        const authorName = await getUserName(api, author);
        const ownerName = await getUserName(api, PROTECTED_ADMIN);

        api.sendMessage(
          `🤖 Bot has joined this group.\n👑 ${ownerName} has been added automatically.\n\nInvited by: ${authorName}`,
          threadID
        );
      } catch (e) {
        console.error("Auto add owner error:", e);
      }
    }
  }
};
