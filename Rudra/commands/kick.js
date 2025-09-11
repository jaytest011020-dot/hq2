module.exports.config = {
    name: "kick",
    version: "1.0.1",
    hasPermssion: 2, // admin only
    credits: "Jaylord La Peña",
    description: "Kick mentioned user(s) from the group",
    usePrefix: true,
    commandCategory: "group",
    usages: "/kick @user",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, permssion }) {
    // ✅ check if command caller is admin
    if (permssion !== 2) {
        return api.sendMessage("❌ Only admins can use this command.", event.threadID, event.messageID);
    }

    // ✅ check if user mentioned someone
    if (!Object.keys(event.mentions).length) {
        return api.sendMessage("⚠️ Usage: /kick @user", event.threadID, event.messageID);
    }

    const mentions = Object.keys(event.mentions); // array of mentioned user IDs
    let kicked = [];
    let failed = [];

    for (const id of mentions) {
        try {
            await api.removeUserFromGroup(id, event.threadID);
            kicked.push(event.mentions[id].replace("@", ""));
        } catch (err) {
            failed.push(event.mentions[id].replace("@", ""));
        }
    }

    let msg = "";
    if (kicked.length > 0) msg += `✅ Kicked: ${kicked.join(", ")}\n`;
    if (failed.length > 0) msg += `❌ Failed: ${failed.join(", ")}`;

    return api.sendMessage(msg, event.threadID, event.messageID);
};
