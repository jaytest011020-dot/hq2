const fs = require("fs-extra");
const path = require("path");

const NICKNAME_LOCK_FILE = path.join(__dirname, "../data/locked_nicknames.json");

// Load nickname lock data
function loadLockedNicknames() {
    try {
        if (fs.existsSync(NICKNAME_LOCK_FILE)) {
            return JSON.parse(fs.readFileSync(NICKNAME_LOCK_FILE, "utf8"));
        }
    } catch (error) {
        console.error("Error loading locked nicknames:", error);
    }
    return {};
}

// Save nickname lock data
function saveLockedNicknames(data) {
    try {
        fs.writeFileSync(NICKNAME_LOCK_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving locked nicknames:", error);
    }
}

module.exports.config = {
    name: "nicknamelock",
    version: "1.0.1",
    credits: "Rudra x ChatGPT",
    description: "Lock or unlock nicknames in a group",
    hasPermssion: 1,
    commandCategory: "group",
    usages: "[lock/unlock/reset]",
    cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const action = args[0];
    let lockedNicknames = loadLockedNicknames();

    // ✅ check bot admin
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);

    // ✅ check group admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);

    // ❌ reject if not allowed
    if (!isBotAdmin && !isGroupAdmin) {
        return api.sendMessage(
            "[ NicknameLock ] ❌ Only group admins or bot admins can use this command.",
            threadID,
            messageID
        );
    }

    if (!action) {
        return api.sendMessage(
            "Usage:\n" +
            "• /nicknamelock lock → Lock current nicknames\n" +
            "• /nicknamelock unlock → Disable nickname lock\n" +
            "• /nicknamelock reset → Clear stored nicknames",
            threadID,
            messageID
        );
    }

    switch (action.toLowerCase()) {
        case "lock": {
            try {
                const nickData = {};

                for (const user of threadInfo.participantIDs) {
                    const userNick = threadInfo.nicknames[user] || "";
                    nickData[user] = userNick;
                }

                lockedNicknames[threadID] = nickData;
                saveLockedNicknames(lockedNicknames);

                api.sendMessage("✅ All nicknames in this group are now locked.", threadID, messageID);
            } catch (error) {
                console.error(error);
                api.sendMessage("❌ Failed to lock nicknames.", threadID, messageID);
            }
            break;
        }

        case "unlock": {
            if (lockedNicknames[threadID]) {
                delete lockedNicknames[threadID];
                saveLockedNicknames(lockedNicknames);
                api.sendMessage("🔓 Nickname lock disabled for this group.", threadID, messageID);
            } else {
                api.sendMessage("⚠️ No nickname lock is currently active in this group.", threadID, messageID);
            }
            break;
        }

        case "reset": {
            if (lockedNicknames[threadID]) {
                delete lockedNicknames[threadID];
                saveLockedNicknames(lockedNicknames);
                api.sendMessage("♻️ Nickname lock data cleared for this group.", threadID, messageID);
            } else {
                api.sendMessage("⚠️ Nothing to reset. No nickname lock active.", threadID, messageID);
            }
            break;
        }

        default:
            api.sendMessage("❓ Invalid option. Use: lock | unlock | reset", threadID, messageID);
            break;
    }
};
