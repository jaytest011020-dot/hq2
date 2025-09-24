const { getData, setData } = require("../../database.js");

const OWNER_UID = "61559999326713";

module.exports.config = {
  name: "vip",
  version: "1.1.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Manage VIP list",
  usages: "/vip add @mention | /vip",
  commandCategory: "admin",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args, mentions }) {
  const { threadID, senderID } = event;

  // --- ADD VIP ---
  if (args[0]?.toLowerCase() === "add") {
    if (senderID !== OWNER_UID) return api.sendMessage("❌ You are not allowed to add VIPs.", threadID);
    if (!mentions || Object.keys(mentions).length === 0)
      return api.sendMessage("❌ Please mention the user to add as VIP.", threadID);

    const vips = (await getData("/vip")) || [];
    const added = [];

    for (let uid of Object.keys(mentions)) {
      const name = mentions[uid];
      const link = `https://www.facebook.com/${uid}`;
      if (!vips.find(v => v.uid === uid)) {
        vips.push({ uid, name, link });
        added.push({ name, link });
      }
    }

    await setData("/vip", vips);

    if (added.length === 0)
      return api.sendMessage("⚠️ All mentioned users are already VIPs.", threadID);

    const msg = `╔═══════════════\n` +
                added.map(v => `║ ${v.name}`).join("\n") +
                `\n╚═══════════════`;
    return api.sendMessage(msg, threadID);
  }

  // --- LIST VIP ---
  const vips = (await getData("/vip")) || [];
  if (!vips.length) return api.sendMessage("❌ No VIPs found.", threadID);

  const msg = `╔═══════════════ VIP LIST ═══════════════\n` +
              vips.map(v => `║ ${v.name} - ${v.link}`).join("\n\n") +
              `\n╚══════════════════════════════════════`;
  return api.sendMessage(msg, threadID);
};
