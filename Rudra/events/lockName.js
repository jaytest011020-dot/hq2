module.exports.config = {
    name: "nameLock",
    eventType: [
        "log:thread-name" // Listen for group name changes
    ],
    version: "1.0.0",
    credits: "ChatGPT",
    description: "Enforces locked group name",
};

module.exports.run = async function ({ api, event, Threads, Users }) {
    const fs = require("fs");
    const path = require("path");
    const DATA_FILE = path.join(__dirname, "../data/lockname.json");

    let lockedNames = {};

    // Load existing locked names
    if (fs.existsSync(DATA_FILE)) {
        try {
            lockedNames = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        } catch (err) {
            console.error("Error loading locked names:", err);
        }
    }

    const { threadID, logMessageType, logMessageData, author } = event;

    // Proceed only if the group name has changed
    if (logMessageType === "log:thread-name") {
        const lockedName = lockedNames[threadID]?.name;

        // If the group has a locked name, compare the new name
        if (lockedName && logMessageData.name !== lockedName) {
            // Revert back to the locked name if the name is changed
            try {
                await api.setTitle(lockedName, threadID);
                const changerName = await Users.getNameUser(author);
                api.sendMessage(
                    `⚠️ ${changerName} tried to change the group name to: "${logMessageData.name}"\n` +
                    `🔒 Reverted back to the locked name: "${lockedName}"`,
                    threadID
                );
            } catch (error) {
                console.error("Error reverting group name:", error);
            }
        }
    }
};
