const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins", "log:unsubscribe"],
  version: "3.5.0",
  credits: "ChatGPT + NN + Jaylord La Peña",
  description: "Protects specific admins and bots from removal or kick using Firebase database",
};

const sleep = ms => new Promise(res => setTimeout(res, ms));

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;
  const botID = api.getCurrentUserID();

  try {
    const PROTECTED_ADMINS = (await getData("protectedAdmins")) || [];

    // 🧩 CASE 1: Admin removed
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData.ADMIN_EVENT === "remove_admin" &&
      PROTECTED_ADMINS.includes(logMessageData.TARGET_ID)
    ) {
      const protectedID = logMessageData.TARGET_ID;

      if (author !== botID) {
        try { await api.changeAdminStatus(threadID, author, false); } catch {}
      }

      await sleep(2000);
      try { await api.changeAdminStatus(threadID, protectedID, true); } catch {}

      const info = await api.getUserInfo([protectedID, author]);
      const pName = info[protectedID]?.name || "Protected Member";
      const aName = info[author]?.name || "Attacker";

      api.sendMessage(`⚠️ Anti-Robbery Activated!\n\n👑 ${pName} restored as admin.\n❌ ${aName} demoted for removing a protected admin.`, threadID);
    }

    // 🧩 CASE 2: Protected kicked
    if (
      logMessageType === "log:unsubscribe" &&
      PROTECTED_ADMINS.includes(logMessageData.leftParticipantFbId)
    ) {
      const protectedID = logMessageData.leftParticipantFbId;

      if (author !== botID) {
        try { await api.changeAdminStatus(threadID, author, false); } catch {}
      }

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

      const info = await api.getUserInfo([protectedID, author]);
      const pName = info[protectedID]?.name || "Protected Member";
      const aName = info[author]?.name || "Attacker";

      api.sendMessage(`⚠️ Anti-Kick Activated!\n\n👑 ${pName} has been re-added and restored as admin.\n❌ ${aName} demoted for kicking a protected member.`, threadID);
    }

  } catch (err) {
    console.error("❌ Anti-robbery error:", err);
  }
};