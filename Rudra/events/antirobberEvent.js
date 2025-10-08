module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "2.1.0",
  credits: "ChatGPT + NN + Jaylord La Peña",
  description: "Protects specific admins and bots from removal or kick",
};

// 👑 Protected Admins & Bots UID (ilagay lahat ng Facebook ID dito)
const PROTECTED_ADMINS = [
  "61559999326713", // Main Admin
  "61563731477181", // Secondary Admin
  "61554885397487", // Jandel Bot
];

module.exports.run = async function({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;

  try {
    const botID = api.getCurrentUserID(); // Bot's own UID

    // 📌 Case 1: Protected admin/bot removed as admin
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      PROTECTED_ADMINS.includes(logMessageData.TARGET_ID)
    ) {
      const protectedID = logMessageData.TARGET_ID;

      // Demote attacker agad, but not if bot itself
      if (author !== botID) await api.changeAdminStatus(threadID, author, false);

      // Ibalik si protected admin/bot
      await api.changeAdminStatus(threadID, protectedID, true);

      // Fetch names
      const info = await api.getUserInfo([protectedID, author]);
      const protectedName = info[protectedID]?.name || "Protected Member";
      const attackerName = info[author]?.name || "Attacker";

      // Notify GC
      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 ${protectedName} has been restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for removing a protected admin/bot.` : ""}`,
        threadID
      );
    }

    // 📌 Case 2: Protected admin/bot kicked from group
    if (
      logMessageType === "log:unsubscribe" &&
      PROTECTED_ADMINS.includes(logMessageData.leftParticipantFbId)
    ) {
      const protectedID = logMessageData.leftParticipantFbId;

      // Demote attacker agad, but not if bot itself
      if (author !== botID) await api.changeAdminStatus(threadID, author, false);

      // Ibalik sa GC si protected admin/bot
      await api.addUserToGroup(protectedID, threadID);

      // Promote ulit as admin
      await api.changeAdminStatus(threadID, protectedID, true);

      // Fetch names
      const info = await api.getUserInfo([protectedID, author]);
      const protectedName = info[protectedID]?.name || "Protected Member";
      const attackerName = info[author]?.name || "Attacker";

      // Notify GC
      api.sendMessage(
        `⚠️ Anti-Kick Activated!\n\n👑 ${protectedName} has been re-added and restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for kicking a protected admin/bot.` : ""}`,
        threadID
      );
    }
  } catch (err) {
    console.error("Anti-robbery error:", err);
  }
};