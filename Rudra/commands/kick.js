module.exports.config = {
    name: "kick",
    version: "1.1.1",
    hasPermssion: 0, // lahat papasok, tayo na magche-check
    credits: "Jaylord La Peña, ChatGPT",
    description: "Kick mentioned user(s) from the group",
    usePrefix: true,
    commandCategory: "admin",
    usages: "/kick @user",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions } = event;

    // ✅ check kung bot owner
    const botAdmins = global.config.ADMINBOT || []; // usually nasa config.json
    const isBotOwner = botAdmins.includes(senderID);

    // ✅ check kung GC admin
    let isGroupAdmin = false;
    try {
        const info = await api.getThreadInfo(threadID);
        isGroupAdmin = info.adminIDs.some(e => e.id == senderID);
    } catch (err) {
        console.error("⚠️ Error fetching group info:", err.message);
    }

    // ❌ pag wala sa dalawa
    if (!isBotOwner && !isGroupAdmin) {
        return api.sendMessage("⚠️ You do not have permission to use this command.", threadID, messageID);
    }

    // ✅ check kung may na-mention
    if (!Object.keys(mentions).length) {
        return api.sendMessage("⚠️ Usage: /kick @user", threadID, messageID);
    }

    const userIDs = Object.keys(mentions);
    let kicked = [];
    let failed = [];

    for (const id of userIDs) {
        try {
            await api.removeUserFromGroup(id, threadID);
            kicked.push(mentions[id].replace("@", ""));
        } catch (err) {
            failed.push(mentions[id].replace("@", ""));
        }
    }

    let msg = "";
    if (kicked.length > 0) msg += `✅ Kicked: ${kicked.join(", ")}\n`;
    if (failed.length > 0) {
        msg += `❌ Failed: ${failed.join(", ")}\n👉 Make sure the bot is an admin in this group.`;
    }

    return api.sendMessage(msg.trim(), threadID, messageID);
};
