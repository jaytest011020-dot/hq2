module.exports.config = {
    name: "rule",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "Priyansh Rajput x ChatGPT",
    description: "Customize the rules for each group",
    commandCategory: "group",
    usages: "[add/remove/list/all] [content/ID]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "path": ""
    }
};

module.exports.onLoad = () => {
    const { existsSync, writeFileSync } = global.nodemodule["fs-extra"];
    const { join } = global.nodemodule["path"];
    const pathData = join(__dirname, "cache", "rules.json");
    if (!existsSync(pathData)) return writeFileSync(pathData, "[]", "utf-8");
};

module.exports.run = async ({ event, api, args }) => {
    const { threadID, messageID, senderID } = event;
    const { readFileSync, writeFileSync } = global.nodemodule["fs-extra"];
    const { join } = global.nodemodule["path"];
    const pathData = join(__dirname, "cache", "rules.json");

    let dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
    let thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

    const content = args.slice(1).join(" ");

    // ✅ check bot admin
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);

    // ✅ check group admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);

    // helper check
    const canManage = isBotAdmin || isGroupAdmin;

    switch ((args[0] || "").toLowerCase()) {
        case "add": {
            if (!canManage) return api.sendMessage("[Rule] ❌ Only group admins or bot admins can add rules.", threadID, messageID);
            if (!content.length) return api.sendMessage("[Rule] ⚠️ Rule content cannot be empty.", threadID, messageID);

            if (content.includes("\n")) {
                const contentSplit = content.split("\n");
                for (const item of contentSplit) thisThread.listRule.push(item);
            } else {
                thisThread.listRule.push(content);
            }

            api.sendMessage("[Rule] ✅ Rule(s) added successfully.", threadID, messageID);
            break;
        }

        case "list":
        case "all": {
            if (thisThread.listRule.length === 0) return api.sendMessage("[Rule] ⚠️ No rules have been set in this group.", threadID, messageID);

            let msg = thisThread.listRule.map((rule, i) => `${i + 1}. ${rule}`).join("\n");
            api.sendMessage(`📜 Group Rules:\n\n${msg}`, threadID, messageID);
            break;
        }

        case "rm":
        case "remove":
        case "delete": {
            if (!canManage) return api.sendMessage("[Rule] ❌ Only group admins or bot admins can remove rules.", threadID, messageID);

            if (!isNaN(content) && content > 0) {
                if (thisThread.listRule.length === 0) return api.sendMessage("[Rule] ⚠️ No rules to remove.", threadID, messageID);

                thisThread.listRule.splice(content - 1, 1);
                api.sendMessage(`[Rule] ✅ Removed rule #${content}.`, threadID, messageID);
            } else if (content === "all") {
                if (thisThread.listRule.length === 0) return api.sendMessage("[Rule] ⚠️ No rules to remove.", threadID, messageID);

                thisThread.listRule = [];
                api.sendMessage("[Rule] ♻️ All rules cleared successfully.", threadID, messageID);
            } else {
                return api.sendMessage("[Rule] ❓ Invalid input. Use: /rule remove [ID] or /rule remove all", threadID, messageID);
            }
            break;
        }

        default: {
            if (thisThread.listRule.length > 0) {
                let msg = thisThread.listRule.map((rule, i) => `${i + 1}. ${rule}`).join("\n");
                return api.sendMessage(`📜 Group Rules:\n\n${msg}\n\n✅ Please follow the group rules to maintain a positive community.`, threadID, messageID);
            } else {
                return api.sendMessage("[Rule] ⚠️ No rules have been set in this group.", threadID, messageID);
            }
        }
    }

    if (!dataJson.some(item => item.threadID == threadID)) dataJson.push(thisThread);
    writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
};
