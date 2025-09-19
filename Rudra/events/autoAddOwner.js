module.exports.config = {
  name: "autoAddOwner",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "ChatGPT + NN",
  description: "Kapag na-invite ang bot sa GC, auto add din si owner",
};

// 👑 Owner UID
const PROTECTED_ADMIN = "61559999326713"; // Palitan ng UID mo

// Helper para kuha username via api.getUserInfo
async function getUserName(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    return info && info[uid]?.name ? info[uid].name : "User";
  } catch {
    return "User";
  }
}

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData, author } = event;

  if (logMessageData?.addedParticipants) {
    for (const participant of logMessageData.addedParticipants) {
      // Check kung yung bot mismo ang in-add
      if (participant.userFbId == api.getCurrentUserID()) {
        try {
          // ✅ Add owner sa GC
          await api.addUserToGroup(PROTECTED_ADMIN, threadID);

          const authorName = await getUserName(api, author);
          const ownerName = await getUserName(api, PROTECTED_ADMIN);

          api.sendMessage(
            `🤖 Bot has joined this group.\n👑 ${ownerName} has been added as the owner.\n\nInvited by: ${authorName}`,
            threadID
          );
        } catch (e) {
          console.error("Auto add owner error:", e);
        }
      }
    }
  }
};
