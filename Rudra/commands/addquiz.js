const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "addquiz",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Add a new multiple-choice question to the quiz database",
  usages: "/addquiz |question| |A| |B| |C| |D| |answer|",
  commandCategory: "games",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const content = args.join(" ");
  const parts = content.split("|").map(p => p.trim());

  if (parts.length !== 6) {
    return api.sendMessage(
      "❌ Invalid format!\nUsage:\n/addquiz |question| |A| |B| |C| |D| |answer|\nExample:\n/addquiz |What is 2+2?| |3| |4| |5| |6| |b|",
      threadID,
      messageID
    );
  }

  const [question, a, b, c, d, answer] = parts;
  if (!["a","b","c","d"].includes(answer.toLowerCase())) {
    return api.sendMessage("❌ Answer must be one of a/b/c/d", threadID, messageID);
  }

  // Get current quiz database
  const quizData = (await getData("/quiz/qna")) || [];

  quizData.push({ question, a, b, c, d, answer: answer.toLowerCase() });
  await setData("/quiz/qna", quizData);

  return api.sendMessage(`✅ Question added successfully! Total questions: ${quizData.length}`, threadID, messageID);
};
