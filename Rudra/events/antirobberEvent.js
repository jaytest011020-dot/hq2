module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "2.0.2",
  credits: "ChatGPT + NN",
  description: "Protects specific admins from removal or kick",
};

// 👑 Protected Admins UID (ilagay lahat ng Facebook ID mo dito)
const PROTECTED_ADMINS = ["61559999326713", "61563731477181"];

module.exports.run = async function({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;

  try {
    const botID = api.getCurrentUserID(); // Bot's own UID

    // Case 1: Protected admin removed as admin
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      PROTECTED_ADMINS.includes(logMessageData.TARGET_ID)
    ) {
      const protectedAdmin = logMessageData.TARGET_ID;

      // Demote attacker agad, but not if bot itself
      if (author !== botID) await api.changeAdminStatus(threadID, author, false);

      // Ibalik si protected admin
      await api.changeAdminStatus(threadID, protectedAdmin, true);

      // Fetch names
      const info = await api.getUserInfo([protectedAdmin, author]);
      const protectedName = info[protectedAdmin]?.name || "Protected Admin";
      const attackerName = info[author]?.name || "Attacker";

      // Notify GC
      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 ${protectedName} has been restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for removing protected admin.` : ""}`,
        threadID
      );
    }

    // Case 2: Protected admin kicked from group
    if (
      logMessageType === "log:unsubscribe" &&
      PROTECTED_ADMINS.includes(logMessageData.leftParticipantFbId)
    ) {
      const protectedAdmin = logMessageData.leftParticipantFbId;

      // Demote attacker agad, but not if bot itself
      if (author !== botID) await api.changeAdminStatus(threadID, author, false);

      // Ibalik sa GC si protected admin
      await api.addUserToGroup(protectedAdmin, threadID);

      // Promote ulit as admin
      await api.changeAdminStatus(threadID, protectedAdmin, true);

      // Fetch names
      const info = await api.getUserInfo([protectedAdmin, author]);
      const protectedName = info[protectedAdmin]?.name || "Protected Admin";
      const attackerName = info[author]?.name || "Attacker";

      // Notify GC
      api.sendMessage(
        `⚠️ Anti-Kick Activated!\n\n👑 ${protectedName} has been re-added and restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for kicking protected admin.` : ""}`,
        threadID
      );
    }
  } catch (err) {
    console.error("Anti-robbery error:", err);
  }
};
