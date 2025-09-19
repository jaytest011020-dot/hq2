module.exports = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins"], // Nakikinig sa pagbabago ng admins
  version: "1.0.0",
  credits: "ChatGPT + NN",
  description: "Auto restore protected admin and demote attacker",
};

// 👑 Protected Admin (palitan ng tunay mong Facebook UID)
const PROTECTED_ADMIN = "61559999326713"; // Ikaw ito

module.exports.run = async function({ api, event }) {
  const { threadID, logMessageData, author } = event;

  // Check kung tinanggal ka sa admin
  if (
    logMessageData.ADMIN_EVENT === "remove_admin" &&
    logMessageData.TARGET_ID === PROTECTED_ADMIN
  ) {
    try {
      // ✅ Ibalik ka as admin
      await api.changeAdminStatus(threadID, PROTECTED_ADMIN, true);

      // ❌ Tanggalin admin ng nagtanggal sayo
      await api.changeAdminStatus(threadID, author, false);

      // 📢 Notify GC
      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 Protected admin has been restored.\n❌ User ${author} has been demoted for removing protected admin.`,
        threadID
      );
    } catch (e) {
      console.error("Anti-robbery error:", e);
    }
  }
};
