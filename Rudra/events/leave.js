module.exports.config = {
	name: "leave",
	eventType: ["log:unsubscribe"],
	version: "1.3.0",
	credits: "Mirai Team / ChatGPT",
	description: "Notify when someone leaves or is kicked, with funny reasons, current member count, and mentions",
	dependencies: {
		"fs-extra": "",
		"request": ""
	}
};

module.exports.run = async function({ api, event, Users, Threads }) {
	if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

	const fs = global.nodemodule["fs-extra"];
	const request = global.nodemodule["request"];
	const { threadID } = event;
	const leftID = event.logMessageData.leftParticipantFbId;

	try {
		// ✅ Get user name from API (use cache if available)
		const cachedName = global.data.userName.get(leftID);
		let name = cachedName || Object.values(await api.getUserInfo(leftID))[0]?.name || "Friend";

		// Determine reason
		let type = "";
		if (event.author == leftID) {
			const funnyReasons = [
				"Mahilig sa TikTok, nag-leave para mag-live!",
				"Nawala sa wifi signal, sorry guys!",
				"Sumali lang para makita memes, tapos bye!",
				"May lakad, kailangan umalis",
				"Naghanap ng mas masayang grupo 😎"
			];
			type = `\n\nReason: ${funnyReasons[Math.floor(Math.random() * funnyReasons.length)]}`;
		} else {
			const funnyKickReasons = [
				"Tumawa ng sobra, na-offend ang admin 😅",
				"Nag-reply ng 'lmao' sa lahat ng mensahe, kaya kick!",
				"Nag-share ng meme na banned 😜",
				"Na-curious sa spam button, accidentally kicked",
				"Nag-type ng 'admin is mean' 😆"
			];
			type = `\n\nReason: ${funnyKickReasons[Math.floor(Math.random() * funnyKickReasons.length)]}\nKicked by Administrator`;
		}

		// Get current member count
		const threadInfo = await api.getThreadInfo(threadID);
		const memberCount = threadInfo.participantIDs.length;

		// Prepare mentions
		const mentions = [{ tag: name, id: leftID, fromIndex: 0 }];

		// Prepare message
		const data = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data;
		let msg = (typeof data.customLeave === "undefined")
			? `${name} left the group${type}\nCurrent members: ${memberCount}`
			: data.customLeave.replace(/\{name}/g, name).replace(/\{type}/g, type).replace(/\{count}/g, memberCount);

		// Random image
		const link = [  
			"https://i.imgur.com/U2Uqx9J.jpg",
			"https://i.imgur.com/vtg9SY8.jpg",
			"https://i.imgur.com/FTM9eHt.jpg",
			"https://i.imgur.com/VGb89J8.jpg"
		];
		const imgPath = __dirname + "/cache/leave_image.jpg";
		const callback = () => api.sendMessage({ body: msg, attachment: fs.createReadStream(imgPath), mentions }, threadID, () => fs.unlinkSync(imgPath));

		// Download random image and send
		request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(imgPath)).on("close", callback);

	} catch (err) {
		console.error("ERROR in leave module:", err);
	}
};
