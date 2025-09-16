const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
    name: "teach",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Priyansh Rajput + ChatGPT",
    description: "Teach SimSimi new responses",
    commandCategory: "Sim",
    usages: "",
    cooldowns: 2,
    dependencies: { "axios": "" }
};

// 🔑 Your API key
const API_KEY = "937e288d38e944108cc7c3de462fc35f6ce5a865";

module.exports.run = ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    return api.sendMessage(
        "[🤖 SIM] - Reply to this message with the **question** you want to teach SimSimi.",
        threadID,
        (err, info) => {
            global.client.handleReply.push({
                step: 1,
                name: module.exports.config.name,
                messageID: info.messageID,
                content: { id: senderID, ask: "", ans: "" }
            });
        },
        messageID
    );
};

module.exports.handleReply = async ({ api, event, Users, handleReply }) => {
    const { threadID, messageID, senderID, body } = event;
    let by_name = (await Users.getData(senderID)).name;
    if (handleReply.content.id !== senderID) return;

    const input = body.trim();
    let content = handleReply.content;

    const sendStep = (msg, step, content) =>
        api.sendMessage(msg, threadID, (err, info) => {
            global.client.handleReply.splice(global.client.handleReply.indexOf(handleReply), 1);
            api.unsendMessage(handleReply.messageID);
            global.client.handleReply.push({
                step,
                name: module.exports.config.name,
                messageID: info.messageID,
                content
            });
        }, messageID);

    const send = async msg => api.sendMessage(msg, threadID, messageID);

    switch (handleReply.step) {
        case 1:
            content.ask = input;
            sendStep("[🤖 SIM] - Great! Now reply with the **answer** for: " + input, 2, content);
            break;

        case 2:
            content.ans = input;
            global.client.handleReply.splice(global.client.handleReply.indexOf(handleReply), 1);
            api.unsendMessage(handleReply.messageID);

            try {
                const res = await axios.get("https://simsimi.ooguy.com/teach", {
                    params: {
                        ask: content.ask,
                        ans: content.ans,
                        apikey: API_KEY
                    }
                });

                if (res.data.status !== 200) {
                    return send(`❌ Error teaching SimSimi:\n${JSON.stringify(res.data, null, 2)}`);
                }

                const timeZ = moment.tz("Asia/Kolkata").format("HH:mm:ss | DD/MM/YYYY");

                send(`[🤖 SIM] ✅ Successfully taught SimSimi!\n\n📝 Data:\n"${content.ask}" → "${content.ans}"\n👤 Teacher: ${by_name}\n⏱ Time: ${timeZ}`);

            } catch (err) {
                send(`❌ API Error: ${err.response?.data?.message || err.message}`);
            }
            break;
    }
};
