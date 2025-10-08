module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "2.5.0",
  credits: "ChatGPT + NN + Jaylord La Peña",
  description: "Protects specific admins and bots from removal or kick (auto re-add with retry)",
};

// 👑 Protected Admins & Bots UID (ilagay lahat ng Facebook ID dito)
const PROTECTED_ADMINS = [
  "61559999326713", // Main Admin (Jaylord)
  "61563731477181", // Secondary Admin
  "61554885397487", // Jandel Bot
];

// Helper: wait
const sleep = ms => new Promise(res => setTimeout(res, ms));

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;
  const botID = api.getCurrentUserID();

  try {
    // 🧩 CASE 1: Protected Admin Removed as Admin
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      PROTECTED_ADMINS.includes(logMessageData.TARGET_ID)
    ) {
      const protectedID = logMessageData.TARGET_ID;

      if (author !== botID) {
        try {
          await api.changeAdminStatus(threadID, author, false);
        } catch {}
      }

      await sleep(2000);
      try {
        await api.changeAdminStatus(threadID, protectedID, true);
      } catch {}

      const info = await api.getUserInfo([protectedID, author]);
      const protectedName = info[protectedID]?.name || "Protected Member";
      const attackerName = info[author]?.name || "Attacker";

      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 ${protectedName} has been restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for removing a protected admin/bot.` : ""}`,
        threadID
      );
    }

    // 🧩 CASE 2: Protected Admin Kicked from Group
    if (
      logMessageType === "log:unsubscribe" &&
      PROTECTED_ADMINS.includes(logMessageData.leftParticipantFbId)
    ) {
      const protectedID = logMessageData.leftParticipantFbId;

      if (author !== botID) {
        try {
          await api.changeAdminStatus(threadID, author, false);
        } catch {}
      }

      // Function to re-add with retry
      const reAddProtected = async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const threadInfo = await api.getThreadInfo(threadID);
            const stillOut = !threadInfo.participantIDs.includes(protectedID);

            if (stillOut) {
              await api.addUserToGroup(protectedID, threadID);
              console.log(`✅ [AntiRobbery] Re-add attempt ${attempt} success.`);
              return true;
            } else {
              console.log(`ℹ️ [AntiRobbery] Protected member already inside.`);
              return true;
            }
          } catch (err) {
            console.error(`❌ Re-add attempt ${attempt} failed:`, err);
            await sleep(3000);
          }
        }
        return false;
      };

      // Try re-adding 3 times
      const success = await reAddProtected();

      if (success) {
        await sleep(3000);
        try {
          await api.changeAdminStatus(threadID, protectedID, true);
        } catch {}
      }

      const info = await api.getUserInfo([protectedID, author]);
      const protectedName = info[protectedID]?.name || "Protected Member";
      const attackerName = info[author]?.name || "Attacker";

      api.sendMessage(
        `⚠️ Anti-Kick Activated!\n\n👑 ${protectedName} has been re-added and restored as admin.\n❌ ${author !== botID ? `${attackerName} has been demoted for kicking a protected admin/bot.` : ""}`,
        threadID
      );
    }
  } catch (err) {
    console.error("❌ Anti-robbery error:", err);
  }
};