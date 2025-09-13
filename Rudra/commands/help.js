module.exports.config = {
	name: "help",
	version: "1.2.0",
	hasPermssion: 0,
	credits: "Edited by ChatGPT",
	description: "Beginner's Guide with usage under each command",
	commandCategory: "system",
	usages: "[module name]",
	cooldowns: 1,
	envConfig: {
		autoUnsend: true,
		delayUnsend: 300
	}
};

module.exports.languages = {
	"en": {
		"moduleInfo":
`📌 Command: %1
📖 Description: %2
⚙️ Usage: %3
📂 Category: %4
⏳ Cooldown: %5 second(s)
👤 Permission: %6
✍️ Credits: %7`,
		"user": "User",
		"adminGroup": "Admin group",
		"adminBot": "Admin bot"
	}
};

module.exports.run = function ({ api, event, args, getText }) {
	const { commands } = global.client;
	const { threadID } = event;
	const command = commands.get((args[0] || "").toLowerCase());
	const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
	const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
	const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

	// kapag walang specific command → list lahat (name + usage sa baba)
	if (!command) {
		const arrayInfo = [];
		const page = parseInt(args[0]) || 1;
		const numberOfOnePage = 200;
		let i = 0;
		let msg = "";

		for (var [name, value] of commands) {
			arrayInfo.push({ name, config: value.config });
		}

		// ayusin alphabetical
		arrayInfo.sort((a, b) => a.name.localeCompare(b.name));

		const startSlice = numberOfOnePage * page - numberOfOnePage;
		i = startSlice;
		const returnArray = arrayInfo.slice(startSlice, startSlice + numberOfOnePage);

		for (let item of returnArray) {
			msg += `「 ${++i} 」${prefix}${item.name}\n`;
			msg += `   ➝ Usage: ${prefix}${item.name} ${(item.config.usages) ? item.config.usages : ""}\n\n`;
		}

		const header = `📄 Command List\n✨ Type /help <command> to see full details`;
		const footer = `\nPage (${page}/${Math.ceil(arrayInfo.length / numberOfOnePage)})`;

		return api.sendMessage(header + "\n\n" + msg + footer, threadID, async (error, info) => {
			if (autoUnsend) {
				await new Promise(resolve => setTimeout(resolve, delayUnsend * 1000));
				return api.unsendMessage(info.messageID);
			}
		}, event.messageID);
	}

	// kapag may specific command → show full details
	return api.sendMessage(
		getText(
			"moduleInfo",
			command.config.name,
			command.config.description,
			`${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
			command.config.commandCategory,
			command.config.cooldowns,
			((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
			command.config.credits
		),
		threadID,
		event.messageID
	);
};
