module.exports.config = {
    name: "adminUpdate",
    eventType: [
        "log:thread-admins",
        "log:thread-name",
        "log:user-nickname",
        "log:thread-icon",
        "log:thread-color",
        "log:magic-emoji" // quick reaction
    ],
    version: "1.0.2",
    credits: "Edited by ChatGPT",
    description: "Update team information quickly",
    envConfig: {
        sendNoti: true,
    }
};

module.exports.run = async function ({ event, api, Threads, Users }) {
    const fs = require("fs");
    var iconPath = __dirname + "/emoji.json";
    if (!fs.existsSync(iconPath)) fs.writeFileSync(iconPath, JSON.stringify({}));
    const { threadID, logMessageType, logMessageData } = event;
    const { setData, getData } = Threads;

    const thread = global.data.threadData.get(threadID) || {};
    if (typeof thread["adminUpdate"] != "undefined" && thread["adminUpdate"] == false) return;

    try {
        let dataThread = (await getData(threadID)).threadInfo;
        let authorName = await Users.getNameUser(event.author);

        switch (logMessageType) {
            case "log:thread-name": {
                dataThread.threadName = logMessageData.name || "No name";
                api.sendMessage(
                    `» [ GROUP UPDATE ]\n» ${authorName} changed group name to: ${dataThread.threadName}`,
                    threadID
                );
                break;
            }

            case "log:thread-icon": {
                let preIcon = JSON.parse(fs.readFileSync(iconPath));
                dataThread.threadIcon = logMessageData.thread_icon || "👍";
                api.sendMessage(
                    `» [ GROUP UPDATE ]\n» ${authorName} changed group icon\n» Previous icon: ${preIcon[threadID] || "unknown"}`,
                    threadID, () => {
                        preIcon[threadID] = dataThread.threadIcon;
                        fs.writeFileSync(iconPath, JSON.stringify(preIcon));
                    }
                );
                break;
            }

            case "log:thread-color": {
                dataThread.threadColor = logMessageData.thread_color || "🌤";
                api.sendMessage(
                    `» [ GROUP UPDATE ]\n» ${authorName} changed group color`,
                    threadID
                );
                break;
            }

            case "log:user-nickname": {
                let targetName = await Users.getNameUser(logMessageData.participant_id);
                dataThread.nicknames[logMessageData.participant_id] = logMessageData.nickname;
                api.sendMessage(
                    `» [ GROUP UPDATE ]\n» ${authorName} changed nickname of ${targetName} to: ${(logMessageData.nickname.length == 0) ? "original name" : logMessageData.nickname}`,
                    threadID
                );
                break;
            }

            case "log:magic-emoji": { // quick reaction
                let newReaction = logMessageData.reaction || "❓";
                api.sendMessage(
                    `» [ GROUP UPDATE ]\n» ${authorName} changed the quick reaction to: ${newReaction}`,
                    threadID
                );
                break;
            }
        }

        await setData(threadID, { threadInfo: dataThread });
    } catch (e) { console.log(e) };
}
