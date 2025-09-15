module.exports.config = {
    name: "adminUpdate",
    eventType: [
        "log:thread-name", // detect thread name changes
    ],
    version: "1.0.2",
    credits: "Edited by ChatGPT",
    description: "Update team information when admin changes",
    envConfig: {
        sendNoti: true
    }
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID, logMessageType, logMessageData, author } = event;

    // Check if the event is about a name change
    if (logMessageType !== "log:thread-name") return;

    const lockedNames = loadLockedNames();
    const lockedName = lockedNames[threadID]?.name;

    // If the group name was locked, compare and revert if necessary
    if (lockedName && logMessageData?.name !== lockedName) {
        try {
            // Revert back to the locked name
            await api.setTitle(lockedName, threadID);
            
            // Notify the group about the name change attempt
            const changerName = await api.getUserInfo(author);
            api.sendMessage(
                `⚠️ ${changerName[author].name} tried to change the group name to: "${logMessageData?.name}"\n` +
                `🔒 Reverted back to the locked name: "${lockedName}"`,
                threadID
            );
        } catch (error) {
            console.error("Error reverting group name:", error);
        }
    }
};

// Load the locked names from the file
function loadLockedNames() {
    const fs = require("fs");
    const path = require("path");
    const locknameFile = path.join(__dirname, "lockname.json");

    if (!fs.existsSync(locknameFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(locknameFile, "utf8"));
    } catch (error) {
        console.error("Error loading locked names:", error);
        return {};
    }
}
