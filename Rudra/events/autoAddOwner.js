module.exports.config = {
  name: "autoAddOwner",
  eventType: ["log:subscribe"],
  version: "1.0.1",
  credits: "ChatGPT + NN",
  description: "Kapag na-invite ang bot sa GC, auto add din si owner",
};

// 👑 Owner UID (palitan ng real FB ID mo)
const PROTECTED_ADMIN = "61559999326713";

// Helper: kuha username via api.getUserInfo
async function getUserName(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || "User";
  } catch {
    return "User";
  }
}

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData, author } = event;

  // Kapag may bagong participant(s) na in-add
  if (!logMessageData?.addedParticipants) return;

  for (const participant of logMessageData.addedParticipants) {
    // Check kung yung bot mismo ang in-add
    if (String(participant.userFbId) === String(api.getCurrentUserID())) {
      try {
        // ✅ I-add si Owner sa GC
        await api.addUserToGroup(PROTECTED_ADMIN, threadID);

        const authorName = await getUserName(api, author);
        const ownerName = await getUserName(api, PROTECTED_ADMIN);

        api.sendMessage(
          `🤖 Bot has joined this group.\n👑 ${ownerName} has been auto-added as Owner.\n\nInvited by: ${authorName}`,
          threadID
        );
      } catch (e) {
        console.error("❌ AutoAddOwner error:", e);
      }
    }
  }
};
