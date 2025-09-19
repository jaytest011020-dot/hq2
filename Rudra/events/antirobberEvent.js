module.exports.config = {
  name: "antirobberyEvent",
  eventType: ["log:thread-admins"], // nakikinig lang sa pagbabago ng admins
  version: "1.0.1",
  credits: "ChatGPT + NN",
  description: "Auto restore protected admin and demote attacker",
};

// 👑 Protected Admin (palitan ng tunay mong Facebook UID)
const PROTECTED_ADMIN = "61559999326713"; // ikaw ito

module.exports.run = async function ({ api, event, Users }) {
  const { threadID, logMessageType, logMessageData, author } = event;

  try {
    // Siguraduhin na ang event ay tungkol sa pagtanggal ng admin
    if (
      logMessageType === "log:thread-admins" &&
      logMessageData?.ADMIN_EVENT === "remove_admin" &&
      logMessageData?.TARGET_ID === PROTECTED_ADMIN
    ) {
      const authorName = await Users.getNameUser(author);

      // ✅ Ibalik protected admin
      await api.changeAdminStatus(threadID, PROTECTED_ADMIN, true);

      // ❌ Tanggalin admin ng nagtanggal
      await api.changeAdminStatus(threadID, author, false);

      // 📢 Notify GC
      api.sendMessage(
        `⚠️ Anti-Robbery Activated!\n\n👑 Protected admin has been restored.\n❌ ${authorName} has been demoted for removing protected admin.`,
        threadID
      );
    }
  } catch (e) {
    console.error("Anti-robbery error:", e);
  }
};
