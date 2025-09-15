const fs = require("fs-extra");

module.exports.config = {
    name: "admin",
    version: "1.0.6",
    hasPermssion: 0, 
    credits: "Priyansh Rajput, ChatGPT",
    description: "Manage bot admins",
    commandCategory: "admin",
    usages: "[list/add/remove] [userID]",
    cooldowns: 5
};

module.exports.messages = {
    listAdmin: "[Admin] Current bot admins: \n\n%1",
    notHavePermission: "[Admin] You don’t have permission to use \"%1\"",
    addedNewAdmin: "[Admin] Added %1 user(s) as bot admin:\n\n%2",
    removedAdmin: "[Admin] Removed %1 bot admin(s):\n\n%2"
};

module.exports.run = async function ({ api, event, args, Users, permssion }) {
    const content = args.slice(1);
    const { threadID, messageID, mentions } = event;
    const { configPath } = global.client;
    const { ADMINBOT } = global.config;
    const { writeFileSync } = fs;
    const mention = Object.keys(mentions);

    // Reload config to apply changes immediately
    delete require.cache[require.resolve(configPath)];
    var config = require(configPath);

    switch (args[0]) {
        case "list": {
            const listAdmin = ADMINBOT || config.ADMINBOT || [];
            let msg = [];

            for (const idAdmin of listAdmin) {
                if (parseInt(idAdmin)) {
                    const name = await Users.getNameUser(idAdmin);
                    msg.push(`- ${name} (https://facebook.com/${idAdmin})`);
                }
            }

            return api.sendMessage(
                this.messages.listAdmin.replace("%1", msg.join("\n")),
                threadID,
                messageID
            );
        }

        case "add": {
            if (permssion != 2)
                return api.sendMessage(
                    this.messages.notHavePermission.replace("%1", "add"),
                    threadID,
                    messageID
                );

            let listAdd = [];

            if (mention.length > 0) {
                for (const id of mention) {
                    ADMINBOT.push(id);
                    config.ADMINBOT.push(id);
                    listAdd.push(`[${id}] » ${mentions[id]}`);
                }
            } else if (content.length > 0 && !isNaN(content[0])) {
                ADMINBOT.push(content[0]);
                config.ADMINBOT.push(content[0]);
                const name = await Users.getNameUser(content[0]);
                listAdd.push(`[${content[0]}] » ${name}`);
            } else return global.utils.throwError(this.config.name, threadID, messageID);

            writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
            return api.sendMessage(
                this.messages.addedNewAdmin
                    .replace("%1", listAdd.length)
                    .replace("%2", listAdd.join("\n")),
                threadID,
                messageID
            );
        }

        case "remove": {
            if (permssion != 2)
                return api.sendMessage(
                    this.messages.notHavePermission.replace("%1", "remove"),
                    threadID,
                    messageID
                );

            let listRemoved = [];

            if (mention.length > 0) {
                for (const id of mention) {
                    const index = config.ADMINBOT.indexOf(id);
                    if (index !== -1) {
                        ADMINBOT.splice(index, 1);
                        config.ADMINBOT.splice(index, 1);
                        listRemoved.push(`[${id}] » ${mentions[id]}`);
                    }
                }
            } else if (content.length > 0 && !isNaN(content[0])) {
                const index = config.ADMINBOT.indexOf(content[0]);
                if (index !== -1) {
                    ADMINBOT.splice(index, 1);
                    config.ADMINBOT.splice(index, 1);
                    const name = await Users.getNameUser(content[0]);
                    listRemoved.push(`[${content[0]}] » ${name}`);
                }
            } else return global.utils.throwError(this.config.name, threadID, messageID);

            writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
            return api.sendMessage(
                this.messages.removedAdmin
                    .replace("%1", listRemoved.length)
                    .replace("%2", listRemoved.join("\n")),
                threadID,
                messageID
            );
        }

        default:
            return global.utils.throwError(this.config.name, threadID, messageID);
    }
};
