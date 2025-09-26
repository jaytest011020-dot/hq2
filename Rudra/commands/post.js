module.exports.config = {
	name: "post",
	version: "1.0.1",
	hasPermssion: 0, // ✅ lahat puwede mag-post
	credits: "ryuko + ChatGPT",
	usePrefix: true,
	description: "Create a new post in bot account (everyone can use)",
	commandCategory: "operator",
	cooldowns: 5
};

module.exports.run = async ({ event, api, getText, args, botid }) => {
	const { threadID, messageID, senderID } = event;
	const uuid = getGUID();
	const formData = {
		"input": {
			"composer_entry_point": "inline_composer",
			"composer_source_surface": "timeline",
			"idempotence_token": uuid + "_FEED",
			"source": "WWW",
			"attachments": [],
			"audience": {
				"privacy": {
					"allow": [],
					"base_state": "FRIENDS", // default FRIENDS
					"deny": [],
					"tag_expansion_state": "UNSPECIFIED"
				}
			},
			"message": { "ranges": [], "text": "" },
			"with_tags_ids": [],
			"inline_activities": [],
			"explicit_place_id": "0",
			"text_format_preset_id": "0",
			"logging": { "composer_session_id": uuid },
			"tracking": [null],
			"actor_id": api.getCurrentUserID(),
			"client_mutation_id": Math.floor(Math.random()*17)
		},
		"displayCommentsFeedbackContext": null,
		"feedLocation": "TIMELINE",
		"renderLocation": "timeline",
		"useDefaultActor": false,
		"isTimeline": true
	};
  
	return api.sendMessage(
		`Choose an audience for your post:\n1. Everyone\n2. Friends\n3. Only me`, 
		threadID, 
		(e, info) => {
			const handlee = {
				name: this.config.name,
				messageID: info.messageID,
				author: senderID,
				formData,
				type: "whoSee"
			};
			global.client.handleReply.get(botid).push(handlee);
		}, 
		messageID
	);
};

module.exports.handleReply = async ({ event, api, handleReply, botid }) => {
	const { type, author, formData } = handleReply;
	if (event.senderID != author) return;

	const axios = require("axios");
	const fs = require("fs-extra");
	const { threadID, messageID, attachments, body } = event;
	const botID = api.getCurrentUserID();

	// Function to upload images
	async function uploadAttachments(attachments) {
		let uploads = [];
		for (const attachment of attachments) {
			if (attachment.type !== "photo") continue;
			const getFile = (await axios.get(attachment.url, { responseType: "arraybuffer" })).data;
			const pathImage = __dirname + `/cache/tempPost.png`;
			fs.writeFileSync(pathImage, Buffer.from(getFile));
			uploads.push(fs.createReadStream(pathImage));
		}
		return uploads;
	}

	if (type === "whoSee") {
		if (!["1","2","3"].includes(body)) return api.sendMessage('Please choose 1 of the 3 options', threadID, messageID);
		formData.input.audience.privacy.base_state = body == "1" ? "EVERYONE" : body == "2" ? "FRIENDS" : "SELF";
		api.unsendMessage(handleReply.messageID, () => {
			api.sendMessage(
				`Reply with your post content, or reply 0 to leave blank`, 
				threadID, 
				(e, info) => {
					const handlee = {
						name: this.config.name,
						messageID: info.messageID,
						author: author,
						formData,
						type: "content"
					};
					global.client.handleReply.get(botid).push(handlee);
				}, 
				messageID
			);
		});
	} 
	else if (type === "content") {
		if (body !== "0") formData.input.message.text = body;
		api.unsendMessage(handleReply.messageID, () => {
			api.sendMessage(
				`Reply with photo(s) to attach, or 0 to skip`, 
				threadID, 
				(e, info) => {
					const handlee = {
						name: this.config.name,
						messageID: info.messageID,
						author: author,
						formData,
						type: "image"
					};
					global.client.handleReply.get(botid).push(handlee);
				}, 
				messageID
			);
		});
	} 
	else if (type === "image") {
		if (attachments.length > 0) {
			const uploadedFiles = await uploadAttachments(attachments);
			for (let file of uploadedFiles) {
				formData.input.attachments.push({ photo: { id: file.path } }); // simplified
			}
		}
		// Send final post
		const postForm = {
			av: botID,
			fb_api_req_friendly_name: "ComposerStoryCreateMutation",
			fb_api_caller_class: "RelayModern",
			doc_id: "7711610262190099",
			variables: JSON.stringify(formData)
		};
		api.httpPost('https://www.facebook.com/api/graphql/', postForm, (e, info) => {
			api.unsendMessage(handleReply.messageID);
			try {
				api.sendMessage(`✅ Post created successfully!`, threadID, messageID);
			} catch(err) {
				api.sendMessage(`❌ Post creation failed. Try again later.`, threadID, messageID);
			}
		});
	}
};

function getGUID() {
	var sectionLength = Date.now();
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = Math.floor((sectionLength + Math.random() * 16) % 16);
		sectionLength = Math.floor(sectionLength / 16);
		return (c === "x" ? r : (r & 7) | 8).toString(16);
	});
}
