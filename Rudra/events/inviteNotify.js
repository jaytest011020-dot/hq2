module.exports.config = {
  name: "inviteNotify",
  eventType: ["log:subscribe"],
  version: "1.1.0",
  credits: "ChatGPT + NN",
  description: "Auto notify kapag na-invite o na-add yung bot sa GC",
};

const PROTECTED_ADMIN = "61559999326713"; // Ikaw ito

// Helper para kumuha ng pangalan gamit ang api.getUserInfo
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

  // Kung ikaw mismo ang na-invite
  if (logMessageData?.addedParticipants) {
    for (const participant of logMessageData.addedParticipants) {
      if (participant.userFbId == PROTECTED_ADMIN) {
        try {
          const authorName = await getUserName(api, author);

          api.sendMessage(
            `✅ Bot has been added to this group by ${authorName}.\n\n⚠️ Note: Please make sure to grant admin rights for full functionality.`,
            threadID
          );
        } catch (e) {
          console.error("Invite notify error:", e);
        }
      }
    }
  }
};
