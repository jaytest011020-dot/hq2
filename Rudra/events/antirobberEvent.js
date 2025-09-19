module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "2.0.0",
  credits: "ChatGPT + NN",
  description: "Protects specific admin from removal or kick",
};

// 👑 Protected Admin UID (ilagay mo dito yung Facebook ID mo)
const PROTECTED_ADMIN = "61559999326713";

module.exports.run = async function({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;

  try {
    // Case 1: Protected admin removed as admin
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      logMessageData.TARGET_ID === PROTECTED_ADMIN
    ) {
      // 1. Demote attacker agad
      await api.changeAdminStatus(threadID, author, false);

      // 2. Ibalik si protected admin
      await api.changeAdminStatus(threadID, PROTECTED_ADMIN, true);

      // 3. Fetch names
      const info = await api.getUserInfo([PROTECTED_ADMIN, author]);
      const protectedName = info[PROTECTED_ADMIN]?.name || "Protected Admin";
      const attackerName = info[author]?.name || "Attacker";

      // 4. Notify GC
      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 ${protectedName} has been restored as admin.\n❌ ${attackerName} has been demoted for removing protected admin.`,
        threadID
      );
    }

    // Case 2: Protected admin kicked from group
    if (
      logMessageType === "log:unsubscribe" &&
      logMessageData.leftParticipantFbId === PROTECTED_ADMIN
    ) {
      // 1. Demote attacker agad
      await api.changeAdminStatus(threadID, author, false);

      // 2. Ibalik sa GC si protected admin
      await api.addUserToGroup(PROTECTED_ADMIN, threadID);

      // 3. Promote ulit as admin
      await api.changeAdminStatus(threadID, PROTECTED_ADMIN, true);

      // 4. Fetch names
      const info = await api.getUserInfo([PROTECTED_ADMIN, author]);
      const protectedName = info[PROTECTED_ADMIN]?.name || "Protected Admin";
      const attackerName = info[author]?.name || "Attacker";

      // 5. Notify GC
      api.sendMessage(
        `⚠️ Anti-Kick Activated!\n\n👑 ${protectedName} has been re-added and restored as admin.\n❌ ${attackerName} has been demoted for kicking protected admin.`,
        threadID
      );
    }
  } catch (err) {
    console.error("Anti-robbery error:", err);
  }
};
