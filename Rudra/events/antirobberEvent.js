const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "3.6.0",
  credits: "ChatGPT + NN + Jaylord La Peña",
  description: "Protects specific admins and bots from removal or kick using Firebase database",
};

const sleep = ms => new Promise(res => setTimeout(res, ms));

// 👑 Trusted UIDs (bot will ignore their actions)
const TRUSTED_IDS = [
  "61580796141219", // bot or trusted account 1
  "61559999326713", // Jaylord
  "61554885397487"  // another trusted bot/admin
];

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;
  const botID = api.getCurrentUserID();

  try {
    const PROTECTED_ADMINS = (await getData("protectedAdmins")) || [];

    // Ignore if the one who did the action is trusted
    if (TRUSTED_IDS.includes(author)) return;

    // 🧩 CASE 1: Protected admin removed from admin list
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      PROTECTED_ADMINS.includes(logMessageData.TARGET_ID)
    ) {
      const protectedID = logMessageData.TARGET_ID;

      // Demote attacker
      if (author !== botID) {
        try { await api.changeAdminStatus(threadID, author, false); } catch {}
      }

      // Restore protected admin
      await sleep(2000);
      try { await api.changeAdminStatus(threadID, protectedID, true); } catch {}

      // Get names
      const info = await api.getUserInfo([protectedID, author]);
      const pName = info[protectedID]?.name || "Protected Member";
      const aName = info[author]?.name || "Attacker";

      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 ${pName} restored as admin.\n❌ ${aName} demoted for removing a protected admin.`,
        threadID
      );
    }

    // 🧩 CASE 2: Protected member kicked
    if (
      logMessageType === "log:unsubscribe" &&
      PROTECTED_ADMINS.includes(logMessageData.leftParticipantFbId)
    ) {
      const protectedID = logMessageData.leftParticipantFbId;

      // Demote attacker
      if (author !== botID) {
        try { await api.changeAdminStatus(threadID, author, false); } catch {}
      }

      // Try to re-add protected member
      const reAdd = async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const info = await api.getThreadInfo(threadID);
            const stillOut = !info.participantIDs.includes(protectedID);
            if (stillOut) {
              await api.addUserToGroup(protectedID, threadID);
              console.log(`✅ Re-added protected member (attempt ${attempt})`);
              return true;
            }
          } catch (err) {
            console.error(`❌ Attempt ${attempt} failed:`, err);
            await sleep(3000);
          }
        }
        return false;
      };

      const success = await reAdd();

      if (success) {
        await sleep(2000);
        try { await api.changeAdminStatus(threadID, protectedID, true); } catch {}
      }

      // Get names
      const info = await api.getUserInfo([protectedID, author]);
      const pName = info[protectedID]?.name || "Protected Member";
      const aName = info[author]?.name || "Attacker";

      api.sendMessage(
        `⚠️ Anti-Kick Activated!\n\n👑 ${pName} has been re-added and restored as admin.\n❌ ${aName} demoted for kicking a protected member.`,
        threadID
      );
    }

  } catch (err) {
    console.error("❌ Anti-robbery error:", err);
  }
};